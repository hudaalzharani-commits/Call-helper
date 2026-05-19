import express from 'express';
import path from 'path';
import fs from 'fs';
import { unlink } from 'fs/promises';
import multer from 'multer';
import authRoutes from './auth.js';
import analyticsRoutes from './analytics.js';
import User from '../models/User.js';
import CallLog from '../models/CallLog.js';
import SystemLog from '../models/SystemLog.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Settings from '../models/Settings.js';
import Case from '../models/Case.js';
import OperationalUpdate from '../models/OperationalUpdate.js';
import TrainingEntry from '../models/TrainingEntry.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateAIResponse } from '../services/aiService.js';
import { analyzeConfidence } from '../services/confidenceService.js';
import {
  FREQUENT_ISSUE_THRESHOLD_KEY,
  FREQUENT_ISSUE_DEFAULT_THRESHOLD,
  FREQUENT_ISSUE_MIN_THRESHOLD,
  FREQUENT_ISSUE_MAX_THRESHOLD,
  getFrequentIssueThreshold,
  normalizeFrequentIssueThreshold,
} from '../utils/frequentIssueThreshold.js';
import { sanitizeCallLogBody } from '../utils/sanitizeCallLogBody.js';
import {
  detectAndUpdateIssue,
  expireStaleIssues,
  getActiveIssues,
  getArchivedIssues,
  resolveIssue,
  OPERATIONAL_ISSUE_CONSTANTS,
} from '../services/operationalIssueService.js';
import { mergeUiVisibility } from '../utils/userUiVisibility.js';

const router = express.Router();
const SCORING_SETTINGS_KEY = 'advanced_scoring_settings';
const DEFAULT_SCORING_SETTINGS = {
  scoreThresholds: {
    directAnswer: 80,
    showAdvanced: 50,
    grayArea: 50,
  },
  weights: [
    { name: 'keywordMatch', value: 100 },
    { name: 'caseUsageFrequency', value: 0 },
    { name: 'caseFreshness', value: 0 },
    { name: 'caseMetadataMatch', value: 0 },
  ],
  decayRateDays: 30,
};
const REQUIRED_SCORING_WEIGHTS = [
  { name: 'keywordMatch', defaultValue: 100 },
  { name: 'caseUsageFrequency', defaultValue: 0 },
  { name: 'caseFreshness', defaultValue: 0 },
  { name: 'caseMetadataMatch', defaultValue: 0 },
];

const clampPercentage = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(0, Math.min(100, numericValue));
};

const normalizeScoringSettings = (rawSettings = {}) => {
  const requiredDefaultsByName = new Map(
    REQUIRED_SCORING_WEIGHTS.map((weight) => [weight.name.toLowerCase(), weight.defaultValue])
  );
  const requiredCanonicalNameByName = new Map(
    REQUIRED_SCORING_WEIGHTS.map((weight) => [weight.name.toLowerCase(), weight.name])
  );
  const groupedWeights = new Map();
  const rawWeights = Array.isArray(rawSettings.weights)
    ? rawSettings.weights
    : DEFAULT_SCORING_SETTINGS.weights;

  rawWeights.forEach((weight) => {
    if (!weight || typeof weight.name !== 'string') return;
    const normalizedName = weight.name.trim().toLowerCase();
    if (!normalizedName) return;

    const normalizedWeight = {
      name: weight.name.trim(),
      value: clampPercentage(weight.value, 0),
    };
    const group = groupedWeights.get(normalizedName) || [];
    group.push(normalizedWeight);
    groupedWeights.set(normalizedName, group);
  });

  const normalizedWeights = [];
  groupedWeights.forEach((group, normalizedName) => {
    let resolvedWeight = group[group.length - 1];
    const requiredDefault = requiredDefaultsByName.get(normalizedName);
    if (requiredDefault !== undefined) {
      const latestNonDefault = [...group].reverse().find((weight) => weight.value !== requiredDefault);
      if (latestNonDefault) {
        resolvedWeight = latestNonDefault;
      }
      resolvedWeight = {
        ...resolvedWeight,
        name: requiredCanonicalNameByName.get(normalizedName) || resolvedWeight.name,
      };
    }
    normalizedWeights.push(resolvedWeight);
  });

  REQUIRED_SCORING_WEIGHTS.forEach((requiredWeight) => {
    const exists = normalizedWeights.some(
      (weight) => weight.name.trim().toLowerCase() === requiredWeight.name.toLowerCase()
    );
    if (!exists) {
      normalizedWeights.push({
        name: requiredWeight.name,
        value: requiredWeight.defaultValue,
      });
    }
  });

  return {
    scoreThresholds: {
      directAnswer: clampPercentage(rawSettings?.scoreThresholds?.directAnswer, DEFAULT_SCORING_SETTINGS.scoreThresholds.directAnswer),
      showAdvanced: clampPercentage(rawSettings?.scoreThresholds?.showAdvanced, DEFAULT_SCORING_SETTINGS.scoreThresholds.showAdvanced),
      grayArea: clampPercentage(rawSettings?.scoreThresholds?.grayArea, DEFAULT_SCORING_SETTINGS.scoreThresholds.grayArea),
    },
    weights: normalizedWeights,
    decayRateDays: Math.max(1, Number(rawSettings?.decayRateDays || DEFAULT_SCORING_SETTINGS.decayRateDays)),
  };
};

