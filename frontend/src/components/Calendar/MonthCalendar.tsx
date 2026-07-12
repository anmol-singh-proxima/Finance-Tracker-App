import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import {
  WEEKDAY_LABELS,
  formatDayLabel,
  monthGrid,
  type CalendarDay,
  type DaySummary,
} from '../../utils/calendar';
import './MonthCalendar.css';

/**
 * Month-view calendar of expenses (IMPL-FE-09, BR-16). Purely presentational:
 * receives the month's expenses already grouped by day and reports View/Edit
 * intents up to the page, which owns data loading and dialog state.
 *
 * Future dates are disabled (BR-16): visually muted, no hover affordance, no
 * View/Edit actions, and skipped by keyboard navigation.
 *
 * Responsive behavior: on larger screens each day cell shows totals, a short
 * preview, and explicit View/Edit buttons. On small screens the previews and
 * buttons give way to a full-cell tap target (min 44px) that opens the View
 * dialog, from which editing remains reachable.
 */
interface Props {
  year: number;
  monthIndex: number;
  byDate: Map<string, DaySummary>;
  todayIso: string;
  onView: (date: string) => void;
  onEdit: (date: string) => void;
}

const PREVIEW_LIMIT = 2;

function DayCell({
  day,
  summary,
  isToday,
  isFuture,
  onView,
  onEdit,
}: {
  day: CalendarDay;
  summary: DaySummary | undefined;
  isToday: boolean;
  isFuture: boolean;
  onView: (date: string) => void;
  onEdit: (date: string) => void;
}) {
  const formatMoney = useCurrencyFormatter();
  const count = summary?.expenses.length ?? 0;
  const dayLabel = formatDayLabel(day.date);

  if (isFuture) {
    return (
      <div className="cal-cell is-future" aria-disabled="true">
        <div className="cal-cell-head">
          <span className="cal-date" aria-hidden="true">
            {day.dayOfMonth}
          </span>
        </div>
      </div>
    );
  }

  const summaryLabel =
    count === 0
      ? 'no expenses'
      : `${count} expense${count === 1 ? '' : 's'}, ${formatMoney(summary!.total)}`;

  return (
    <div className={`cal-cell${isToday ? ' is-today' : ''}${count > 0 ? ' has-expenses' : ''}`}>
      {/* Mobile-only full-cell tap target; hidden (and untabbable) on larger screens. */}
      <button
        type="button"
        className="cal-cell-tap"
        aria-label={`${dayLabel}: ${summaryLabel}. View details`}
        onClick={() => onView(day.date)}
      />

      <div className="cal-cell-head">
        <span className="cal-date" aria-hidden="true">
          {day.dayOfMonth}
        </span>
        {count > 0 && (
          <span className="cal-count" aria-hidden="true">
            {count}
          </span>
        )}
      </div>

      {count > 0 && (
        <span className="cal-total" aria-hidden="true">
          {formatMoney(summary!.total)}
        </span>
      )}

      {count > 0 && (
        <ul className="cal-preview" aria-hidden="true">
          {summary!.expenses.slice(0, PREVIEW_LIMIT).map((expense) => (
            <li key={expense.id}>{expense.description || expense.category}</li>
          ))}
          {count > PREVIEW_LIMIT && (
            <li className="cal-preview-more">+{count - PREVIEW_LIMIT} more</li>
          )}
        </ul>
      )}

      <div className="cal-actions">
        <button
          type="button"
          className="cal-action"
          aria-label={`View expenses for ${dayLabel} (${summaryLabel})`}
          onClick={() => onView(day.date)}
        >
          View
        </button>
        <button
          type="button"
          className="cal-action"
          aria-label={`Edit expenses for ${dayLabel}`}
          onClick={() => onEdit(day.date)}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

export default function MonthCalendar({
  year,
  monthIndex,
  byDate,
  todayIso,
  onView,
  onEdit,
}: Props) {
  const weeks = monthGrid(year, monthIndex);

  return (
    <div className="month-calendar">
      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="cal-weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {weeks
          .flat()
          .map((cell, index) =>
            cell ? (
              <DayCell
                key={cell.date}
                day={cell}
                summary={byDate.get(cell.date)}
                isToday={cell.date === todayIso}
                isFuture={cell.date > todayIso}
                onView={onView}
                onEdit={onEdit}
              />
            ) : (
              <div key={`blank-${index}`} className="cal-cell is-blank" aria-hidden="true" />
            )
          )}
      </div>
    </div>
  );
}
