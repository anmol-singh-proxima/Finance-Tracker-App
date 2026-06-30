import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          status: 401,
          message: 'Unauthorized - No token provided',
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    logger.error({ error: error.message, path: req.path });
    res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Unauthorized - Invalid token',
      },
    });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    }
  } catch (error) {
    // Token validation failed but it's optional, so we continue
    logger.warn({ message: 'Optional auth failed', error: error.message });
  }

  next();
};
