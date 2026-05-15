import mongoose from 'mongoose';

const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['technical', 'billing', 'general', 'registration', 'umrah', 'agent']
  },
  solution: {
    type: String,
    required: true
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  examples: [{
    scenario: String,
    resolution: String
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  /** مصدر إنشاء المقال في المنتج (للعرض في سجل المعرفة) */
  recordOrigin: {
    type: String,
    enum: ['database', 'rafeeq_training', 'operational_update'],
    default: 'database',
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

// Text index for search
knowledgeBaseSchema.index({ 
  title: 'text', 
  description: 'text', 
  keywords: 'text',
  solution: 'text'
});

// Regular indexes
knowledgeBaseSchema.index({ category: 1 });
knowledgeBaseSchema.index({ confidence: -1 });
knowledgeBaseSchema.index({ isPublished: 1 });

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

export default KnowledgeBase;
