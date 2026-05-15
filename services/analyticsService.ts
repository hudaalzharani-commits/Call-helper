/**
 * Analytics Service
 * 
 * Frontend service to fetch real analytics from backend API
 * Replaces mock data with actual database statistics
 */

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

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
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

function emptyPayloadForAnalyticsEndpoint<T>(endpoint: string): T {
  if (endpoint.startsWith('/summary')) return EMPTY_SUMMARY as T;
  if (endpoint.startsWith('/time-series')) return [] as unknown as T;
  if (endpoint.startsWith('/hourly')) return emptyHourly() as T;
  if (endpoint.startsWith('/distribution')) return EMPTY_DISTRIBUTION as T;
  if (endpoint.startsWith('/users')) return EMPTY_USER_STATS as T;
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

  if (!isBackendJwtToken(token)) {
    console.warn(
      '[analytics] Session has no backend JWT (e.g. offline login). Using empty statistics. Log in with the server running to see real data.'
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
export async function getSummaryStats(): Promise<SummaryStats> {
  try {
    return await fetchAPI<SummaryStats>('/summary');
  } catch (error) {
    console.error('❌ Error fetching summary stats:', error);
    throw error;
  }
}

/**
 * Get time series data
 * @param period - Time period ('7d', '30d', '90d')
 */
export async function getTimeSeriesData(period: string = '7d'): Promise<TimeSeriesDataPoint[]> {
  try {
    return await fetchAPI<TimeSeriesDataPoint[]>(`/time-series?period=${period}`);
  } catch (error) {
    console.error('❌ Error fetching time series data:', error);
    throw error;
  }
}

/**
 * Get hourly activity distribution
 */
export async function getHourlyActivity(): Promise<HourlyDataPoint[]> {
  try {
    return await fetchAPI<HourlyDataPoint[]>('/hourly');
  } catch (error) {
    console.error('❌ Error fetching hourly activity:', error);
    throw error;
  }
}

/**
 * Get distribution statistics
 */
export async function getDistributionStats(): Promise<DistributionStats> {
  try {
    return await fetchAPI<DistributionStats>('/distribution');
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

    if (!isBackendJwtToken(token)) {
      console.warn(
        '[analytics] Session has no backend JWT. Using empty combined analytics.'
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
  getAllAnalytics
};
