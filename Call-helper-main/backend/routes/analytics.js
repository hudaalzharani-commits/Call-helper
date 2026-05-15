import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getSummaryStats,
  getTimeSeriesData,
  getHourlyActivity,
  getDistributionStats,
  getUserStats,
  getKnowledgeBaseStats
} from '../services/analyticsService.js';

const router = express.Router();

// @route   GET /api/analytics/summary
// @desc    Get summary statistics
// @access  Private (authenticated users)
router.get('/summary', authenticate, async (req, res) => {
  try {
    const result = await getSummaryStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get summary statistics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/time-series
// @desc    Get time series data
// @access  Private
router.get('/time-series', authenticate, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const result = await getTimeSeriesData(period);
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics time-series error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get time series data',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/hourly
// @desc    Get hourly activity distribution
// @access  Private
router.get('/hourly', authenticate, async (req, res) => {
  try {
    const result = await getHourlyActivity();
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics hourly error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hourly activity data',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/distribution
// @desc    Get distribution statistics
// @access  Private
router.get('/distribution', authenticate, async (req, res) => {
  try {
    const result = await getDistributionStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get distribution statistics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/users
// @desc    Get user statistics
// @access  Private (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await getUserStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/knowledge-base
// @desc    Get knowledge base statistics
// @access  Private
router.get('/knowledge-base', authenticate, async (req, res) => {
  try {
    const result = await getKnowledgeBaseStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Analytics KB error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get knowledge base statistics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics
// @desc    Get all analytics (combined endpoint)
// @access  Private (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Fetch all analytics in parallel
    const [
      summary,
      timeSeries,
      hourly,
      distribution,
      users,
      knowledgeBase
    ] = await Promise.all([
      getSummaryStats(),
      getTimeSeriesData(period),
      getHourlyActivity(),
      getDistributionStats(),
      getUserStats(),
      getKnowledgeBaseStats()
    ]);
    
    res.json({
      success: true,
      data: {
        summary: summary.data,
        timeSeries: timeSeries.data,
        hourly: hourly.data,
        distribution: distribution.data,
        users: users.data,
        knowledgeBase: knowledgeBase.data
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Analytics combined error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
});

export default router;
