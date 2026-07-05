/**
 * Typed dashboard API (IMPL-FE-05/06). Summary (BR-07), spending trend over
 * time (BR-08), and category breakdown (BR-09). All aggregation happens
 * server-side (TR-PERF-05); the UI just renders what these return.
 */

import type { BreakdownResponseDto, DashboardSummaryDto, TrendResponseDto } from '../types/dto';
import type { CategoryBreakdownItem, DashboardSummary, TrendPoint } from '../types/domain';
import apiClient from './client';
import { toCategoryBreakdownItem, toDashboardSummary, toTrendPoint } from './mappers';

export type DashboardPeriod = 'month' | 'year' | 'all';

export async function getSummary(period: DashboardPeriod = 'month'): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummaryDto>('/dashboard/summary', {
    params: { period },
  });
  return toDashboardSummary(data);
}

export async function getTrends(months = 6): Promise<TrendPoint[]> {
  const { data } = await apiClient.get<TrendResponseDto>('/dashboard/trends', {
    params: { months },
  });
  return data.points.map(toTrendPoint);
}

export async function getBreakdown(): Promise<CategoryBreakdownItem[]> {
  const { data } = await apiClient.get<BreakdownResponseDto>('/dashboard/breakdown');
  return data.items.map(toCategoryBreakdownItem);
}
