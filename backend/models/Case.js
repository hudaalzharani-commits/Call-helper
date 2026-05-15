import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: [true, 'Case ID is required'],
    unique: true,
    trim: true
  },
  userType: {
    type: String,
    required: [true, 'User type is required'],
    trim: true
  },
  accountStatus: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subCategory: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  mainKeywords: {
    type: String,
    required: [true, 'Main keywords are required'],
    trim: true
  },
  extraKeywords: {
    type: String,
    trim: true,
    default: ''
  },
  synonyms: {
    type: String,
    trim: true,
    default: ''
  },
  negativeKeywords: {
    type: String,
    trim: true,
    default: ''
  },
  responseText: {
    type: String,
    required: [true, 'Response text is required'],
    trim: true
  },
  why: {
    type: String,
    trim: true,
    default: ''
  },
  fallbackText: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  matchCount: {
    type: Number,
    default: 0,
    min: 0
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
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

// Index for faster searching
caseSchema.index({ caseId: 1 });
caseSchema.index({ category: 1 });
caseSchema.index({ userType: 1 });
caseSchema.index({ matchCount: -1 });

const Case = mongoose.model('Case', caseSchema);

export default Case;
