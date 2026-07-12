/**
 * Domain types — what the UI and Redux store work with. camelCase field names
 * and `number` money values (see src/types/dto.ts for how these differ from
 * the wire format, and src/api/* for the mapping).
 */

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string; // ISO date (YYYY-MM-DD)
  description: string | null;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  currentValue: number;
  purchaseDate: string;
  notes: string | null;
}

export type CategoryType = 'expense' | 'investment';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  /** One level of hierarchy only (BR-18): a parent never has a parent itself. */
  parentId: string | null;
  isPredefined: boolean;
  createdAt: string;
  /** How many of the user's records reference this category (BR-18 safe delete). */
  linkedRecords: number;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  parentId: string | null;
}

export interface DashboardSummary {
  totalExpensesThisPeriod: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalReturns: number;
  netWorth: number;
  expenseCount: number;
  investmentCount: number;
  roi: number;
}

export interface TrendPoint {
  period: string; // "YYYY-MM"
  total: number;
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  percentage: number;
}

/** The authenticated user, derived from Cognito ID-token claims. */
export interface AuthUser {
  sub: string;
  email: string;
}

/** Filters that drive the list endpoints (BR-10). */
export interface ExpenseFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvestmentFilters {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}
