/**
 * Orders categories for dropdowns (BR-18): parents first (alphabetical), each
 * followed by its subcategories (indented). Both levels are selectable; the
 * indent visually distinguishes children from parents. Pure — unit-testable
 * without React.
 */

import type { Category } from '../types/domain';

export interface CategoryOption {
  id: string;
  /** The value submitted to the API — the exact category name. */
  name: string;
  /** Display label; subcategories are indented under their parent. */
  label: string;
  isChild: boolean;
}

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);

export function toCategoryOptions(categories: Category[]): CategoryOption[] {
  const parents = categories.filter((c) => c.parentId === null).sort(byName);
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (category.parentId !== null) {
      const siblings = childrenByParent.get(category.parentId) ?? [];
      siblings.push(category);
      childrenByParent.set(category.parentId, siblings);
    }
  }

  const options: CategoryOption[] = [];
  for (const parent of parents) {
    options.push({ id: parent.id, name: parent.name, label: parent.name, isChild: false });
    for (const child of (childrenByParent.get(parent.id) ?? []).sort(byName)) {
      options.push({
        id: child.id,
        name: child.name,
        label: `— ${child.name}`,
        isChild: true,
      });
    }
  }
  return options;
}
