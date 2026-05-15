import mongoose from 'mongoose';

const ENTRY_STATUSES = ['pending', 'approved', 'rejected'];

const trainingEntrySchema = new mongoose.Schema(
  {
    scenario: { type: String, required: true },
    correctResponse: { type: String, required: true },
    alternativeResponses: [{ type: String }],
    category: { type: String, required: true, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ENTRY_STATUSES, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    /** مسار عام يُخدم كملف ثابت، مثل `/api/uploads/training/...` */
    attachmentUrl: { type: String, default: '' },
    attachmentOriginalName: { type: String, default: '' },
  },
  { timestamps: true },
);

trainingEntrySchema.index({ status: 1, createdAt: -1 });
trainingEntrySchema.index({ submittedBy: 1 });

const TrainingEntry = mongoose.model('TrainingEntry', trainingEntrySchema);

export default TrainingEntry;
