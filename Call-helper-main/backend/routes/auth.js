import express from 'express';
import User from '../models/User.js';
import { generateToken, authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const identifier = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const plainPassword = typeof password === 'string' ? password : '';

    // Validate input
    if (!identifier || !plainPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Match by username or email (form allows either)
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(plainPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.json({
      success: true,
      data: {
        token,
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new user (admin only)
// @access  Public (but should be protected in production)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;

    // Validate input
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create user
    const allowed = ['admin', 'user', 'moderator', 'customer_service'];
    const nextRole = allowed.includes(role) ? role : 'user';

    const user = new User({
      username: username.toLowerCase(),
      password,
      name,
      email,
      role: nextRole,
      accountStatus: 'active',
      isActive: true,
      permAdminPanel: nextRole === 'admin',
      permContentCreate: nextRole === 'admin' || nextRole === 'moderator',
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: user.toSafeObject()
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user from token
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user.toSafeObject()
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post('/logout', (req, res) => {
  // In a token-based auth system, logout is handled client-side
  // This endpoint exists for consistency and can be used for logging
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
