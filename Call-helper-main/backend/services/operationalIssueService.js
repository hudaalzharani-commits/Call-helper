/**
 * Operational Issue Service
 *
 * Pure helpers around the OperationalIssue model. Called from the calls
 * route to keep the route file slim and the lifecycle logic in one place.
 *
 * Classification rules (per the latest spec — keep these in sync with the
 * UI copy in OperationalIssueTracker.tsx):
 *
 *   "general_repeated" (متكرر اليوم)
 *     - Admin-configurable daily threshold on (category + entityType)
 *       for the calendar day (bucketDate), same as Advanced Settings +/−
 *     - Lives for at most 24h after the last hit (auto-archives quickly)
 *     - Intended as a *spike detector* for today
 *
 *   "persistent_operational" (مشكلة تشغيلية مستمرة)
 *     A row is promoted to this status if ANY of the following hold:
 *       a) 10+ occurrences within the rolling 7d window
 *       b) Pattern appears on 3+ distinct days within the rolling 7d window
 *       c) An existing "general_repeated" row keeps recurring past its 24h
 *          cycle (firstDetectedAt is older than 24h and it is still active)
 *     - Lives until 7d of silence OR an admin marks it resolved
 *     - Intended as an *operational root-cause* signal
 *
 * Counting source of truth: the CallLog collection (filtered by category
 * and — when available — entityType). We deliberately do NOT re-implement
 * counting on top of frequency snapshots so that the existing call log /
 * scoring pipeline remains the single source of truth.
 *
 * Important: every public function is defensive. Detection happens after a
 * call is logged and should never fail the call submission, so errors are
 * swallowed and logged.
 */

import CallLog from '../models/CallLog.js';
import OperationalIssue from '../models/OperationalIssue.js';
import { getFrequentIssueThreshold } from '../utils/frequentIssueThreshold.js';
import { calendarDayBounds, ANALYTICS_TZ } from '../utils/analyticsDateRange.js';

// Weekly / persistence thresholds (7d lane). Daily recurring uses Settings.
export const ROLLING_24H_THRESHOLD = 5;
export const ROLLING_7D_THRESHOLD = 10;
export const DISTINCT_DAYS_THRESHOLD = 3;
export const PERSISTENT_INACTIVITY_DAYS = 7;

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Detect whether a freshly-logged call pushes its (category, entityType)
 * bucket into either the "متكرر اليوم" or "تشغيلية مستمرة" lane. Creates or
 * updates the matching OperationalIssue. Never throws.
 *
 * Counting rules (per spec):
 *   - countToday   : CallLogs on today's calendar bucketDate for the bucket
 *   - count24h     : CallLogs in the rolling 24h window for the bucket
 *   - count7d      : CallLogs in the rolling 7d  window for the bucket
 *   - distinctDays7d: number of distinct bucketDate values (YYYY-MM-DD) in
 *                    the 7d window — secondary persistence signal
 *   - Bucket = (category, entityType). entityType falls back to "*" via
 *     the model's makeKey so we still group by category alone when the
 *     service provider isn't known.
 *
 * Promotion-to-persistent triggers (any one is sufficient):
 *   - rolling-7d        : count7d >= 10
 *   - distinct-days-3+  : distinctDays7d >= 3
 *   - spans-beyond-24h  : an existing general_repeated record that keeps
 *                         firing after its 24h cycle has finished
 *
 * Resolved historical issues are intentionally kept in the archive; a new
 * recurrence after resolution opens a fresh active issue with a suffixed
 * key so the unique constraint stays intact.
 *
 * @param {{category:string, entityType?:string|null, problemSummary?:string}} call
 * @returns {Promise<{issue:object|null, count24h:number, count7d:number, distinctDays7d:number, reachedDaily:boolean, reachedWeekly:boolean, reachedDistinctDays:boolean}|null>}
 */
