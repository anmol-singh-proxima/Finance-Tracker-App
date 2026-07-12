/**
 * Pure DTO ↔ domain transforms. Deliberately free of any I/O (no client, no
 * auth imports) so they're trivially unit-testable in isolation (TR-CQ-05) and
 * so the two normalisations the backend forces on us live in exactly one place:
 *   - Decimal-as-string  → number
 *   - snake_case         → camelCase
 */

import type {
  CategoryBreakdownItemDto,
  CategoryDto,
  DashboardSummaryDto,
  ExpenseDto,
  InvestmentDto,
  TrendPointDto,
} from '../types/dto';
import type {
  Category,
  CategoryBreakdownItem,
  DashboardSummary,
  Expense,
  Investment,
  TrendPoint,
} from '../types/domain';

export function toExpense(dto: ExpenseDto): Expense {
  return {
    id: dto.id,
    category: dto.category,
    amount: Number(dto.amount),
    date: dto.date,
    description: dto.description,
  };
}

export function toInvestment(dto: InvestmentDto): Investment {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    amount: Number(dto.amount),
    currentValue: Number(dto.current_value),
    purchaseDate: dto.purchase_date,
    notes: dto.notes,
  };
}

export function toCategory(dto: CategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    parentId: dto.parent_id,
    isPredefined: dto.is_predefined,
    createdAt: dto.created_at,
    linkedRecords: dto.linked_count,
  };
}

export function toDashboardSummary(dto: DashboardSummaryDto): DashboardSummary {
  return {
    totalExpensesThisPeriod: Number(dto.total_expenses_this_period),
    totalInvested: Number(dto.total_invested),
    totalCurrentValue: Number(dto.total_current_value),
    totalReturns: Number(dto.total_returns),
    netWorth: Number(dto.net_worth),
    expenseCount: dto.expense_count,
    investmentCount: dto.investment_count,
    roi: dto.roi,
  };
}

export function toTrendPoint(dto: TrendPointDto): TrendPoint {
  return { period: dto.period, total: Number(dto.total) };
}

export function toCategoryBreakdownItem(dto: CategoryBreakdownItemDto): CategoryBreakdownItem {
  return { category: dto.category, total: Number(dto.total), percentage: dto.percentage };
}
