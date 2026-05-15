import mongoose from 'mongoose';

const callLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  entityType: {
    type: String,
    required: true,
    trim: true
  },
  problemType: {
    type: String,
    required: true
  },
  problemSummary: {
    type: String,
    required: true
  },
  // Category of the matched case at log time (used for daily frequency tracking)
  category: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  // Calendar-day bucket (YYYY-MM-DD in server local time) for fast daily aggregations
  bucketDate: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  matchedCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    default: null
  },
  matchedCaseCode: {
    type: String,
    trim: true,
    default: null
  },
  matchedCaseCount: {
    type: Number,
    default: null,
    min: 0
  },
  matchedAt: {
    type: Date,
    default: null
  },
  flowResult: {
    completedSteps: [{
      stepId: String,
      stepName: String,
      selectedSubCondition: {
        id: String,
        name: String,
        action: {
          type: String,
          enum: ['continue', 'force_solution', 'escalation']
        },
        actionDetails: String
      }
    }],
    finalAction: {
      type: String,
      enum: ['continue', 'force_solution', 'escalation']
    },
    escalationDetails: String,
    solutionDetails: String
  },
  generatedResponse: {
    type: String,
    default: null
  },
  /** آخر سكور معروض في مساعد المكالمات (0–100) عند حفظ السجل — للإفادات المؤكدة = 100 */
  finalDisplayScore: {
    type: Number,
    default: null,
    min: 0,
    max: 100,
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'escalated', 'closed'],
    default: 'pending'
  },
  duration: {
    type: Number, // in seconds
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
callLogSchema.index({ user: 1, createdAt: -1 });
callLogSchema.index({ status: 1 });
callLogSchema.index({ entityType: 1 });
callLogSchema.index({ matchedCase: 1 });
callLogSchema.index({ matchedAt: -1 });
// Compound index for daily frequency lookups (category + entityType per day)
callLogSchema.index({ category: 1, entityType: 1, bucketDate: 1 });

/**
 * Compute the calendar-day bucket for a given date in YYYY-MM-DD format.
 * Used for the "أكثر المشاكل تكرارًا اليوم" feature so we can group calls per day.
 */
callLogSchema.statics.computeBucketDate = function computeBucketDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Auto-fill bucketDate when missing so existing callers don't have to set it explicitly
callLogSchema.pre('validate', function fillBucketDate(next) {
  if (!this.bucketDate) {
    this.bucketDate = this.constructor.computeBucketDate(this.createdAt || new Date());
  }
  next();
});

const CallLog = mongoose.model('CallLog', callLogSchema);

export default CallLog;