export async function detectAndUpdateIssue(call) {
  try {
    if (!call) return null;
    const category = (call.category || '').trim();
    if (!category) return null;
    const entityType = (call.entityType || '').trim();

    const now = new Date();
    const since24h = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);
    const since7d = new Date(now.getTime() - SEVEN_DAYS_MS);
    const bucketDate = CallLog.computeBucketDate(now);
    const dailyThreshold = await getFrequentIssueThreshold();

    const baseFilter = { category };
    if (entityType) baseFilter.entityType = entityType;

    // Run the signals in parallel. countToday uses the same calendar-day
    // bucket as the admin +/- threshold and analytics frequentTodayGroups.
    const [countToday, count24h, count7d, distinctDaysAgg] = await Promise.all([
      CallLog.countDocuments({ ...baseFilter, bucketDate }),
      CallLog.countDocuments({ ...baseFilter, createdAt: { $gte: since24h } }),
      CallLog.countDocuments({ ...baseFilter, createdAt: { $gte: since7d } }),
      CallLog.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: since7d } } },
        { $group: { _id: '$bucketDate' } },
        { $count: 'days' },
      ]),
    ]);
    const distinctDays7d = distinctDaysAgg?.[0]?.days || 0;

    const reachedDaily = countToday >= dailyThreshold;
    const reachedWeekly = count7d >= ROLLING_7D_THRESHOLD;
    const reachedDistinctDays = distinctDays7d >= DISTINCT_DAYS_THRESHOLD;

    // Nothing to do until at least one signal fires. We don't treat the
    // distinct-days alone as enough to create a *new* issue from scratch —
    // it only matters once the daily/weekly signal has already brought the
    // bucket into the tracker. This keeps low-volume but day-spread noise
    // from creating phantom issues.
    if (!reachedDaily && !reachedWeekly) {
      return {
        issue: null,
        count24h,
        count7d,
        distinctDays7d,
        reachedDaily,
        reachedWeekly,
        reachedDistinctDays,
      };
    }

    const issueKey = OperationalIssue.makeKey(category, entityType || null);

    // Look for an existing ACTIVE issue with this key. If the most recent one
    // is resolved we let it stay archived and open a fresh active record.
    const activeExisting = await OperationalIssue.findOne({
      issueKey,
      status: { $in: ['general_repeated', 'persistent_operational'] },
    });

    if (activeExisting) {
      activeExisting.lastDetectedAt = now;
      activeExisting.distinctDays7d = distinctDays7d;
      if (call.problemSummary && !activeExisting.sampleProblemSummary) {
        activeExisting.sampleProblemSummary = call.problemSummary;
      }

      // Compute promotion criteria. The "spans-beyond-24h" rule kicks in
      // when an existing daily spike keeps recurring after its first 24h
      // window — that's the spec's "استمر بعد انتهاء دورة متكرر اليوم".
      const spansBeyondDailyCycle =
        activeExisting.firstDetectedAt &&
        now.getTime() - new Date(activeExisting.firstDetectedAt).getTime() >
          TWENTY_FOUR_HOURS_MS;
      const shouldBePersistent =
        reachedWeekly || reachedDistinctDays || spansBeyondDailyCycle;

      const newStatus = shouldBePersistent
        ? 'persistent_operational'
        : activeExisting.status; // never demote a persistent back to daily
      activeExisting.status = newStatus;

      // occurrenceCount is window-dependent: daily issues care about the
      // last 24h spike, persistent issues care about the 7d total.
      activeExisting.occurrenceCount =
        newStatus === 'persistent_operational' ? count7d : countToday;

      // Refresh the criteria snapshot so the UI can explain *why* a row is
      // classified the way it is right now.
      const criteria = [];
      if (reachedDaily) criteria.push('rolling-24h');
      if (reachedWeekly) criteria.push('rolling-7d');
      if (reachedDistinctDays) criteria.push('distinct-days-3+');
      if (spansBeyondDailyCycle && newStatus === 'persistent_operational') {
        criteria.push('spans-beyond-24h');
      }
      activeExisting.detectionCriteria = criteria;

      await activeExisting.save();
      return {
        issue: activeExisting,
        count24h,
        count7d,
        distinctDays7d,
        reachedDaily,
        reachedWeekly,
        reachedDistinctDays,
      };
    }

    // No active issue → open a new one. We may have a previous resolved row
    // with the same key (archive). To respect the unique index we suffix the
    // key for the new record only when a resolved sibling already exists.
    const hasResolvedSibling = await OperationalIssue.exists({
      issueKey,
      status: 'resolved',
    });
    const finalKey = hasResolvedSibling
      ? `${issueKey}::${now.getTime()}`
      : issueKey;

    // New issues start at the appropriate status. We don't apply the
    // "spans-beyond-24h" rule here because by definition this is the first
    // active record — there is no prior cycle to span.
    const shouldStartPersistent = reachedWeekly || reachedDistinctDays;
    const status = shouldStartPersistent
      ? 'persistent_operational'
      : 'general_repeated';

    // Approximate "firstDetectedAt" with the oldest CallLog in the 7d window
    // so the badge timestamps reflect the real start of the streak.
    const firstHit = await CallLog.findOne({
      ...baseFilter,
      createdAt: { $gte: since7d },
    })
      .sort({ createdAt: 1 })
      .select({ createdAt: 1, problemSummary: 1 })
      .lean();

    const criteria = [];
    if (reachedDaily) criteria.push('rolling-24h');
    if (reachedWeekly) criteria.push('rolling-7d');
    if (reachedDistinctDays) criteria.push('distinct-days-3+');

    const created = await OperationalIssue.create({
      category,
      entityType: entityType || null,
      issueKey: finalKey,
      status,
      occurrenceCount:
        status === 'persistent_operational' ? count7d : countToday,
      distinctDays7d,
      detectionCriteria: criteria,
      firstDetectedAt: firstHit?.createdAt || now,
      lastDetectedAt: now,
      sampleProblemSummary: call.problemSummary || firstHit?.problemSummary || '',
    });
    return {
      issue: created,
      count24h,
      count7d,
      distinctDays7d,
      reachedDaily,
      reachedWeekly,
      reachedDistinctDays,
    };
  } catch (err) {
    console.warn('⚠️ detectAndUpdateIssue failed:', err.message);
    return null;
  }
}

