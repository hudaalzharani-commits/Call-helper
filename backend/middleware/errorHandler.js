import SystemLog from '../models/SystemLog.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    const msg = (err.message || 'Server Error').toString().slice(0, 500);
    const stack = err.stack ? String(err.stack).slice(0, 8000) : '';
    SystemLog.create({
      systemType: 'error',
      severity: 'high',
      message: msg,
      fullMessage: stack || msg,
      impact: 0,
      status: 'open',
      tags: ['server-error'],
      errorCode: err.name ? String(err.name).slice(0, 120) : 'ERR_SERVER',
      stackTrace: stack,
      source: req.originalUrl ? String(req.originalUrl).slice(0, 500) : '',
    }).catch(() => {});
  }
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server Error'
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};
