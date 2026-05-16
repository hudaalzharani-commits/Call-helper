import { useMemo } from 'react';
import { ACCENT_PALETTES, type AccentId, useTheme } from '../contexts/ThemeContext';

export type DashboardChartColors = {
  primary: string;
  accent: string;
  muted: string;
  grid: string;
  foreground: string;
  mutedForeground: string;
};

/** ألوان ثابتة من لوحة الثيم — بدون قراءة DOM (تجنّب اختفاء المخطط بعد أول render) */
export function useDashboardChartColors(): DashboardChartColors {
  const { isDark, accent } = useTheme();

  return useMemo(() => {
    const palette =
      ACCENT_PALETTES.find((p) => p.id === accent) ?? ACCENT_PALETTES[0];
    const v = isDark ? palette.dark : palette.light;

    return {
      primary: v.primary,
      accent: v.ai,
      muted: isDark ? 'rgba(244, 239, 232, 0.22)' : 'rgba(20, 16, 12, 0.2)',
      grid: isDark ? 'rgba(244, 239, 232, 0.14)' : 'rgba(20, 16, 12, 0.12)',
      foreground: isDark ? '#F4EFE8' : '#14110D',
      mutedForeground: isDark ? '#A8A29E' : '#78716C',
    };
  }, [isDark, accent]);
}

export function chartColorsForAccent(
  isDark: boolean,
  accentId: AccentId,
): DashboardChartColors {
  const palette =
    ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];
  const v = isDark ? palette.dark : palette.light;
  return {
    primary: v.primary,
    accent: v.ai,
    muted: isDark ? 'rgba(244, 239, 232, 0.22)' : 'rgba(20, 16, 12, 0.2)',
    grid: isDark ? 'rgba(244, 239, 232, 0.14)' : 'rgba(20, 16, 12, 0.12)',
    foreground: isDark ? '#F4EFE8' : '#14110D',
    mutedForeground: isDark ? '#A8A29E' : '#78716C',
  };
}