// Auth routes
router.use('/auth', authRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Users routes
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, password, name, email, role, status, permAdminPanel, permContentCreate, uiVisibility } = req.body;
    const uname = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password : '';
    const displayName = typeof name === 'string' ? name.trim() : '';

    if (!uname || !plainPassword || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم وكلمة المرور والاسم مطلوبة',
      });
    }

    if (plainPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      });
    }

    const existingUsername = await User.findOne({ username: uname });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });
    }

    const emailNorm = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
    if (emailNorm) {
      const existingEmail = await User.findOne({ email: emailNorm });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });
      }
    }

    const allowedRoles = ['admin', 'user', 'moderator', 'customer_service'];
    const nextRole = allowedRoles.includes(role) ? role : 'user';
    const statusNorm = ['active', 'inactive', 'suspended'].includes(status) ? status : 'active';
    const isActive = statusNorm === 'active';

    let nextPermAdmin = false;
    let nextPermContent = false;
    if (nextRole === 'admin') {
      nextPermAdmin = true;
      nextPermContent = true;
    } else if (nextRole === 'moderator') {
      nextPermContent = true;
    }
    if (typeof permAdminPanel === 'boolean') {
      nextPermAdmin = permAdminPanel;
    }
    if (typeof permContentCreate === 'boolean') {
      nextPermContent = permContentCreate;
    }
    if (nextRole !== 'admin') {
      nextPermAdmin = false;
    }
    if (nextRole !== 'admin' && nextRole !== 'moderator') {
      nextPermContent = false;
    }

    const doc = new User({
      username: uname,
      password: plainPassword,
      name: displayName,
      email: emailNorm,
      role: nextRole,
      isActive,
      accountStatus: statusNorm,
      permAdminPanel: nextPermAdmin,
      permContentCreate: nextPermContent,
      uiVisibility: mergeUiVisibility({}, uiVisibility),
    });
    await doc.save();

    const safe = await User.findById(doc._id).select('-password');
    res.status(201).json({ success: true, data: safe, message: 'تم إنشاء المستخدم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await User.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const { name, email, username, role, status, permAdminPanel, permContentCreate, uiVisibility } = req.body;
    const updates = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof email === 'string') {
      const emailNorm = email.trim() ? email.trim().toLowerCase() : null;
      if (emailNorm) {
        const clash = await User.findOne({ email: emailNorm, _id: { $ne: id } });
        if (clash) {
          return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل' });
        }
      }
      updates.email = emailNorm || undefined;
    }
    if (typeof username === 'string' && username.trim()) {
      const uname = username.trim().toLowerCase();
      const clash = await User.findOne({ username: uname, _id: { $ne: id } });
      if (clash) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم مستخدم بالفعل' });
      }
      updates.username = uname;
    }
    if (role !== undefined) {
      const allowedRoles = ['admin', 'user', 'moderator', 'customer_service'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'دور غير صالح' });
      }
      if (existing.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'لا يمكن إزالة دور المسؤول عن آخر مسؤول في النظام',
          });
        }
      }
      updates.role = role;
    }
    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
      }
      updates.accountStatus = status;
      updates.isActive = status === 'active';
    }

    const effectiveRole = updates.role !== undefined ? updates.role : existing.role;

    if (permAdminPanel !== undefined) {
      if (typeof permAdminPanel !== 'boolean') {
        return res.status(400).json({ success: false, message: 'permAdminPanel must be boolean' });
      }
      if (permAdminPanel && effectiveRole !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'لوحة الإدارة متاحة فقط لدور مسؤول النظام',
        });
      }
      updates.permAdminPanel = permAdminPanel;
    }
    if (permContentCreate !== undefined) {
      if (typeof permContentCreate !== 'boolean') {
        return res.status(400).json({ success: false, message: 'permContentCreate must be boolean' });
      }
      if (permContentCreate && effectiveRole !== 'admin' && effectiveRole !== 'moderator') {
        return res.status(400).json({
          success: false,
          message: 'صلاحية إنشاء المحتوى للمسؤول أو المشرف فقط',
        });
      }
      updates.permContentCreate = permContentCreate;
    }

    if (uiVisibility !== undefined) {
      updates.uiVisibility = mergeUiVisibility(existing.uiVisibility, uiVisibility);
    }

    if (updates.role !== undefined && updates.role !== existing.role) {
      if (updates.permAdminPanel === undefined) {
        updates.permAdminPanel = updates.role === 'admin';
      }
      if (updates.permContentCreate === undefined) {
        updates.permContentCreate = updates.role === 'admin' || updates.role === 'moderator';
      }
      if (updates.role !== 'admin') {
        updates.permAdminPanel = false;
      }
      if (updates.role !== 'admin' && updates.role !== 'moderator') {
        updates.permContentCreate = false;
      }
    }

    const updated = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select(
      '-password',
    );
    res.json({ success: true, data: updated, message: 'تم تحديث المستخدم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/users/:id/password', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const plain = typeof req.body.password === 'string' ? req.body.password : '';
    if (plain.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      });
    }

    const userDoc = await User.findById(id);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    userDoc.password = plain;
    await userDoc.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف حسابك أثناء الجلسة الحالية' });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف آخر مسؤول في النظام',
        });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'تم حذف المستخدم' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/cases/:id/active', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    const updatedCase = await Case.findByIdAndUpdate(
      req.params.id,
      {
        isActive,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({
      success: true,
      data: updatedCase,
      message: `Case ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/cases/:id/archive', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const archivedCase = await Case.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: req.user._id,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!archivedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({
      success: true,
      data: archivedCase,
      message: 'Case archived successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/cases/:id/unarchive', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const restoredCase = await Case.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!restoredCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({
      success: true,
      data: restoredCase,
      message: 'Case restored from archive successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/users/me', authenticate, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// Call logs routes
router.post('/calls', authenticate, async (req, res) => {
  try {
    const callLog = new CallLog({
      ...sanitizeCallLogBody(req.body),
      user: req.user._id
    });
    await callLog.save();
    if (callLog.matchedCase) {
      const updatedCase = await Case.findByIdAndUpdate(callLog.matchedCase, {
        $inc: { matchCount: 1 }
      }, {
        new: true,
        select: { matchCount: 1 }
      });
      if (updatedCase) {
        callLog.matchedCaseCount = Number(updatedCase.matchCount || 0);
        await callLog.save();
      }
    }

    // Frequency-today computation: only meaningful when the call has both
    // a category (from the matched case) and an entityType (مقدم الخدمة).
    // Threshold is read from the Settings collection so admins can update it
    // from the dashboard without redeploying.
    let frequency = null;
    if (callLog.category && callLog.entityType && callLog.bucketDate) {
      const [frequencyToday, threshold] = await Promise.all([
        CallLog.countDocuments({
          category: callLog.category,
          entityType: callLog.entityType,
          bucketDate: callLog.bucketDate,
        }),
        getFrequentIssueThreshold(),
      ]);
      frequency = {
        category: callLog.category,
        entityType: callLog.entityType,
        bucketDate: callLog.bucketDate,
        frequencyToday,
        threshold,
        isFrequent: frequencyToday >= threshold,
      };
    }

    // Operational issue detection (rolling 24h / 7d windows). Awaited so the
    // caller can react to "this just became a tracked issue" in the response
    // payload, but wrapped in the service's own try/catch so a failure here
    // never breaks the call log submission.
    let operationalIssue = null;
    if (callLog.category) {
      const detection = await detectAndUpdateIssue({
        category: callLog.category,
        entityType: callLog.entityType,
        problemSummary: callLog.problemSummary,
      });
      if (detection && detection.issue) {
        operationalIssue = {
          id: detection.issue._id,
          status: detection.issue.status,
          occurrenceCount: detection.issue.occurrenceCount,
          count24h: detection.count24h,
          count7d: detection.count7d,
          thresholds: OPERATIONAL_ISSUE_CONSTANTS,
        };
      } else if (detection) {
        operationalIssue = {
          id: null,
          status: null,
          count24h: detection.count24h,
          count7d: detection.count7d,
          thresholds: OPERATIONAL_ISSUE_CONSTANTS,
        };
      }
    }

    res.status(201).json({ success: true, data: callLog, frequency, operationalIssue });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Read-only lookup for the daily frequency of a (category + entityType) bucket.
// Used by the CallHelper UI to refresh the "مشكلة متكررة اليوم" badge without
// inserting a new log (e.g. after the analytics page refreshes).
router.get('/calls/frequency', authenticate, async (req, res) => {
  try {
    const category = (req.query.category || '').toString().trim();
    const entityType = (req.query.entityType || '').toString().trim();

    if (!category || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'category and entityType query params are required',
      });
    }

    const bucketDate = CallLog.computeBucketDate(new Date());
    const [frequencyToday, threshold] = await Promise.all([
      CallLog.countDocuments({ category, entityType, bucketDate }),
      getFrequentIssueThreshold(),
    ]);

    res.json({
      success: true,
      data: {
        category,
        entityType,
        bucketDate,
        frequencyToday,
        threshold,
        isFrequent: frequencyToday >= threshold,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/calls', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;
    
    const calls = await CallLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await CallLog.countDocuments(query);
    
    res.json({
      success: true,
      data: calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all call logs (admin only)
router.get('/calls/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const calls = await CallLog.find()
      .populate('user', 'name username')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: calls
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// System logs (admin) — persisted diagnostics for the System Logs dashboard
router.get('/admin/system-logs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '500'), 10) || 500, 2000);
    const q = {};
    if (req.query.systemType && String(req.query.systemType) !== 'all') {
      q.systemType = String(req.query.systemType);
    }
    if (req.query.severity && String(req.query.severity) !== 'all') {
      q.severity = String(req.query.severity);
    }
    if (req.query.status && String(req.query.status) !== 'all') {
      q.status = String(req.query.status);
    }
    if (req.query.caseId && String(req.query.caseId).trim()) {
      q.caseId = new RegExp(String(req.query.caseId).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const logs = await SystemLog.find(q).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/calls/:id', authenticate, async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }
    const isOwner = call.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const allowed = [
      'generatedResponse',
      'flowResult',
      'advancedFlowSummary',
      'status',
      'finalDisplayScore',
      'category',
      'matchedCase',
      'matchedCaseCode',
      'matchedAt',
      'problemType',
    ];
    const patchBody = sanitizeCallLogBody(req.body);
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patchBody, key)) {
        call[key] = patchBody[key];
      }
    }
    call.updatedAt = new Date();
    await call.save();

    res.json({ success: true, data: call });
  } catch (error) {
    console.error('❌ PATCH /calls/:id error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete call log
router.delete('/calls/:id', authenticate, async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }
    
    // Only allow users to delete their own calls, or admins to delete any
    if (call.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await call.deleteOne();
    
    res.json({
      success: true,
      message: 'Call log deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ Operational Issue Tracking ============
// A separate, lightweight layer over CallLogs that promotes recurring
// (category + service-provider) buckets to actionable "issues" with a
// lifecycle (general_repeated → persistent_operational → resolved/archived).
//
// Detection runs automatically inside POST /api/calls. The endpoints below
// just expose the read/list and resolve actions for the admin dashboard.

// Active list — also runs on-read expiration so stale daily issues don't
// linger in the dashboard.
router.get('/operational-issues', authenticate, async (req, res) => {
  try {
    await expireStaleIssues();
    const issues = await getActiveIssues();
    res.json({
      success: true,
      data: issues,
      thresholds: OPERATIONAL_ISSUE_CONSTANTS,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Archive (resolved issues), most-recently resolved first.
router.get('/operational-issues/archive', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const issues = await getArchivedIssues({ limit });
    res.json({
      success: true,
      data: issues,
      thresholds: OPERATIONAL_ISSUE_CONSTANTS,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark as Resolved — admin-only. Preserves metadata, sets resolvedAt/By,
// and moves the issue out of the active list. Never hard-deletes.
router.post(
  '/operational-issues/:id/resolve',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const notes = (req.body?.notes || '').toString();
      const issue = await resolveIssue(req.params.id, req.user._id, notes);
      if (!issue) {
        return res.status(404).json({
          success: false,
          message: 'Operational issue not found or already resolved',
        });
      }
      res.json({ success: true, data: issue });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Knowledge base routes
router.get('/knowledge', authenticate, async (req, res) => {
  try {
    const { search, category, minConfidence, scope = 'published' } = req.query;
    let query = {};

    if (scope === 'draft') {
      query.isPublished = false;
    } else if (scope === 'all') {
      // لا نضيف فلتر isPublished — كل السجلات في المجموعة
    } else {
      query.isPublished = true;
    }

    if (category) query.category = category;
    if (minConfidence) query.confidence = { $gte: parseInt(minConfidence) };
    if (search) {
      query.$text = { $search: search };
    }
    
    const articles = await KnowledgeBase.find(query)
      .populate('createdBy', 'name username')
      .sort({ confidence: -1, createdAt: -1 });
    
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/knowledge', authenticate, authorize('admin', 'moderator', 'customer_service'), async (req, res) => {
  try {
    const article = new KnowledgeBase({
      ...req.body,
      createdBy: req.user._id
    });
    await article.save();
    res.status(201).json({ success: true, data: article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update knowledge article (admin/mod/cs — موظف خدمة العملاء يعدّل مقالاته فقط)
router.put('/knowledge/:id', authenticate, authorize('admin', 'moderator', 'customer_service'), async (req, res) => {
  try {
    if (req.user.role === 'customer_service') {
      const existing = await KnowledgeBase.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Article not found' });
      }
      if (existing.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن تعديل مقالات لم تقم بإنشائها',
        });
      }
    }

    const updated = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete knowledge article (admin)
router.delete('/knowledge/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deleted = await KnowledgeBase.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: null, message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record view
router.post('/knowledge/:id/view', authenticate, async (req, res) => {
  try {
    const updated = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record feedback
router.post('/knowledge/:id/feedback', authenticate, async (req, res) => {
  try {
    const helpful = Boolean(req.body?.helpful);
    const inc = helpful ? { helpfulCount: 1 } : { notHelpfulCount: 1 };

    const updated = await KnowledgeBase.findByIdAndUpdate(
      req.params.id,
      { $inc: inc },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Settings routes
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await Settings.find(
      req.user.role === 'admin' ? {} : { isPublic: true }
    );
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ Frequent-issue threshold (admin configurable) ============
// Lets admins read/update the daily threshold that decides whether a
// (category + entityType) bucket counts as "متكرر اليوم". Both endpoints
// always return a normalized integer in the allowed range so the frontend
// can rely on a clean value.
//
// IMPORTANT: These specific routes MUST be declared before the generic
// `/settings/:key` route below — Express matches in declaration order, and
// the wildcard would otherwise swallow this path and silently write the
// wrong key into the Settings collection.

// GET — Any authenticated user can read the current threshold (used to
// render the input value when the admin panel section opens).
router.get('/settings/frequent-issue-threshold', authenticate, async (req, res) => {
  try {
    const threshold = await getFrequentIssueThreshold();
    // Also peek at the raw Settings doc so the backend log makes it obvious
    // whether the value is the persisted one or the in-memory default.
    const rawDoc = await Settings.findOne({ key: FREQUENT_ISSUE_THRESHOLD_KEY }).lean();
    console.log('[settings:frequent-issue-threshold:GET]', {
      computedThreshold: threshold,
      rawDocExists: !!rawDoc,
      rawValue: rawDoc?.value,
      rawUpdatedAt: rawDoc?.updatedAt,
    });
    res.json({
      success: true,
      data: {
        threshold,
        min: FREQUENT_ISSUE_MIN_THRESHOLD,
        max: FREQUENT_ISSUE_MAX_THRESHOLD,
        defaultValue: FREQUENT_ISSUE_DEFAULT_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[settings:frequent-issue-threshold:GET] error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT — Admin only. Accepts `{ threshold: number }` and persists it.
router.put('/settings/frequent-issue-threshold', authenticate, authorize('admin'), async (req, res) => {
  try {
    const requested = Number(req.body?.threshold);
    if (!Number.isFinite(requested)) {
      return res.status(400).json({
        success: false,
        message: 'threshold must be a finite number',
      });
    }

    const normalized = normalizeFrequentIssueThreshold(requested);
    console.log('[settings:frequent-issue-threshold:PUT] incoming', {
      userId: req.user?._id?.toString(),
      role: req.user?.role,
      requested,
      normalized,
    });
    // Read back the updated doc so we can prove persistence to ourselves in
    // the logs. Without `new: true` we'd get the *pre-update* doc which is
    // useless for verification.
    const updatedDoc = await Settings.findOneAndUpdate(
      { key: FREQUENT_ISSUE_THRESHOLD_KEY },
      {
        $set: {
          key: FREQUENT_ISSUE_THRESHOLD_KEY,
          value: normalized,
          description: 'Daily count threshold for the "متكرر اليوم" feature',
          category: 'thresholds',
          isPublic: true,
          updatedBy: req.user._id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    console.log('[settings:frequent-issue-threshold:PUT] persisted', {
      docId: updatedDoc?._id?.toString(),
      value: updatedDoc?.value,
      updatedAt: updatedDoc?.updatedAt,
    });

    // Round-trip read to guarantee we're returning what's actually in the DB
    // (catches edge cases where the upsert silently failed but no error was
    // thrown, e.g. write concern issues).
    const verified = await getFrequentIssueThreshold();
    console.log('[settings:frequent-issue-threshold:PUT] verified read', { verified });

    res.json({
      success: true,
      data: {
        threshold: verified,
        min: FREQUENT_ISSUE_MIN_THRESHOLD,
        max: FREQUENT_ISSUE_MAX_THRESHOLD,
        defaultValue: FREQUENT_ISSUE_DEFAULT_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[settings:frequent-issue-threshold:PUT] error', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generic PUT — must come AFTER the specific routes above so the wildcard
// `:key` doesn't catch paths that have their own handlers.
router.put('/settings/:key', authenticate, authorize('admin'), async (req, res) => {
  try {
    const isScoringAlias = req.params.key === 'scoring' || req.params.key === SCORING_SETTINGS_KEY;
    const resolvedKey = isScoringAlias ? SCORING_SETTINGS_KEY : req.params.key;
    const updatePayload = isScoringAlias
      ? {
          key: resolvedKey,
          value: normalizeScoringSettings(req.body || {}),
          category: 'thresholds',
          description: 'Advanced scoring settings for Call Helper',
          isPublic: true,
          updatedBy: req.user._id,
        }
      : { ...req.body, updatedBy: req.user._id };
    const setting = await Settings.findOneAndUpdate(
      { key: resolvedKey },
      updatePayload,
      { new: true, upsert: true }
    );
    if (isScoringAlias) {
      return res.json({ success: true, data: setting.value });
    }
    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/settings/scoring', authenticate, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: SCORING_SETTINGS_KEY });
    if (!setting) {
      const normalizedDefault = normalizeScoringSettings(DEFAULT_SCORING_SETTINGS);
      return res.json({ success: true, data: normalizedDefault });
    }

    const normalizedSettings = normalizeScoringSettings(setting.value || {});
    if (JSON.stringify(setting.value || {}) !== JSON.stringify(normalizedSettings)) {
      setting.value = normalizedSettings;
      setting.updatedBy = req.user._id;
      await setting.save();
    }

    res.json({ success: true, data: normalizedSettings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// AI response generation endpoint
// Integrated with AI service (OpenAI/Claude) as per BACKEND_INTEGRATION_GUIDE.md
router.post('/ai/generate-response', authenticate, async (req, res) => {
  try {
    const { flowResult, clientData } = req.body;
    
    // Validate input
    if (!flowResult || !clientData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: flowResult and clientData'
      });
    }
    
    // Call AI service to generate intelligent response
    // Will automatically fallback to mock if no API key is configured
    const result = await generateAIResponse(flowResult, clientData);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ AI Route Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate AI response',
      error: error.message 
    });
  }
});

// Confidence analysis endpoint
// AI-powered semantic analysis to determine problem description quality
// Replaces frontend keyword-based calculation with intelligent scoring
router.post('/analyze-confidence', authenticate, async (req, res) => {
  try {
    const { description } = req.body;
    
    // Validate input
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: description'
      });
    }
    
    if (typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be a string'
      });
    }
    
    // Call confidence service for AI-powered analysis
    // Will automatically fallback to keyword analysis if AI is unavailable
    const result = await analyzeConfidence(description);
    
    // Log for monitoring (optional)
    if (process.env.LOG_CONFIDENCE_SCORES === 'true') {
      console.log('📊 Confidence Analysis:', {
        userId: req.user._id,
        username: req.user.username,
        descriptionLength: description.length,
        confidenceScore: result.data.confidenceScore,
        provider: result.metadata.provider,
        processingTime: result.metadata.processingTime
      });
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Confidence Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze confidence',
      error: error.message 
    });
  }
});

// Cases routes (for fuzzy matching reference cases)
// Search endpoint - available to all authenticated users
router.get('/cases', authenticate, async (req, res) => {
  try {
    const { archived = 'false', includeInactive = 'false', scope } = req.query;
    let query = {};

    if (scope === 'all') {
      // كل الحالات في المجموعة (نشطة، موقوفة، مؤرشفة) — لوحة سجل المعرفة الموحّدة
      query = {};
    } else {
      query = { isArchived: archived === 'true' };
      if (includeInactive !== 'true') {
        query.isActive = true;
      }
    }

    const cases = await Case.find(query)
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .populate('archivedBy', 'name username')
      .sort({ updatedAt: -1 });
    
    res.json({ success: true, data: cases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/cases/usage-counts', authenticate, async (req, res) => {
  try {
    const matchedCases = await Case.find(
      { matchCount: { $gt: 0 } },
      { caseId: 1, matchCount: 1 }
    );
    const latestMatches = await CallLog.aggregate([
      {
        $match: {
          matchedCase: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$matchedCase',
          lastMatchedAt: {
            $max: {
              $ifNull: ['$matchedAt', '$createdAt']
            }
          }
        }
      }
    ]);
    const lastMatchedAtByCaseDbId = new Map(
      latestMatches.map((entry) => [entry._id.toString(), entry.lastMatchedAt || null])
    );
    const data = matchedCases.map((caseItem) => ({
      caseDbId: caseItem._id.toString(),
      caseId: caseItem.caseId || null,
      usageCount: Number(caseItem.matchCount || 0),
      lastMatchedAt: lastMatchedAtByCaseDbId.get(caseItem._id.toString()) || null
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post('/cases', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const newCase = new Case({
      ...req.body,
      createdBy: req.user._id
    });
    
    await newCase.save();
    
    res.status(201).json({
      success: true,
      data: newCase,
      message: 'Case created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/cases/:id', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const updatedCase = await Case.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({
      success: true,
      data: updatedCase,
      message: 'Case updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/cases/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const deletedCase = await Case.findByIdAndDelete(req.params.id);
    
    if (!deletedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    res.json({
      success: true,
      message: 'Case deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ Operational updates (التحديثات التشغيلية) ============
router.get('/operational-updates', authenticate, async (req, res) => {
  try {
    const items = await OperationalUpdate.find()
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username')
      .sort({ startDate: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/operational-updates', authenticate, authorize('admin', 'moderator', 'customer_service'), async (req, res) => {
  try {
    const affected = Array.isArray(req.body.affectedServices)
      ? req.body.affectedServices.filter((s) => typeof s === 'string' && s.trim())
      : typeof req.body.affectedServices === 'string'
        ? req.body.affectedServices.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
        : [];

    const doc = await OperationalUpdate.create({
      title: req.body.title,
      description: req.body.description,
      type: req.body.type || 'announcement',
      status: req.body.status || 'scheduled',
      priority: req.body.priority || 'medium',
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      affectedServices: affected,
      createdBy: req.user._id,
    });

    await doc.populate('createdBy', 'name username');
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/operational-updates/:id', authenticate, authorize('admin', 'moderator', 'customer_service'), async (req, res) => {
  try {
    if (req.user.role === 'customer_service') {
      const existing = await OperationalUpdate.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Operational update not found' });
      }
      if (existing.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن تعديل تحديث لم تقم بإنشائه',
        });
      }
    }

    const payload = { updatedBy: req.user._id };
    if (req.body.title !== undefined) payload.title = String(req.body.title).trim();
    if (req.body.description !== undefined) payload.description = String(req.body.description);
    if (req.body.type !== undefined) payload.type = req.body.type;
    if (req.body.status !== undefined) payload.status = req.body.status;
    if (req.body.priority !== undefined) payload.priority = req.body.priority;
    if (req.body.startDate !== undefined) {
      payload.startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    }
    if (req.body.endDate !== undefined) {
      payload.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }
    if (req.body.affectedServices !== undefined) {
      payload.affectedServices = Array.isArray(req.body.affectedServices)
        ? req.body.affectedServices.filter((s) => typeof s === 'string' && s.trim())
        : typeof req.body.affectedServices === 'string'
          ? req.body.affectedServices.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
          : [];
    }

    const updated = await OperationalUpdate.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate('createdBy', 'name username')
      .populate('updatedBy', 'name username');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Operational update not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/operational-updates/:id', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const deleted = await OperationalUpdate.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Operational update not found' });
    }
    res.json({ success: true, data: null, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ Training entries (وش تعلم رفيق) ============
function stripTrainingAttachmentFooterScenario(scenario) {
  return scenario
    .replace(/\s*──(?:\s|\r?\n)*مرفق\s+توضيحي\s*\(\s*اسم\s+الملف\s*\)\s*:\s*[\s\S]*$/iu, '')
    .trimEnd();
}

const trainingUploadDir = path.join(process.cwd(), 'uploads', 'training');
try {
  fs.mkdirSync(trainingUploadDir, { recursive: true });
} catch {
  /* ignore */
}

const trainingUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, trainingUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 20);
      const safeExt = ext && /^\.[a-zA-Z0-9.]+$/.test(ext) ? ext : '';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 12)}${safeExt}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname || '';
    if (/\.(png|jpe?g|gif|webp|pdf|doc|docx|txt)$/i.test(name)) return cb(null, true);
    cb(new Error('نوع الملف غير مدعوم'));
  },
});

router.use('/uploads/training', express.static(trainingUploadDir));

function trainingEntriesMultipart(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return trainingUpload.single('attachment')(req, res, err => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'فشل رفع الملف' });
      }
      return next();
    });
  }
  return next();
}

router.get('/training-entries', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const q = {};
    if (status && status !== 'all' && ['pending', 'approved', 'rejected'].includes(status)) {
      q.status = status;
    }
    const items = await TrainingEntry.find(q)
      .populate('submittedBy', 'name username')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/training-entries', authenticate, trainingEntriesMultipart, async (req, res) => {
  try {
    let alternativeResponses = [];
    if (Array.isArray(req.body.alternativeResponses)) {
      alternativeResponses = req.body.alternativeResponses;
    } else if (typeof req.body.alternativeResponses === 'string' && req.body.alternativeResponses.trim()) {
      try {
        const parsed = JSON.parse(req.body.alternativeResponses);
        alternativeResponses = Array.isArray(parsed) ? parsed : [];
      } catch {
        alternativeResponses = [];
      }
    }

    let attachmentUrl = '';
    let attachmentOriginalName = '';
    if (req.file) {
      attachmentUrl = `/api/uploads/training/${req.file.filename}`;
      attachmentOriginalName = (req.file.originalname || req.file.filename).toString();
    }

    const scenarioRaw = (req.body.scenario || '').toString();
    const scenario = stripTrainingAttachmentFooterScenario(scenarioRaw);

    const doc = await TrainingEntry.create({
      scenario,
      correctResponse: (req.body.correctResponse || '').toString(),
      alternativeResponses,
      category: (req.body.category || 'عام').toString().trim(),
      submittedBy: req.user._id,
      status: 'pending',
      attachmentUrl,
      attachmentOriginalName,
    });
    await doc.populate('submittedBy', 'name username');
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/training-entries/:id', authenticate, async (req, res) => {
  try {
    const entry = await TrainingEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Training entry not found' });
    }
    const owner = entry.submittedBy.toString() === req.user._id.toString();
    const privileged = ['admin', 'moderator'].includes(req.user.role);
    if (!owner && !privileged) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const update = {};
    if (req.body.scenario !== undefined) {
      update.scenario = stripTrainingAttachmentFooterScenario(req.body.scenario.toString());
    }
    if (req.body.correctResponse !== undefined) update.correctResponse = req.body.correctResponse;
    if (req.body.alternativeResponses !== undefined) update.alternativeResponses = req.body.alternativeResponses;
    if (req.body.category !== undefined) update.category = req.body.category;
    if (privileged) {
      if (req.body.status !== undefined) update.status = req.body.status;
      if (req.body.notes !== undefined) update.notes = req.body.notes;
    }

    const updated = await TrainingEntry.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate('submittedBy', 'name username')
      .populate('reviewedBy', 'name username');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/training-entries/:id/review', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid review status' });
    }
    const updated = await TrainingEntry.findByIdAndUpdate(
      req.params.id,
      {
        status,
        notes: (notes || '').toString(),
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true, runValidators: true },
    )
      .populate('submittedBy', 'name username')
      .populate('reviewedBy', 'name username');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Training entry not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/training-entries/:id', authenticate, async (req, res) => {
  try {
    const entry = await TrainingEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Training entry not found' });
    }
    const owner = entry.submittedBy.toString() === req.user._id.toString();
    const privileged = ['admin', 'moderator'].includes(req.user.role);
    if (!owner && !privileged) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (entry.attachmentUrl) {
      const base = path.basename(entry.attachmentUrl);
      const fp = path.join(trainingUploadDir, base);
      unlink(fp).catch(() => {});
    }
    await TrainingEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: null, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
