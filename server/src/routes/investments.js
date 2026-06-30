import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// In-memory database for investments
const investments = new Map();

// Get all investments for a user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userInvestments = Array.from(investments.values()).filter(
    (inv) => inv.userId === req.user.userId
  );

  res.json({
    success: true,
    data: userInvestments,
  });
}));

// Get investment by ID
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const investment = investments.get(req.params.id);

  if (!investment || investment.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Investment not found',
      },
    });
  }

  res.json({
    success: true,
    data: investment,
  });
}));

// Create investment
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { name, type, amount, currentValue, purchaseDate, notes } = req.body;

  if (!name || !type || !amount || !currentValue || !purchaseDate) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Name, type, amount, currentValue, and purchaseDate are required',
      },
    });
  }

  const id = uuidv4();
  const investment = {
    id,
    userId: req.user.userId,
    name,
    type,
    amount: parseFloat(amount),
    currentValue: parseFloat(currentValue),
    purchaseDate: new Date(purchaseDate),
    notes,
    createdAt: new Date(),
  };

  investments.set(id, investment);

  res.status(201).json({
    success: true,
    data: investment,
  });
}));

// Update investment
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const investment = investments.get(req.params.id);

  if (!investment || investment.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Investment not found',
      },
    });
  }

  const { name, type, amount, currentValue, purchaseDate, notes } = req.body;

  const updatedInvestment = {
    ...investment,
    name: name || investment.name,
    type: type || investment.type,
    amount: amount ? parseFloat(amount) : investment.amount,
    currentValue: currentValue ? parseFloat(currentValue) : investment.currentValue,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : investment.purchaseDate,
    notes: notes || investment.notes,
    updatedAt: new Date(),
  };

  investments.set(req.params.id, updatedInvestment);

  res.json({
    success: true,
    data: updatedInvestment,
  });
}));

// Delete investment
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const investment = investments.get(req.params.id);

  if (!investment || investment.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Investment not found',
      },
    });
  }

  investments.delete(req.params.id);

  res.json({
    success: true,
    message: 'Investment deleted successfully',
  });
}));

export default router;
