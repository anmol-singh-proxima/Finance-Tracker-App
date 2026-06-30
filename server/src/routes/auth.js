import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory database (replace with actual DB later)
const users = new Map();
const sessions = new Map();

// Register endpoint
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Email and password are required',
      },
    });
  }

  // Check if user already exists
  if (Array.from(users.values()).some(u => u.email === email)) {
    return res.status(409).json({
      success: false,
      error: {
        status: 409,
        message: 'User already exists',
      },
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  // Store user
  const user = {
    id: userId,
    email,
    password: hashedPassword,
    createdAt: new Date(),
  };

  users.set(userId, user);

  // Generate token
  const token = generateToken(userId, email);

  logger.info({
    event: 'User registered',
    userId,
    email,
  });

  res.status(201).json({
    success: true,
    data: {
      user: { id: userId, email },
      token,
    },
  });
}));

// Login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Email and password are required',
      },
    });
  }

  // Find user by email
  const user = Array.from(users.values()).find(u => u.email === email);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Invalid credentials',
      },
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Invalid credentials',
      },
    });
  }

  // Generate token
  const token = generateToken(user.id, user.email);

  // Create session
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    createdAt: new Date(),
  });

  logger.info({
    event: 'User logged in',
    userId: user.id,
    email: user.email,
  });

  res.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email },
      token,
      sessionId,
    },
  });
}));

// Get profile endpoint
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const user = users.get(req.user.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'User not found',
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}));

// Logout endpoint
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  logger.info({
    event: 'User logged out',
    userId: req.user.userId,
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

export default router;
