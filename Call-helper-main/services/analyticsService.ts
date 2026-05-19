/**
 * Analytics Service
 * 
 * Frontend service to fetch real analytics from backend API
 * Replaces mock data with actual database statistics
 */

import type { AdvancedFlowSummary } from '../utils/advancedFlowSummary';

// Types
export interface SummaryStats {
  totalCalls: number;
  callsToday: number;
  activeCalls: number;
  resolvedCalls: number;
  pendingCalls: number;
  avgResolutionTime: number;
  resolutionRate: number;
  /** نسبة الإفادات ذات السكور النهائي 100٪ من بين المكالمات التي فيها صيغة مولّدة */
  briefingConfirmationRate?: number;
  confirmedBriefingCount?: number;
  briefingsWithGeneratedCount?: number;
  totalUsers: number;
  activeUsers: number;
  trends: {
    calls: number;
  };
}

export interface TimeSeriesDataPoint {
  date: string;
  count: number;
  resolved: number;
  active: number;
  pending: number;
}

export interface HourlyDataPoint {
  hour: number;
  name: string;
  value: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  percentage: number | string;
}

export interface PriorityStat {
  priority: string;
  count: number;
  color: string;
}

export interface EntityStat {
  entityType: string;
  count: number;
  percentage: number | string;
}

/**
 * A (category + entityType) bucket whose call count today has reached the
 * "frequent issue" threshold (default 10). Surfaced both in the LiveIndicators
 * page and used to mark cases inside CallHelper.
 */
export interface FrequentTodayGroup {
  category: string;
  entityType: string;
  count: number;
  threshold: number;
}

export interface WeekOverWeekCategoryRow {
  category: string;
  last7Days: number;
  previous7Days: number;
  delta: number;
}

export interface ResolutionHoursByCategory {
  category: string;
  avgHours: number;
  resolvedCount: number;
}

export interface DistributionStats {
  topCategories: CategoryStat[];
  issuesByPriority: PriorityStat[];
  issuesByEntity: EntityStat[];
  frequentTodayGroups?: FrequentTodayGroup[];
  frequentTodayThreshold?: number;
  frequentTodayBucketDate?: string;
  /** آخر 7 أيام مقابل الـ 7 أيام التي قبلها (حسب نفس تصنيفات topCategories) */
  weekOverWeekByCategory?: WeekOverWeekCategoryRow[];
  /** متوسط ساعات الحل لكل تصنيف (مكالمات بحالة resolved) */
  resolutionHoursByCategory?: ResolutionHoursByCategory[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: {
    admin: number;
    moderator: number;
    user: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
  };
}

/** سجل واحد من «إفادات مؤكدة» (سكور العرض 100٪ + صيغة مولّدة) */
export interface ConfirmedBriefingRow {
  id: string;
  customerName: string;
  entityType: string;
  problemSummary: string;
  category: string | null;
  solution: string;
  createdAt: string | null;
  advancedFlowSummary?: AdvancedFlowSummary | null;
  /** مسار الوضع المتقدم الخام — لاستنتاج المسارات عند غياب الملخص */
  flowResult?: unknown;
}

// Configuration — نفس مساعد المكالمات: /api عبر بروكسي Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TIMEOUT = 10000; // 10 seconds

/** AuthContext uses this when logging in without the API — it is not a JWT and causes HTTP 401 on /api/analytics. */
const LOCAL_ONLY_TOKEN = 'local-auth-token';

const EMPTY_SUMMARY: SummaryStats = {
  totalCalls: 0,
  callsToday: 0,
  activeCalls: 0,
  resolvedCalls: 0,
  pendingCalls: 0,
  avgResolutionTime: 0,
  resolutionRate: 0,
  briefingConfirmationRate: 0,
  confirmedBriefingCount: 0,
  briefingsWithGeneratedCount: 0,
  totalUsers: 0,
  activeUsers: 0,
  trends: { calls: 0 },
};

const EMPTY_USER_STATS: UserStats = {
  totalUsers: 0,
  activeUsers: 0,
  usersByRole: { admin: 0, moderator: 0, user: 0 },
  usersByStatus: { active: 0, inactive: 0 },
};

const EMPTY_DISTRIBUTION: DistributionStats = {
  topCategories: [],
  issuesByPriority: [],
  issuesByEntity: [],
  frequentTodayGroups: [],
  weekOverWeekByCategory: [],
  resolutionHoursByCategory: [],
};

function emptyHourly(): HourlyDataPoint[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    name: `${hour}:00`,
    value: 0,
  }));
}

