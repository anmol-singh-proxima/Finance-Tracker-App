import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import type { TrendPoint } from '../types/domain';
import { CHART_PRIMARY } from './palette';

/**
 * Month-over-month spending trend (BR-08) — lets a user see at a glance whether
 * they're spending more or less over time. Data is aggregated server-side.
 */
export default function SpendingTrendChart({ points }: { points: TrendPoint[] }) {
  const formatMoney = useCurrencyFormatter();

  if (points.length === 0) {
    return <p className="empty-state">Not enough data to show a trend yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(value: number) => formatMoney(value)} />
        <Bar dataKey="total" name="Spending" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
