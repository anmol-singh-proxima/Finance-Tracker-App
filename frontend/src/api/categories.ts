/**
 * Typed category API (IMPL-FE-10, BR-03/BR-18). Category dropdowns across the
 * app are populated from here — predefined + the user's custom categories,
 * scoped by type — rather than a hardcoded list. Categories are referenced by
 * their exact name as returned here.
 */

import type { CategoryCreateDto, CategoryDto, CategoryUpdateDto } from '../types/dto';
import type { Category, CategoryInput, CategoryType } from '../types/domain';
import apiClient from './client';
import { toCategory } from './mappers';

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  const { data } = await apiClient.get<CategoryDto[]>('/categories', { params: { type } });
  return data.map(toCategory);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const payload: CategoryCreateDto = {
    name: input.name,
    type: input.type,
    parent_id: input.parentId,
  };
  const { data } = await apiClient.post<CategoryDto>('/categories', payload);
  return toCategory(data);
}

export async function updateCategory(
  id: string,
  input: { name?: string; parentId?: string | null }
): Promise<Category> {
  const payload: CategoryUpdateDto = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.parentId !== undefined) payload.parent_id = input.parentId;
  const { data } = await apiClient.put<CategoryDto>(`/categories/${id}`, payload);
  return toCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
