/**
 * DTOs — the exact shapes the FastAPI backend sends/accepts over the wire.
 *
 * Two things differ from what the UI wants to work with, and are normalised
 * away by the mappers in src/api/* :
 *  - money fields arrive as JSON *strings* (Pydantic serialises Decimal as a
 *    string to avoid float precision loss), e.g. "12.50" — the domain types
 *    use `number`.
 *  - field names are snake_case; the domain types use camelCase.
 *
 * Keep these in lock-step with backend/app/schemas/*.py.
 */

export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExpenseDto {
  id: string;
  category: string;
  amount: string; // Decimal-as-string
  date: string; // ISO date
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCreateDto {
  category: string;
  amount: number;
  date?: string;
  description?: string | null;
}

export interface InvestmentDto {
  id: string;
  name: string;
  type: string;
  amount: string;
  current_value: string;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentCreateDto {
  name: string;
  type: string;
  amount: number;
  current_value: number;
  purchase_date: string;
  notes?: string | null;
}

export interface CategoryDto {
  id: string;
  name: string;
  is_predefined: boolean;
}

export interface DashboardSummaryDto {
  total_expenses_this_period: string;
  total_invested: string;
  total_current_value: string;
  total_returns: string;
  net_worth: string;
  expense_count: number;
  investment_count: number;
  roi: number;
}

export interface TrendPointDto {
  period: string;
  total: string;
}

export interface TrendResponseDto {
  points: TrendPointDto[];
}

export interface CategoryBreakdownItemDto {
  category: string;
  total: string;
  percentage: number;
}

export interface BreakdownResponseDto {
  items: CategoryBreakdownItemDto[];
}
