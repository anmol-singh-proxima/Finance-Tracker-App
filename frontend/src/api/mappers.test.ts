import { describe, expect, it } from 'vitest';

import type { CategoryDto, DashboardSummaryDto, ExpenseDto, InvestmentDto } from '../types/dto';
import { toCategory, toDashboardSummary, toExpense, toInvestment } from './mappers';

describe('DTO → domain mappers', () => {
  it('parses expense decimal-strings into numbers', () => {
    const dto: ExpenseDto = {
      id: 'e1',
      category: 'Food & Dining',
      amount: '12.50',
      date: '2026-07-01',
      description: 'Lunch',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };
    const expense = toExpense(dto);
    expect(expense.amount).toBe(12.5);
    expect(typeof expense.amount).toBe('number');
    expect(expense.category).toBe('Food & Dining');
  });

  it('maps investment snake_case + decimals to camelCase numbers', () => {
    const dto: InvestmentDto = {
      id: 'i1',
      name: 'Index Fund',
      type: 'etf',
      amount: '1000.00',
      current_value: '1100.55',
      purchase_date: '2026-01-01',
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const investment = toInvestment(dto);
    expect(investment.amount).toBe(1000);
    expect(investment.currentValue).toBe(1100.55);
    expect(investment.purchaseDate).toBe('2026-01-01');
    expect(investment.notes).toBeNull();
  });

  it('maps category is_predefined to isPredefined', () => {
    const dto: CategoryDto = { id: 'c1', name: 'Food & Dining', is_predefined: true };
    expect(toCategory(dto)).toEqual({ id: 'c1', name: 'Food & Dining', isPredefined: true });
  });

  it('maps every dashboard summary field to a number', () => {
    const dto: DashboardSummaryDto = {
      total_expenses_this_period: '50.00',
      total_invested: '1000.00',
      total_current_value: '1100.00',
      total_returns: '100.00',
      net_worth: '1050.00',
      expense_count: 3,
      investment_count: 1,
      roi: 10,
    };
    const summary = toDashboardSummary(dto);
    expect(summary.totalExpensesThisPeriod).toBe(50);
    expect(summary.totalReturns).toBe(100);
    expect(summary.netWorth).toBe(1050);
    expect(summary.roi).toBe(10);
  });
});
