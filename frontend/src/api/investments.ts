/** Typed investment API (IMPL-FE-04). snake_case DTO ↔ camelCase domain. */

import type { InvestmentCreateDto, InvestmentDto, PageDto } from '../types/dto';
import type { Investment, InvestmentFilters } from '../types/domain';
import apiClient from './client';
import { toInvestment } from './mappers';

const MAX_PAGE_SIZE = 100;

export interface InvestmentInput {
  name: string;
  type: string;
  amount: number;
  currentValue: number;
  purchaseDate: string;
  notes?: string | null;
}

function toCreateDto(input: InvestmentInput): InvestmentCreateDto {
  return {
    name: input.name,
    type: input.type,
    amount: input.amount,
    current_value: input.currentValue,
    purchase_date: input.purchaseDate,
    notes: input.notes ?? null,
  };
}

export async function listInvestments(filters: InvestmentFilters = {}): Promise<Investment[]> {
  const { data } = await apiClient.get<PageDto<InvestmentDto>>('/investments', {
    params: {
      type: filters.type,
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      page_size: MAX_PAGE_SIZE,
    },
  });
  return data.items.map(toInvestment);
}

export async function createInvestment(input: InvestmentInput): Promise<Investment> {
  const { data } = await apiClient.post<InvestmentDto>('/investments', toCreateDto(input));
  return toInvestment(data);
}

export async function updateInvestment(
  id: string,
  input: Partial<InvestmentInput>
): Promise<Investment> {
  // Map only the provided fields to their snake_case wire names.
  const body: Partial<InvestmentCreateDto> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.type !== undefined) body.type = input.type;
  if (input.amount !== undefined) body.amount = input.amount;
  if (input.currentValue !== undefined) body.current_value = input.currentValue;
  if (input.purchaseDate !== undefined) body.purchase_date = input.purchaseDate;
  if (input.notes !== undefined) body.notes = input.notes;

  const { data } = await apiClient.put<InvestmentDto>(`/investments/${id}`, body);
  return toInvestment(data);
}

export async function deleteInvestment(id: string): Promise<void> {
  await apiClient.delete(`/investments/${id}`);
}
