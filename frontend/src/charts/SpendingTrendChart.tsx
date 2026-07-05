import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { TrendPoint } from '../types/domain';
import { formatCurrency } from '../utils/format';

/**
 * Month-over-month spending trend (BR-08) — lets a user see at a glance whether
 * they're spending more or less over time. Data is aggregated server-side.
 */
export default function SpendingTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="empty-state">Not enough data to show a trend yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Bar dataKey="total" name="Spending" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
