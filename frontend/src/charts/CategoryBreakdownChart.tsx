import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import type { CategoryBreakdownItem } from '../types/domain';
import { CHART_SERIES } from './palette';

/**
 * Category-wise spending breakdown for the current period (BR-09) — shows which
 * categories consume the most money. Aggregated server-side.
 */
export default function CategoryBreakdownChart({ items }: { items: CategoryBreakdownItem[] }) {
  const formatMoney = useCurrencyFormatter();

  if (items.length === 0) {
    return <p className="empty-state">No spending in this period yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={items} dataKey="total" nameKey="category" outerRadius={100} label>
          {items.map((item, index) => (
            <Cell key={item.category} fill={CHART_SERIES[index % CHART_SERIES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatMoney(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
