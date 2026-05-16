import { Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../ui/utils';

type Trend = 'up' | 'down' | 'neutral';

type DashboardKpiCardProps = {
  label: string;
  value: string;
  change?: string;
  trend?: Trend;
  active?: boolean;
  onClick?: () => void;
};

export function DashboardKpiCard({
  label,
  value,
  change,
  trend = 'neutral',
  active,
  onClick,
}: DashboardKpiCardProps) {
  const className = cn(
    'dash-kpi w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    active && 'dash-kpi--active',
  );

  const body = (
    <>
      <div className="relative z-[1] flex items-start justify-between gap-3 mb-3">
        <p className="dash-kpi__label">{label}</p>
        {trend === 'up' && <TrendingUp className="size-4 shrink-0 text-[var(--success)]" />}
        {trend === 'down' && <TrendingDown className="size-4 shrink-0 text-[var(--danger)]" />}
        {trend === 'neutral' && <Clock className="size-4 shrink-0 text-muted-foreground" />}
      </div>
      <p className="dash-kpi__value">{value}</p>
      {change ? (
        <p
          className={cn(
            'dash-kpi__delta mt-2 inline-block',
            trend === 'up' && 'dash-kpi__delta--up',
            trend === 'down' && 'dash-kpi__delta--down',
          )}
        >
          {change}
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
