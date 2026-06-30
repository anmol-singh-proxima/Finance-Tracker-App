import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Reference to data from other routes (in a real app, this would query the database)
let allExpenses = new Map();
let allInvestments = new Map();

// This should be called when expenses/investments are updated
export const syncDashboardData = (expensesMap, investmentsMap) => {
  allExpenses = expensesMap;
  allInvestments = investmentsMap;
};

// Get dashboard summary
router.get('/summary', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Filter data for current user
  const userExpenses = Array.from(allExpenses.values()).filter(
    (exp) => exp.userId === userId
  );
  const userInvestments = Array.from(allInvestments.values()).filter(
    (inv) => inv.userId === userId
  );

  // Calculate metrics
  const totalExpenses = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalInvested = userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrentValue = userInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const netWorth = (totalCurrentValue - totalExpenses);

  // Get this month's expenses
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thisMonthExpenses = userExpenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  res.json({
    success: true,
    data: {
      totalExpenses: thisMonthTotal,
      totalInvested,
      totalCurrentValue,
      totalReturns,
      netWorth,
      expenseCount: userExpenses.length,
      investmentCount: userInvestments.length,
      roi: totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0,
    },
  });
}));

// Get chart data
router.get('/chart-data', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // Get expenses by category
  const userExpenses = Array.from(allExpenses.values()).filter(
    (exp) => exp.userId === userId
  );

  const expensesByCategory = {};
  userExpenses.forEach((exp) => {
    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = 0;
    }
    expensesByCategory[exp.category] += exp.amount;
  });

  res.json({
    success: true,
    data: {
      expensesByCategory,
    },
  });
}));

export default router;
