import mongoose from 'mongoose';

const UPDATE_TYPES = ['maintenance', 'incident', 'enhancement', 'announcement'];
const UPDATE_STATUSES = ['scheduled', 'ongoing', 'completed', 'cancelled'];
const PRIORITIES = ['high', 'medium', 'low'];

const operationalUpdateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: UPDATE_TYPES, default: 'announcement' },
    status: { type: String, enum: UPDATE_STATUSES, default: 'scheduled' },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    affectedServices: [{ type: String, trim: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

operationalUpdateSchema.index({ startDate: -1 });
operationalUpdateSchema.index({ status: 1 });

const OperationalUpdate = mongoose.model('OperationalUpdate', operationalUpdateSchema);

export default OperationalUpdate;
