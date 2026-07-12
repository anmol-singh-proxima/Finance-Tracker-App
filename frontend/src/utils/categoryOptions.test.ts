import { describe, expect, it } from 'vitest';

import type { Category } from '../types/domain';
import { toCategoryOptions } from './categoryOptions';

const category = (id: string, name: string, parentId: string | null = null): Category => ({
  id,
  name,
  type: 'expense',
  parentId,
  isPredefined: false,
  createdAt: '2026-07-01T00:00:00Z',
  linkedRecords: 0,
});

describe('toCategoryOptions', () => {
  it('orders parents alphabetically with their children indented beneath them', () => {
    const options = toCategoryOptions([
      category('u', 'Utilities'),
      category('f', 'Food'),
      category('w', 'Water Bill', 'u'),
      category('e', 'Electricity Bill', 'u'),
      category('l', 'Lunch', 'f'),
    ]);
    expect(options.map((o) => o.label)).toEqual([
      'Food',
      '— Lunch',
      'Utilities',
      '— Electricity Bill',
      '— Water Bill',
    ]);
    // The submitted value is always the raw name, never the indented label.
    expect(options.map((o) => o.name)).toEqual([
      'Food',
      'Lunch',
      'Utilities',
      'Electricity Bill',
      'Water Bill',
    ]);
  });

  it('handles a flat list with no hierarchy', () => {
    const options = toCategoryOptions([category('b', 'B'), category('a', 'A')]);
    expect(options.map((o) => o.label)).toEqual(['A', 'B']);
    expect(options.every((o) => !o.isChild)).toBe(true);
  });

  it('returns empty for no categories', () => {
    expect(toCategoryOptions([])).toEqual([]);
  });
});
