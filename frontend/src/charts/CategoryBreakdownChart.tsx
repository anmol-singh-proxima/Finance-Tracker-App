import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CategoryBreakdownItem } from '../types/domain';
import { formatCurrency } from '../utils/format';

// A small fixed palette; categories cycle through it.
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

/**
 * Category-wise spending breakdown for the current period (BR-09) — shows which
 * categories consume the most money. Aggregated server-side.
 */
export default function CategoryBreakdownChart({ items }: { items: CategoryBreakdownItem[] }) {
  if (items.length === 0) {
    return <p className="empty-state">No spending in this period yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={items} dataKey="total" nameKey="category" outerRadius={100} label>
          {items.map((item, index) => (
            <Cell key={item.category} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
