import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// In-memory database for expenses
const expenses = new Map();

// Get all expenses for a user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userExpenses = Array.from(expenses.values()).filter(
    (exp) => exp.userId === req.user.userId
  );

  res.json({
    success: true,
    data: userExpenses,
  });
}));

// Get expense by ID
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const expense = expenses.get(req.params.id);

  if (!expense || expense.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Expense not found',
      },
    });
  }

  res.json({
    success: true,
    data: expense,
  });
}));

// Create expense
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const { category, amount, date, description } = req.body;

  if (!category || !amount || !date) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Category, amount, and date are required',
      },
    });
  }

  const id = uuidv4();
  const expense = {
    id,
    userId: req.user.userId,
    category,
    amount: parseFloat(amount),
    date: new Date(date),
    description,
    createdAt: new Date(),
  };

  expenses.set(id, expense);

  res.status(201).json({
    success: true,
    data: expense,
  });
}));

// Update expense
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const expense = expenses.get(req.params.id);

  if (!expense || expense.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Expense not found',
      },
    });
  }

  const { category, amount, date, description } = req.body;

  const updatedExpense = {
    ...expense,
    category: category || expense.category,
    amount: amount ? parseFloat(amount) : expense.amount,
    date: date ? new Date(date) : expense.date,
    description: description || expense.description,
    updatedAt: new Date(),
  };

  expenses.set(req.params.id, updatedExpense);

  res.json({
    success: true,
    data: updatedExpense,
  });
}));

// Delete expense
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const expense = expenses.get(req.params.id);

  if (!expense || expense.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        message: 'Expense not found',
      },
    });
  }

  expenses.delete(req.params.id);

  res.json({
    success: true,
    message: 'Expense deleted successfully',
  });
}));

export default router;
