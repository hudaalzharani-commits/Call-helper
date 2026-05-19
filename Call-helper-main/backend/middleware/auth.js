import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    // AuthContext offline login uses this placeholder; it is not a JWT. In development,
    // map it to a real Mongo user so APIs (e.g. knowledge base) can read seeded data.
    if (token === 'local-auth-token' && process.env.NODE_ENV !== 'production') {
      const user =
        (await User.findOne({ role: 'admin', isActive: true }).sort({ createdAt: 1 })) ||
        (await User.findOne({ role: 'moderator', isActive: true }).sort({ createdAt: 1 })) ||
        (await User.findOne({ isActive: true }).sort({ createdAt: 1 }));

      if (!user) {
        return res.status(503).json({
          success: false,
          message:
            'قاعدة البيانات لا تحتوي مستخدمين نشطين. شغّل التهيئة (seed) أو سجّل الدخول عبر الخادم.',
        });
      }

      req.user = user;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user to request
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};
