/**
 * Analytics Service
 * 
 * Calculates real statistics from MongoDB using aggregations
 * Replaces mock data with actual database queries
 */

import CallLog from '../models/CallLog.js';
import OperationalIssue from '../models/OperationalIssue.js';
import User from '../models/User.js';
import Case from '../models/Case.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import { getFrequentIssueThreshold } from '../utils/frequentIssueThreshold.js';
import {
  ANALYTICS_TZ,
  calendarDayBounds,
  enumerateCalendarDays,
  isCalendarDateKey,
  resolveAnalyticsRange,
} from '../utils/analyticsDateRange.js';

const CONFIRMED_BRIEFING_MIN_SCORE = 80;

function confirmedBriefingCriteria() {
  return {
    $or: [
      { finalDisplayScore: { $gte: CONFIRMED_BRIEFING_MIN_SCORE } },
      {
        status: { $in: ['resolved', 'closed'] },
        $or: [
          { finalDisplayScore: { $gte: CONFIRMED_BRIEFING_MIN_SCORE } },
          { finalDisplayScore: null },
          { finalDisplayScore: { $exists: false } },
        ],
      },
    ],
  };
}

function buildCreatedAtRange(from, to) {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) {
    if (isCalendarDateKey(from)) {
      createdAt.$gte = calendarDayBounds(from, ANALYTICS_TZ).start;
    } else {
      const start = new Date(from);
      if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
    }
  }
  if (to) {
    if (isCalendarDateKey(to)) {
      createdAt.$lte = calendarDayBounds(to, ANALYTICS_TZ).end;
    } else {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
    }
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

/**
 * Get summary statistics
 * @returns {Promise<Object>} Summary stats
 */
export async function getSummaryStats(query = {}) {
  try {
    const { from, to } = query;
    const periodFilter = buildCreatedAtRange(from, to);

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    
    // Total calls
    const totalCalls = await CallLog.countDocuments();
    
    // Calls by status
    const statusStats = await CallLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const resolvedCalls = statusStats.find(s => s._id === 'resolved')?.count || 0;
    const pendingCalls = statusStats.find(s => s._id === 'pending')?.count || 0;
    const escalatedCalls = statusStats.find(s => s._id === 'escalated')?.count || 0;
    const closedCalls = statusStats.find(s => s._id === 'closed')?.count || 0;

    // "Active" isn't a persisted status in CallLog; treat non-final calls as active.
    const activeCalls = pendingCalls + escalatedCalls;
    
    // Calls today
    const callsToday = await CallLog.countDocuments({
      createdAt: { $gte: todayStart }
    });
    
    // Average resolution time (in hours)
    const resolutionTimeStats = await CallLog.aggregate([
      {
        $match: {
          status: 'resolved',
          updatedAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);
    
    const avgResolutionTime = resolutionTimeStats[0]?.avgResolutionTime || 0;
    
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });
    
    // Resolution rate (حسب حالة البلاغ)
    const resolutionRate = totalCalls > 0 
      ? ((resolvedCalls / totalCalls) * 100).toFixed(1)
      : 0;

    // إفادات مؤكدة ضمن الفترة المحددة
    const withGenerated = await CallLog.countDocuments({
      ...periodFilter,
      generatedResponse: { $type: 'string', $regex: /\S/ },
    });
    const confirmedBriefingCount = await CallLog.countDocuments({
      ...periodFilter,
      generatedResponse: { $type: 'string', $regex: /\S/ },
      ...confirmedBriefingCriteria(),
    });
    const briefingConfirmationRate =
      withGenerated > 0
        ? Number(((confirmedBriefingCount / withGenerated) * 100).toFixed(1))
        : 0;
    
    // Calculate trends (compare with last week)
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const callsLastWeek = await CallLog.countDocuments({
      createdAt: { $gte: lastWeekStart, $lt: todayStart }
    });
    
    const callsTrend = callsLastWeek > 0
      ? (((callsToday - callsLastWeek) / callsLastWeek) * 100).toFixed(1)
      : 0;
    
    return {
      success: true,
      data: {
        totalCalls,
        callsToday,
        activeCalls,
        resolvedCalls,
        pendingCalls,
        escalatedCalls,
        closedCalls,
        avgResolutionTime: Number(avgResolutionTime.toFixed(1)),
        resolutionRate: Number(resolutionRate),
        briefingConfirmationRate,
        confirmedBriefingCount,
        briefingsWithGeneratedCount: withGenerated,
        totalUsers,
        activeUsers,
        trends: {
          calls: Number(callsTrend)
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting summary stats:', error);
    throw error;
  }
}

/**
 * Get time series data
 * @param {string} period - Time period ('7d', '30d', '90d') when from/to not used
 * @param {{ from?: string, to?: string }} [range] - optional inclusive range from client ISO strings
 * @returns {Promise<Object>} Time series data
 */
export async function getTimeSeriesData(period = '7d', range = {}) {
  try {
    const { startDate, endDate, fromYmd, toYmd } = resolveAnalyticsRange(period, range);

    // Aggregate calls by day
    const timeSeriesData = await CallLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: ANALYTICS_TZ,
            },
          },
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          active: {
            $sum: {
              $cond: [
                { $in: ["$status", ["pending", "escalated"]] },
                1,
                0
              ]
            }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          escalated: {
            $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
          },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
          resolved: 1,
          active: 1,
          pending: 1,
          escalated: 1,
          closed: 1
        }
      }
    ]);
    
    const dayKeys = enumerateCalendarDays(fromYmd, toYmd);
    const filledData = dayKeys.map((dateStr) => {
      const existingData = timeSeriesData.find((d) => d.date === dateStr);
      return {
        date: dateStr,
        count: existingData?.count || 0,
        resolved: existingData?.resolved || 0,
        active: existingData?.active || 0,
        pending: existingData?.pending || 0,
        escalated: existingData?.escalated || 0,
        closed: existingData?.closed || 0,
      };
    });
    
    return {
      success: true,
      data: filledData,
      period: period,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting time series data:', error);
    throw error;
  }
}

/**
 * Get hourly activity distribution
 * @returns {Promise<Object>} Hourly activity data
 */
export async function getHourlyActivity(range = {}) {
  try {
    const pipeline = [];
    const { from, to } = range;
    if (from && to) {
      const { startDate, endDate } = resolveAnalyticsRange('7d', range);
      pipeline.push({ $match: { createdAt: { $gte: startDate, $lte: endDate } } });
    }
    pipeline.push(
      {
        $project: {
          hour: { $hour: { date: '$createdAt', timezone: ANALYTICS_TZ } },
        },
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 },
      },
    );

    const hourlyData = await CallLog.aggregate(pipeline);

    // Fill in all 24 hours
    const filledData = Array.from({ length: 24 }, (_, hour) => {
      const existing = hourlyData.find(d => d._id === hour);
      return {
        hour: hour,
        name: `${hour}:00`,
        value: existing?.count || 0
      };
    });
    
    return {
      success: true,
      data: filledData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting hourly activity:', error);
    throw error;
  }
}

/**
 * Get distribution statistics
 * Optional `from` / `to` (YYYY-MM-DD): same aggregates as Common Issues distribution, scoped to the period.
 * Without dates: legacy all-time behavior.
 * @param {{ from?: string, to?: string }} query
 * @returns {Promise<Object>} Distribution stats
 */
export async function getDistributionStats(query = {}) {
  try {
    const { from, to } = query;
    const periodFilter = buildCreatedAtRange(from, to);
    const hasPeriod = Object.keys(periodFilter).length > 0;
    const matchStages = hasPeriod ? [{ $match: periodFilter }] : [];

    const categoryStats = await CallLog.aggregate([
      ...matchStages,
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const totalCalls = await CallLog.countDocuments(hasPeriod ? periodFilter : {});

    const topCategories = categoryStats.map((stat) => ({
      category: stat._id || 'غير محدد',
      count: stat.count,
      percentage: totalCalls > 0 ? ((stat.count / totalCalls) * 100).toFixed(1) : 0,
    }));

    const distinctCategoryAgg = await CallLog.aggregate([
      ...matchStages,
      { $match: { category: { $nin: [null, ''] } } },
      { $group: { _id: '$category' } },
      { $count: 'n' },
    ]);
    const uniqueCategoryCount = distinctCategoryAgg[0]?.n ?? 0;

    const bucketDate = CallLog.computeBucketDate(new Date());
    const frequentTodayThreshold = await getFrequentIssueThreshold();
    const frequentTodayAgg = await CallLog.aggregate([
      {
        $match: {
          bucketDate,
          category: { $nin: [null, ''] },
          entityType: { $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: { category: '$category', entityType: '$entityType' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: frequentTodayThreshold } } },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          entityType: '$_id.entityType',
          count: 1,
        },
      },
    ]);

    const frequentTodayGroups = frequentTodayAgg.map((group) => ({
      category: group.category,
      entityType: group.entityType,
      count: group.count,
      threshold: frequentTodayThreshold,
    }));

    const activeDailyRepeated = await OperationalIssue.find({
      status: 'general_repeated',
    })
      .select({ category: 1, entityType: 1, occurrenceCount: 1 })
      .lean();
    const countByKey = new Map(
      frequentTodayGroups.map((g) => [
        OperationalIssue.makeKey(g.category, g.entityType || null),
        g.count,
      ]),
    );
    const recurringTodayDashboard = activeDailyRepeated
      .map((issue) => {
        const key = OperationalIssue.makeKey(issue.category, issue.entityType);
        const countToday = countByKey.get(key) ?? issue.occurrenceCount ?? 0;
        if (countToday < frequentTodayThreshold) return null;
        return {
          category: issue.category,
          entityType: issue.entityType || '*',
          count: countToday,
          threshold: frequentTodayThreshold,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count);

    let weekOverWeekByCategory;
    if (
      hasPeriod &&
      periodFilter.createdAt?.$gte &&
      periodFilter.createdAt?.$lte
    ) {
      const curStart = periodFilter.createdAt.$gte;
      const curEnd = periodFilter.createdAt.$lte;
      const spanMs = curEnd.getTime() - curStart.getTime();
      const prevEnd = new Date(curStart.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - spanMs);
      const currAgg = await CallLog.aggregate([
        { $match: { createdAt: { $gte: curStart, $lte: curEnd } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const prevAgg = await CallLog.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const currMap = new Map(
        currAgg.map((x) => [x._id || 'غير محدد', x.count]),
      );
      const prevMap = new Map(
        prevAgg.map((x) => [x._id || 'غير محدد', x.count]),
      );
      weekOverWeekByCategory = topCategories.map((tc) => {
        const last7 = currMap.get(tc.category) || 0;
        const prev7 = prevMap.get(tc.category) || 0;
        return {
          category: tc.category,
          last7Days: last7,
          previous7Days: prev7,
          delta: last7 - prev7,
        };
      });
    } else {
      const now = new Date();
      const startLast7 = new Date(now);
      startLast7.setDate(startLast7.getDate() - 7);
      const startPrev7 = new Date(now);
      startPrev7.setDate(startPrev7.getDate() - 14);

      const last7Agg = await CallLog.aggregate([
        { $match: { createdAt: { $gte: startLast7 } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      const prev7Agg = await CallLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startPrev7, $lt: startLast7 },
          },
        },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);

      const last7Map = new Map(
        last7Agg.map((x) => [x._id || 'غير محدد', x.count]),
      );
      const prev7Map = new Map(
        prev7Agg.map((x) => [x._id || 'غير محدد', x.count]),
      );

      weekOverWeekByCategory = topCategories.map((tc) => {
        const last7 = last7Map.get(tc.category) || 0;
        const prev7 = prev7Map.get(tc.category) || 0;
        return {
          category: tc.category,
          last7Days: last7,
          previous7Days: prev7,
          delta: last7 - prev7,
        };
      });
    }

    const resolutionHoursAgg = await CallLog.aggregate([
      ...matchStages,
      {
        $match: {
          status: 'resolved',
          category: { $nin: [null, ''] },
          updatedAt: { $exists: true },
          createdAt: { $exists: true },
        },
      },
      {
        $project: {
          cat: '$category',
          hrs: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      { $match: { hrs: { $gte: 0, $lte: 720 } } },
      {
        $group: {
          _id: '$cat',
          avgHours: { $avg: '$hrs' },
          resolvedCount: { $sum: 1 },
        },
      },
      { $sort: { avgHours: -1 } },
      { $limit: 15 },
    ]);

    const resolutionHoursByCategory = resolutionHoursAgg.map((r) => ({
      category: r._id || 'غير محدد',
      avgHours: Number((r.avgHours || 0).toFixed(2)),
      resolvedCount: r.resolvedCount,
    }));
    
    // Calls by priority (from Cases reference)
    const priorityStats = await Case.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const priorityColors = {
      'Critical': '#ef4444',
      'High': '#f59e0b',
      'Medium': '#3b82f6',
      'Low': '#10b981'
    };
    
    const issuesByPriority = priorityStats.map(stat => ({
      priority: stat._id || 'Medium',
      count: stat.count,
      color: priorityColors[stat._id] || '#6b7280'
    }));
    
    const entityStats = await CallLog.aggregate([
      ...matchStages,
      {
        $group: {
          _id: '$entityType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const issuesByEntity = entityStats.map(stat => ({
      entityType: stat._id || 'غير محدد',
      count: stat.count,
      percentage: totalCalls > 0 ? ((stat.count / totalCalls) * 100).toFixed(1) : 0
    }));
    
    return {
      success: true,
      data: {
        topCategories,
        uniqueCategoryCount,
        issuesByPriority,
        issuesByEntity,
        frequentTodayGroups,
        recurringTodayDashboard,
        frequentTodayThreshold,
        frequentTodayBucketDate: bucketDate,
        weekOverWeekByCategory,
        resolutionHoursByCategory,
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting distribution stats:', error);
    throw error;
  }
}

/**
 * Get user statistics
 * @returns {Promise<Object>} User stats
 */
export async function getUserStats() {
  try {
    // Total users
    const totalUsers = await User.countDocuments();
    
    // Users by role
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const usersByRole = {
      admin: roleStats.find(r => r._id === 'admin')?.count || 0,
      moderator: roleStats.find(r => r._id === 'moderator')?.count || 0,
      user: roleStats.find(r => r._id === 'user')?.count || 0
    };
    
    // Active users (logged in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo },
      isActive: true
    });
    
    // Users by status
    const activeCount = await User.countDocuments({ isActive: true });
    const inactiveCount = await User.countDocuments({ isActive: false });
    
    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        usersByRole,
        usersByStatus: {
          active: activeCount,
          inactive: inactiveCount
        }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    throw error;
  }
}

/**
 * قائمة بلاغات «إفادات مؤكدة»: صيغة مولّدة + سكور العرض النهائي 100٪
 * @param {{ from?: string, to?: string, limit?: number }} query
 */
export async function getConfirmedBriefingsList(query = {}) {
  try {
    const { from, to, limit: limitRaw } = query;
    const limit = Math.min(200, Math.max(1, parseInt(String(limitRaw), 10) || 100));

    const match = {
      generatedResponse: { $type: 'string', $regex: /\S/ },
      ...confirmedBriefingCriteria(),
      ...buildCreatedAtRange(from, to),
    };

    const rows = await CallLog.find(match)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        'customerName entityType problemSummary category generatedResponse createdAt flowResult advancedFlowSummary finalDisplayScore status',
      )
      .lean();

    const items = rows.map((r) => ({
      id: String(r._id),
      customerName: r.customerName ?? '',
      entityType: r.entityType ?? '',
      problemSummary: r.problemSummary ?? '',
      category: r.category ?? null,
      solution: r.generatedResponse ?? '',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      finalDisplayScore: r.finalDisplayScore ?? null,
      status: r.status ?? null,
    }));

    return {
      success: true,
      data: { items },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting confirmed briefings list:', error);
    throw error;
  }
}

/**
 * Get knowledge base statistics
 * @returns {Promise<Object>} KB stats
 */
export async function getKnowledgeBaseStats() {
  try {
    const totalArticles = await KnowledgeBase.countDocuments();
    const publishedArticles = await KnowledgeBase.countDocuments({ isPublished: true });
    
    // Most viewed articles
    const mostViewed = await KnowledgeBase.find()
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount helpfulCount category');
    
    // Articles by category
    const categoryStats = await KnowledgeBase.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return {
      success: true,
      data: {
        totalArticles,
        publishedArticles,
        mostViewed,
        byCategory: categoryStats
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error getting knowledge base stats:', error);
    throw error;
  }
}

export default {
  getSummaryStats,
  getTimeSeriesData,
  getHourlyActivity,
  getDistributionStats,
  getUserStats,
  getKnowledgeBaseStats,
  getConfirmedBriefingsList,
};