/** Real backend JWTs are three dot-separated segments (AuthContext /api/auth/login). */
function isBackendJwtToken(token: string): boolean {
  if (!token || token === LOCAL_ONLY_TOKEN) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/** في التطوير يقبل الخادم local-auth-token — لا نُرجع إحصائيات فارغة */
function canFetchAnalytics(token: string): boolean {
  if (isBackendJwtToken(token)) return true;
  return import.meta.env.DEV && token === LOCAL_ONLY_TOKEN;
}

function emptyPayloadForAnalyticsEndpoint<T>(endpoint: string): T {
  if (endpoint.startsWith('/summary')) return EMPTY_SUMMARY as T;
  if (endpoint.startsWith('/time-series')) return [] as unknown as T;
  if (endpoint.startsWith('/hourly')) return emptyHourly() as T;
  if (endpoint.startsWith('/distribution')) return EMPTY_DISTRIBUTION as T;
  if (endpoint.startsWith('/users')) return EMPTY_USER_STATS as T;
  if (endpoint.startsWith('/confirmed-briefings')) return { items: [] } as T;
  return EMPTY_SUMMARY as T;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  try {
    const token = localStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
  }
  return null;
}

/**
 * Fetch data from API
 */
async function fetchAPI<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  if (!canFetchAnalytics(token)) {
    console.warn(
      '[analytics] No backend session. Log in with the API running to see real data.'
    );
    return emptyPayloadForAnalyticsEndpoint<T>(endpoint);
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(`${API_BASE_URL}/analytics${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 403 && endpoint.startsWith('/users')) {
        return EMPTY_USER_STATS as T;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data.data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get summary statistics
 */
export async function getSummaryStats(range?: {
  from?: string;
  to?: string;
}): Promise<SummaryStats> {
  try {
    const q =
      range?.from && range?.to
        ? `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`
        : range?.from
          ? `?from=${encodeURIComponent(range.from)}`
          : range?.to
            ? `?to=${encodeURIComponent(range.to)}`
            : '';
    return await fetchAPI<SummaryStats>(`/summary${q}`);
  } catch (error) {
    console.error('❌ Error fetching summary stats:', error);
    throw error;
  }
}

/**
 * Get time series data
 * @param periodOrRange - Rolling window e.g. `'7d'`, or explicit `{ from, to }` ISO range (matches UI presets)
 */
export async function getTimeSeriesData(
  periodOrRange: string | { period?: string; from?: string; to?: string } = '7d',
): Promise<TimeSeriesDataPoint[]> {
  try {
    let query: string;
    if (typeof periodOrRange === 'string') {
      query = `period=${encodeURIComponent(periodOrRange)}`;
    } else {
      const { period = '7d', from, to } = periodOrRange;
      if (from && to) {
        query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      } else {
        query = `period=${encodeURIComponent(period)}`;
      }
    }
    return await fetchAPI<TimeSeriesDataPoint[]>(`/time-series?${query}`);
  } catch (error) {
    console.error('❌ Error fetching time series data:', error);
    throw error;
  }
}

/**
 * Get hourly activity distribution
 */
export async function getHourlyActivity(params?: {
  from?: string;
  to?: string;
}): Promise<HourlyDataPoint[]> {
  try {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    const q = sp.toString();
    return await fetchAPI<HourlyDataPoint[]>(`/hourly${q ? `?${q}` : ''}`);
  } catch (error) {
    console.error('❌ Error fetching hourly activity:', error);
    throw error;
  }
}

/**
 * Get distribution statistics (same fields as Common Issues page).
 * Pass `from` / `to` (YYYY-MM-DD) to scope CallLog aggregates to the dashboard period.
 */
export async function getDistributionStats(params?: {
  from?: string;
  to?: string;
}): Promise<DistributionStats> {
  try {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    const q = sp.toString();
    return await fetchAPI<DistributionStats>(`/distribution${q ? `?${q}` : ''}`);
  } catch (error) {
    console.error('❌ Error fetching distribution stats:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    return await fetchAPI<UserStats>('/users');
  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    throw error;
  }
}

/** قائمة الإفادات المؤكدة (المشكلة + الصيغة المولّدة) ضمن فترة اختيارية */
export async function getConfirmedBriefings(params?: {
  from?: string;
  to?: string;
  limit?: number;
}): Promise<{ items: ConfirmedBriefingRow[] }> {
  try {
    const sp = new URLSearchParams();
    if (params?.from) sp.set('from', params.from);
    if (params?.to) sp.set('to', params.to);
    if (params?.limit != null) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return await fetchAPI<{ items: ConfirmedBriefingRow[] }>(
      `/confirmed-briefings${q ? `?${q}` : ''}`,
    );
  } catch (error) {
    console.error('❌ Error fetching confirmed briefings:', error);
    throw error;
  }
}

/**
 * Get all analytics (combined)
 * @param period - Time period for time series
 */
export async function getAllAnalytics(period: string = '7d'): Promise<{
  summary: SummaryStats;
  timeSeries: TimeSeriesDataPoint[];
  hourly: HourlyDataPoint[];
  distribution: DistributionStats;
  users: UserStats;
}> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    if (!canFetchAnalytics(token)) {
      console.warn(
        '[analytics] No backend session. Using empty combined analytics.'
      );
      return {
        summary: EMPTY_SUMMARY,
        timeSeries: [],
        hourly: emptyHourly(),
        distribution: EMPTY_DISTRIBUTION,
        users: EMPTY_USER_STATS,
      };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(`${API_BASE_URL}/analytics?period=${period}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ Error fetching all analytics:', error);
    throw error;
  }
}

export default {
  getSummaryStats,
  getTimeSeriesData,
  getHourlyActivity,
  getDistributionStats,
  getUserStats,
  getConfirmedBriefings,
  getAllAnalytics
};
