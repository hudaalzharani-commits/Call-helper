/**
 * Helper utilities for the "frequent issue" daily-tracking feature.
 *
 * The threshold (how many calls today on the same `category + entityType`
 * bucket are required for the group to be considered "frequent") is stored
 * in the Settings collection so admins can tweak it from the UI without a
 * code change. We fall back to a sensible default when the setting is
 * missing, invalid, or the database is unreachable.
 */

import Settings from '../models/Settings.js';

export const FREQUENT_ISSUE_THRESHOLD_KEY = 'frequent_issue_daily_threshold';
export const FREQUENT_ISSUE_DEFAULT_THRESHOLD = 10;
export const FREQUENT_ISSUE_MIN_THRESHOLD = 1;
export const FREQUENT_ISSUE_MAX_THRESHOLD = 1000;

/**
 * Clamp + coerce a raw value into a valid threshold integer.
 * Returns the default when the input is not a finite positive integer.
 */
export function normalizeFrequentIssueThreshold(rawValue) {
  const num = Number(rawValue);
  if (!Number.isFinite(num)) return FREQUENT_ISSUE_DEFAULT_THRESHOLD;
  const intVal = Math.round(num);
  if (intVal < FREQUENT_ISSUE_MIN_THRESHOLD) return FREQUENT_ISSUE_MIN_THRESHOLD;
  if (intVal > FREQUENT_ISSUE_MAX_THRESHOLD) return FREQUENT_ISSUE_MAX_THRESHOLD;
  return intVal;
}

/**
 * Read the current threshold from Settings. Returns the default if no
 * setting exists yet. Never throws — falls back to the default on errors so
 * the call-logging path stays resilient.
 */
export async function getFrequentIssueThreshold() {
  try {
    const setting = await Settings.findOne({ key: FREQUENT_ISSUE_THRESHOLD_KEY }).lean();
    if (!setting) return FREQUENT_ISSUE_DEFAULT_THRESHOLD;
    return normalizeFrequentIssueThreshold(setting.value);
  } catch {
    return FREQUENT_ISSUE_DEFAULT_THRESHOLD;
  }
}
