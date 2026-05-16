import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '../ui/utils';
import { DASH_CHART_HEIGHT, DASH_CHART_HEIGHT_TALL } from '../../utils/dashboardChartTheme';

type DashboardChartFrameProps = {
  children: ReactElement;
  height?: number;
  className?: string;
};

/** حاوية مخطط بارتفاع رقمي ثابت — Recharts لا يعمل مع height="100%" بشكل موثوق */
export function DashboardChartFrame({
  children,
  height = DASH_CHART_HEIGHT,
  className,
}: DashboardChartFrameProps) {
  const isTall = height >= DASH_CHART_HEIGHT_TALL;
  return (
    <div
      className={cn(
        'w-full min-w-0 mx-auto',
        isTall ? 'pt-2' : 'pt-0',
        className,
      )}
      style={{ height, minHeight: height }}
    >
      <ResponsiveContainer width="100%" height={height} debounce={1}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
