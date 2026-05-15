import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema(
  {
    systemType: {
      type: String,
      enum: ['logic-bug', 'flow-bug', 'error', 'crash'],
      default: 'error',
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    caseId: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },
    fullMessage: { type: String, default: '' },
    impact: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['open', 'resolved', 'ignored'],
      default: 'open',
      index: true,
    },
    tags: [{ type: String, trim: true }],
    triggeredFlow: { type: String, default: '' },
    systemDecision: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 100 },
    errorCode: { type: String, trim: true, default: '' },
    stackTrace: { type: String, default: '' },
    /** مسار الطلب أو معرف مرتبط (للتشخيص) */
    source: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

systemLogSchema.index({ createdAt: -1 });

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

export default SystemLog;