/**
 * Soft-expire active issues based on the lane-specific inactivity window:
 *
 *   - "general_repeated"        : auto-archive after 24h of silence
 *   - "persistent_operational"  : auto-archive after 7d  of silence
 *
 * Each archived row gets a human-readable note so it's obvious in the
 * archive view *why* it was retired.
 *
 * Called on-read from the list endpoint so we don't need a cron job. Cheap
 * because the index on (status, lastDetectedAt) keeps it O(matched rows).
 *
 * @returns {Promise<{daily:number, persistent:number}>} archived counts per lane
 */
export async function expireStaleIssues() {
  try {
    const now = new Date();
    const dailyCutoff = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);
    const persistentCutoff = new Date(now.getTime() - SEVEN_DAYS_MS);
    const todayYmd = CallLog.computeBucketDate(now);
    const { start: todayStart } = calendarDayBounds(todayYmd, ANALYTICS_TZ);

    // مرّت 24 ساعة من أول رصد وما زالت «متكرر اليوم» → عامة (تشغيلية مستمرة)
    const promoteCutoff = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);
    const toPromote = await OperationalIssue.find({
      status: 'general_repeated',
      firstDetectedAt: { $lte: promoteCutoff },
    });

    await Promise.all(
      toPromote.map(async (issue) => {
        const criteria = new Set(issue.detectionCriteria || []);
        criteria.add('spans-beyond-24h');
        issue.status = 'persistent_operational';
        issue.detectionCriteria = [...criteria];
        await issue.save();
      }),
    );

    // Two separate updates so each lane carries its own resolution note.
    const [priorDayResult, dailyResult, persistentResult] = await Promise.all([
      OperationalIssue.updateMany(
        {
          status: 'general_repeated',
          firstDetectedAt: { $lt: todayStart },
        },
        {
          status: 'resolved',
          resolvedAt: now,
          resolutionNotes: 'انتهى يوم التكرار — أُرشفت تلقائياً',
        },
      ),
      OperationalIssue.updateMany(
        {
          status: 'general_repeated',
          lastDetectedAt: { $lt: dailyCutoff },
        },
        {
          status: 'resolved',
          resolvedAt: now,
          resolutionNotes: 'انتهت دورة 24 ساعة بدون تكرار — أُرشفت تلقائياً',
        },
      ),
      OperationalIssue.updateMany(
        {
          status: 'persistent_operational',
          lastDetectedAt: { $lt: persistentCutoff },
        },
        {
          status: 'resolved',
          resolvedAt: now,
          resolutionNotes:
            'مرت 7 أيام بدون نشاط على المشكلة المستمرة — أُرشفت تلقائياً',
        },
      ),
    ]);

    return {
      daily: (dailyResult.modifiedCount || 0) + (priorDayResult.modifiedCount || 0),
      persistent: persistentResult.modifiedCount || 0,
      promoted: toPromote.length,
    };
  } catch (err) {
    console.warn('⚠️ expireStaleIssues failed:', err.message);
    return { daily: 0, persistent: 0, promoted: 0 };
  }
}

/**
 * Active issues sorted with persistent ones first (since they need more
 * attention) and most recent activity at the top within each group.
 */
export async function getActiveIssues() {
  return OperationalIssue.find({
    status: { $in: ['general_repeated', 'persistent_operational'] },
  })
    .sort({ status: 1, lastDetectedAt: -1 })
    .lean();
}

/**
 * Archived (resolved) issues, most-recently resolved first.
 */
export async function getArchivedIssues({ limit = 100 } = {}) {
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
  return OperationalIssue.find({ status: 'resolved' })
    .sort({ resolvedAt: -1 })
    .limit(safeLimit)
    .populate('resolvedBy', 'name username')
    .lean();
}

/**
 * Mark a specific issue as resolved. Preserves all metadata and moves the
 * issue into the archive — never hard-deletes.
 */
export async function resolveIssue(id, userId, notes = '') {
  return OperationalIssue.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ['general_repeated', 'persistent_operational'] },
    },
    {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: userId || null,
      resolutionNotes: (notes || '').toString(),
    },
    { new: true }
  );
}

export const OPERATIONAL_ISSUE_CONSTANTS = Object.freeze({
  ROLLING_24H_THRESHOLD,
  ROLLING_7D_THRESHOLD,
  DISTINCT_DAYS_THRESHOLD,
  PERSISTENT_INACTIVITY_DAYS,
});

/** Thresholds for API consumers — daily recurring uses admin Settings. */
export async function getOperationalIssueThresholdsForApi() {
  const frequentIssueDailyThreshold = await getFrequentIssueThreshold();
  return {
    ...OPERATIONAL_ISSUE_CONSTANTS,
    frequentIssueDailyThreshold,
    ROLLING_24H_THRESHOLD: frequentIssueDailyThreshold,
  };
}
