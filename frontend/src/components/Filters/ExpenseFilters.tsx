import type { Category, ExpenseFilters } from '../../types/domain';
import './Filters.css';

/**
 * Date-range + category filter controls for the expenses list (BR-10). Purely
 * presentational: it reports filter changes up; the page owns the state and
 * re-fetches. Categories come from the API (BR-03), not a hardcoded list.
 */
interface Props {
  categories: Category[];
  value: ExpenseFilters;
  onChange: (next: ExpenseFilters) => void;
}

export default function ExpenseFiltersBar({ categories, value, onChange }: Props) {
  return (
    <div className="filters-bar">
      <div className="filter-field">
        <label htmlFor="filter-category">Category</label>
        <select
          id="filter-category"
          value={value.category ?? ''}
          onChange={(e) => onChange({ ...value, category: e.target.value || undefined })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="filter-date-from">From</label>
        <input
          id="filter-date-from"
          type="date"
          value={value.dateFrom ?? ''}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value || undefined })}
        />
      </div>

      <div className="filter-field">
        <label htmlFor="filter-date-to">To</label>
        <input
          id="filter-date-to"
          type="date"
          value={value.dateTo ?? ''}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
        />
      </div>

      <button type="button" className="filter-clear" onClick={() => onChange({})}>
        Clear
      </button>
    </div>
  );
}
