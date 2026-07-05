/**
 * Typed category API (IMPL-FE-03, BR-03). The expense form's category dropdown
 * is populated from here — predefined + the user's custom categories — rather
 * than a hardcoded list. This also fixes a real breakage vs. the old UI, which
 * sent lowercase keys ("food") the new backend would reject; categories must
 * be sent by their exact name as returned here.
 */

import type { CategoryDto } from '../types/dto';
import type { Category } from '../types/domain';
import apiClient from './client';
import { toCategory } from './mappers';

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<CategoryDto[]>('/categories');
  return data.map(toCategory);
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await apiClient.post<CategoryDto>('/categories', { name });
  return toCategory(data);
}
