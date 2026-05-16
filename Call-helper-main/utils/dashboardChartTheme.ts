/** ارتفاع افتراضي لحاوية Recharts (يجب أن يكون رقماً وليس نسبة مئوية) */
export const DASH_CHART_HEIGHT = 340;
export const DASH_CHART_HEIGHT_TALL = 420;

/** ألوان وإعدادات مشتركة لمخططات الداشبورد (Recharts) */
export const DASH_CHART = {
  primary: 'var(--chart-bar-primary)',
  accent: 'var(--chart-bar-accent)',
  muted: 'var(--chart-bar-muted)',
  grid: 'var(--chart-grid)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  barRadius: [14, 14, 0, 0] as [number, number, number, number],
  barRadiusSm: [10, 10, 0, 0] as [number, number, number, number],
};

export type ChartColorTokens = {
  primary: string;
  accent: string;
  muted: string;
};

/** تناوب أعمدة: أساسي → ذهبي → مخطط شفاف */
export function dashBarFill(index: number, colors: ChartColorTokens): string {
  const mod = index % 3;
  if (mod === 0) return colors.primary;
  if (mod === 1) return colors.accent;
  return colors.muted;
}

export function chartPalette(colors: ChartColorTokens): string[] {
  return [colors.primary, colors.accent, '#C4B5FD', '#FCD34D', colors.muted];
}

export function dashAxisTickFrom(colors: { mutedForeground: string }) {
  return { fill: colors.mutedForeground, fontSize: 12 };
}

export function dashAxisLineFrom(colors: { grid: string }) {
  return { stroke: colors.grid };
}

export const dashTooltipStyle: Record<string, string | number> = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  color: 'var(--popover-foreground)',
  boxShadow: 'var(--shadow-lg)',
  fontSize: '12px',
};

export const dashAxisTick = {
  fill: 'var(--muted-foreground)',
  fontSize: 12,
};

export const dashAxisLine = {
  stroke: 'var(--chart-grid)',
};

export const DASH_Y_AXIS_WIDTH = 44;
const DASH_CHART_GUTTER = 40;

export type DashMarginOptions = {
  top?: number;
  bottom?: number;
  gutter?: number;
  yAxisWidth?: number;
};

/** هوامش متساوية — يُستخدم مع محور Y وهمي يسار + محور القيم يمين */
export function dashCartesianMarginCentered(opts: DashMarginOptions = {}) {
  const gutter = opts.gutter ?? DASH_CHART_GUTTER;
  return {
    top: opts.top ?? 12,
    left: gutter,
    right: gutter,
    bottom: opts.bottom ?? 12,
  };
}

export const DASH_CARTESIAN_MARGIN = dashCartesianMarginCentered();
export const DASH_CARTESIAN_MARGIN_COMPACT = dashCartesianMarginCentered();
export const DASH_CATEGORY_BAR_MARGIN = dashCartesianMarginCentered({
  top: 80,
  bottom: 108,
});

/** يحجز عرضاً يسار الرسم لموازنة محور القيم على اليمين */
export const DASH_Y_AXIS_SPACER = {
  orientation: 'left' as const,
  tick: false,
  axisLine: false,
  tickLine: false,
};
export const DASH_HORIZONTAL_BAR_MARGIN = {
  top: 24,
  right: 40,
  left: 40,
  bottom: 24,
} as const;

export const DASH_Y_AXIS_RTL = {
  orientation: 'right' as const,
  width: DASH_Y_AXIS_WIDTH,
  allowDecimals: false,
};

export const CHART_PALETTE = [
  DASH_CHART.primary,
  DASH_CHART.accent,
  '#C4B5FD',
  '#FCD34D',
  DASH_CHART.muted,
];
