import type { Category } from '../../types/domain';
import './Filters.css';

/**
 * Category filter for the expense calendar (BR-10, IMPL-FE-07). Purely
 * presentational: it reports the selection up; the page owns the state and
 * re-fetches. The date-range dimension of BR-10 is provided by the calendar's
 * month navigation. Categories come from the API (BR-03), not a hardcoded list.
 */
interface Props {
  categories: Category[];
  value: string | undefined;
  onChange: (category: string | undefined) => void;
}

export default function ExpenseCategoryFilter({ categories, value, onChange }: Props) {
  return (
    <div className="filter-field">
      <label htmlFor="filter-category">Category</label>
      <select
        id="filter-category"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
