/**
 * Operational Issue Model
 *
 * Tracks recurring (category + service-provider) buckets as first-class
 * entities with a lifecycle: detected → escalated → resolved/archived.
 *
 * This sits ALONGSIDE the existing CallLog collection — it does NOT replace
 * the per-call audit trail. Each OperationalIssue is a derived "memory" of
 * a recurring pattern that an admin can act on (mark as resolved).
 *
 * Thresholds (kept in the service, not here, to keep this file dumb):
 * - 5 occurrences within rolling 24h  → "general_repeated"
 * - 10 occurrences within rolling 7d  OR appears on 3+ distinct days OR a
 *   "general_repeated" issue that keeps recurring past its 24h cycle
 *   → "persistent_operational"
 *
 * Statuses:
 * - general_repeated        : daily recurring spike, auto-expires after 24h
 *                             of silence
 * - persistent_operational  : true operational pattern, auto-archives after
 *                             7d of silence OR when an admin marks it
 *                             resolved
 * - resolved                : archived (kept forever for operational memory)
 */

import mongoose from 'mongoose';

const OPERATIONAL_ISSUE_STATUSES = [
  'general_repeated',
  'persistent_operational',
  'resolved',
];

const operationalIssueSchema = new mongoose.Schema(
  {
    // The matched-case category at the time of the original detection.
    category: {
      type: String,
      required: true,
      trim: true,
    },
    // Service provider (مقدم الخدمة). Optional — falls back to '*' in the key
    // when missing so we can still group purely by category.
    entityType: {
      type: String,
      trim: true,
      default: null,
    },
    // Composite unique key used to upsert the issue. Format:
    // `${category}__${entityType || '*'}`
    issueKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: OPERATIONAL_ISSUE_STATUSES,
      default: 'general_repeated',
      index: true,
    },
    // Rolling occurrence count at the moment of last detection. The window
    // used depends on the current status: 24h for "general_repeated" and 7d
    // for "persistent_operational". Refreshed each time a new matching
    // CallLog is recorded.
    occurrenceCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Number of distinct days (YYYY-MM-DD buckets) the matching pattern
    // appeared on during the last 7d window. Used as a secondary signal to
    // promote a "general_repeated" spike into a "persistent_operational"
    // pattern (3+ distinct days). Kept on the model so the UI can show the
    // operator *why* a row was classified persistent.
    distinctDays7d: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Human-readable list of the criteria that promoted this issue to its
    // current status. Multiple values are possible. Pure additive metadata —
    // safe to ignore if you only care about the status.
    //   "rolling-24h"      : reached 5 occurrences within the last 24h
    //   "rolling-7d"       : reached 10 occurrences within the last 7d
    //   "distinct-days-3+" : appeared on 3 or more distinct days within 7d
    //   "spans-beyond-24h" : has been recurring for longer than the daily
    //                        cycle (lifecycle promotion, not threshold-based)
    detectionCriteria: {
      type: [String],
      default: [],
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // A sample problem summary to give context in the admin UI without
    // having to drill into individual CallLogs.
    sampleProblemSummary: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Notes captured when the issue is resolved (optional free-form).
    resolutionNotes: {
      type: String,
      default: '',
    },
    // Generic notes field reserved for future operational use.
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

operationalIssueSchema.statics.STATUSES = OPERATIONAL_ISSUE_STATUSES;

/**
 * Build the deterministic composite key used to dedupe issues. Active
 * (non-resolved) records have a unique issueKey, so creating a new issue
 * after a previous one was resolved requires a key with a suffix.
 *
 * We model "history" by allowing multiple resolved rows with the same logical
 * key by appending the resolved timestamp. This keeps the unique constraint
 * intact while letting archived issues live forever.
 */
operationalIssueSchema.statics.makeKey = function makeKey(category, entityType) {
  const safeCategory = (category || '').trim();
  const safeEntity = (entityType || '').trim() || '*';
  return `${safeCategory}__${safeEntity}`;
};

// Helpful compound index for the active list query
operationalIssueSchema.index({ status: 1, lastDetectedAt: -1 });
operationalIssueSchema.index({ status: 1, resolvedAt: -1 });

const OperationalIssue = mongoose.model('OperationalIssue', operationalIssueSchema);

export default OperationalIssue;
