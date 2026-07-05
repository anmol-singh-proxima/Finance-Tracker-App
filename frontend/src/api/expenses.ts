/** Typed expense API (IMPL-FE-03). Maps the wire DTO to the domain model. */

import type { ExpenseCreateDto, ExpenseDto, PageDto } from '../types/dto';
import type { Expense, ExpenseFilters } from '../types/domain';
import apiClient from './client';
import { toExpense } from './mappers';

// Request the max page size the backend allows; a paginated list UI is a
// future enhancement (BR-10 filters are wired below), so for now we show the
// most recent page of results.
const MAX_PAGE_SIZE = 100;

export interface ExpenseInput {
  category: string;
  amount: number;
  date?: string;
  description?: string | null;
}

function toCreateDto(input: ExpenseInput): ExpenseCreateDto {
  return {
    category: input.category,
    amount: input.amount,
    date: input.date,
    description: input.description ?? null,
  };
}

export async function listExpenses(filters: ExpenseFilters = {}): Promise<Expense[]> {
  const { data } = await apiClient.get<PageDto<ExpenseDto>>('/expenses', {
    params: {
      category: filters.category,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      page_size: MAX_PAGE_SIZE,
    },
  });
  return data.items.map(toExpense);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data } = await apiClient.post<ExpenseDto>('/expenses', toCreateDto(input));
  return toExpense(data);
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const { data } = await apiClient.put<ExpenseDto>(`/expenses/${id}`, input);
  return toExpense(data);
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
