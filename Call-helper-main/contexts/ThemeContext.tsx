import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   Theme + accent-palette state.
   • Theme is light/dark.
   • Accent palette swaps the brand's --primary / --primary-hover /
     --primary-foreground / --primary-soft / --ring / --ai variables on
     :root so that buttons, active nav, focus rings, glow, etc. follow the
     selected palette automatically.
   • Semantic status colors (success / warning / danger / info) are NEVER
     touched.
   • Persisted to localStorage only — nothing goes to backend/api.
   ───────────────────────────────────────────────────────────────────── */

type Theme = 'dark' | 'light';

export type AccentId =
  | 'ember'
  | 'olive'
  | 'electric'
  | 'violet'
  | 'sand'
  | 'slate'
  | 'rose-copper';

export interface AccentPalette {
  id:    AccentId;
  name:  string;
  /** small swatch shown in the picker */
  swatch: string;
  /** dark-mode palette: warm/saturated accents on charcoal */
  dark: {
    primary: string;
    primaryHover: string;
    primaryForeground: string;
    primarySoft: string;
    ring: string;
    ai: string;
    aiForeground: string;
    aiSoft: string;
    shadowGlow: string;
  };
  /** light-mode palette: deeper variants for AA contrast on cream */
  light: {
    primary: string;
    primaryHover: string;
    primaryForeground: string;
    primarySoft: string;
    ring: string;
    ai: string;
    aiForeground: string;
    aiSoft: string;
    shadowGlow: string;
  };
}

export const ACCENT_PALETTES: AccentPalette[] = [
  {
    id: 'ember', name: 'Ember Orange', swatch: '#E45437',
    dark:  { primary: '#E45437', primaryHover: '#F0613F', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(228, 84, 55, 0.14)', ring: '#E45437',
             ai: '#F0A954', aiForeground: '#18181B', aiSoft: 'rgba(240, 169, 84, 0.14)',
             shadowGlow: '0 0 0 1px rgba(228, 84, 55, 0.22), 0 8px 32px rgba(228, 84, 55, 0.20)' },
    light: { primary: '#D43E20', primaryHover: '#C13619', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(212, 62, 32, 0.10)', ring: '#D43E20',
             ai: '#C97A1F', aiForeground: '#FFFFFF', aiSoft: 'rgba(201, 122, 31, 0.10)',
             shadowGlow: '0 0 0 1px rgba(212, 62, 32, 0.16), 0 8px 24px rgba(212, 62, 32, 0.18)' },
  },
  {
    id: 'olive', name: 'Olive Green', swatch: '#7C9A3D',
    dark:  { primary: '#9CB85B', primaryHover: '#A9C66A', primaryForeground: '#0E0E10',
             primarySoft: 'rgba(156, 184, 91, 0.14)', ring: '#9CB85B',
             ai: '#D9C97A', aiForeground: '#18181B', aiSoft: 'rgba(217, 201, 122, 0.14)',
             shadowGlow: '0 0 0 1px rgba(156, 184, 91, 0.22), 0 8px 32px rgba(156, 184, 91, 0.20)' },
    light: { primary: '#637D2F', primaryHover: '#516A24', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(99, 125, 47, 0.10)', ring: '#637D2F',
             ai: '#9C8332', aiForeground: '#FFFFFF', aiSoft: 'rgba(156, 131, 50, 0.10)',
             shadowGlow: '0 0 0 1px rgba(99, 125, 47, 0.16), 0 8px 24px rgba(99, 125, 47, 0.18)' },
  },
  {
    id: 'electric', name: 'Electric Blue', swatch: '#4D7CFF',
    dark:  { primary: '#5E8AFF', primaryHover: '#7099FF', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(94, 138, 255, 0.14)', ring: '#5E8AFF',
             ai: '#7CC0FF', aiForeground: '#0E0E10', aiSoft: 'rgba(124, 192, 255, 0.14)',
             shadowGlow: '0 0 0 1px rgba(94, 138, 255, 0.22), 0 8px 32px rgba(94, 138, 255, 0.20)' },
    light: { primary: '#2D5BD9', primaryHover: '#244BB8', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(45, 91, 217, 0.10)', ring: '#2D5BD9',
             ai: '#1E81C7', aiForeground: '#FFFFFF', aiSoft: 'rgba(30, 129, 199, 0.10)',
             shadowGlow: '0 0 0 1px rgba(45, 91, 217, 0.16), 0 8px 24px rgba(45, 91, 217, 0.18)' },
  },
  {
    id: 'violet', name: 'Violet', swatch: '#8B5CF6',
    dark:  { primary: '#A78BFA', primaryHover: '#B79CFB', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(167, 139, 250, 0.14)', ring: '#A78BFA',
             ai: '#E9A8FB', aiForeground: '#18181B', aiSoft: 'rgba(233, 168, 251, 0.14)',
             shadowGlow: '0 0 0 1px rgba(167, 139, 250, 0.22), 0 8px 32px rgba(167, 139, 250, 0.22)' },
    light: { primary: '#7C3AED', primaryHover: '#6B27D6', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(124, 58, 237, 0.10)', ring: '#7C3AED',
             ai: '#A855B5', aiForeground: '#FFFFFF', aiSoft: 'rgba(168, 85, 181, 0.10)',
             shadowGlow: '0 0 0 1px rgba(124, 58, 237, 0.16), 0 8px 24px rgba(124, 58, 237, 0.18)' },
  },
  {
    id: 'sand', name: 'Sand Gold', swatch: '#D4A256',
    dark:  { primary: '#E2B36A', primaryHover: '#EBC080', primaryForeground: '#18181B',
             primarySoft: 'rgba(226, 179, 106, 0.14)', ring: '#E2B36A',
             ai: '#F0D08F', aiForeground: '#18181B', aiSoft: 'rgba(240, 208, 143, 0.14)',
             shadowGlow: '0 0 0 1px rgba(226, 179, 106, 0.22), 0 8px 32px rgba(226, 179, 106, 0.20)' },
    light: { primary: '#A87224', primaryHover: '#8E5E18', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(168, 114, 36, 0.10)', ring: '#A87224',
             ai: '#7C5C18', aiForeground: '#FFFFFF', aiSoft: 'rgba(124, 92, 24, 0.10)',
             shadowGlow: '0 0 0 1px rgba(168, 114, 36, 0.16), 0 8px 24px rgba(168, 114, 36, 0.18)' },
  },
  {
    id: 'slate', name: 'Slate Blue', swatch: '#5C7A99',
    dark:  { primary: '#7A95B5', primaryHover: '#8AA3C2', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(122, 149, 181, 0.14)', ring: '#7A95B5',
             ai: '#9DB3CD', aiForeground: '#0E0E10', aiSoft: 'rgba(157, 179, 205, 0.14)',
             shadowGlow: '0 0 0 1px rgba(122, 149, 181, 0.22), 0 8px 32px rgba(122, 149, 181, 0.18)' },
    light: { primary: '#3F5F80', primaryHover: '#324E69', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(63, 95, 128, 0.10)', ring: '#3F5F80',
             ai: '#576B82', aiForeground: '#FFFFFF', aiSoft: 'rgba(87, 107, 130, 0.10)',
             shadowGlow: '0 0 0 1px rgba(63, 95, 128, 0.16), 0 8px 24px rgba(63, 95, 128, 0.18)' },
  },
  {
    id: 'rose-copper', name: 'Rose Copper', swatch: '#C97564',
    dark:  { primary: '#D78878', primaryHover: '#E29A8B', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(215, 136, 120, 0.14)', ring: '#D78878',
             ai: '#E9B79E', aiForeground: '#18181B', aiSoft: 'rgba(233, 183, 158, 0.14)',
             shadowGlow: '0 0 0 1px rgba(215, 136, 120, 0.22), 0 8px 32px rgba(215, 136, 120, 0.20)' },
    light: { primary: '#A85240', primaryHover: '#8F4334', primaryForeground: '#FFFFFF',
             primarySoft: 'rgba(168, 82, 64, 0.10)', ring: '#A85240',
             ai: '#A06640', aiForeground: '#FFFFFF', aiSoft: 'rgba(160, 102, 64, 0.10)',
             shadowGlow: '0 0 0 1px rgba(168, 82, 64, 0.16), 0 8px 24px rgba(168, 82, 64, 0.18)' },
  },
];

const ACCENT_BY_ID = Object.fromEntries(ACCENT_PALETTES.map(p => [p.id, p])) as Record<AccentId, AccentPalette>;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  /** accent palette controls */
  accent: AccentId;
  setAccent: (id: AccentId) => void;
  palettes: AccentPalette[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY  = 'rafiq_theme';
const ACCENT_KEY = 'rafiq_accent';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function readInitialAccent(): AccentId {
  if (typeof window === 'undefined') return 'ember';
  try {
    const saved = localStorage.getItem(ACCENT_KEY) as AccentId | null;
    if (saved && saved in ACCENT_BY_ID) return saved;
  } catch { /* ignore */ }
  return 'ember';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = theme;
}

function applyAccent(accent: AccentId, theme: Theme) {
  const palette = ACCENT_BY_ID[accent];
  if (!palette) return;
  const v = theme === 'dark' ? palette.dark : palette.light;
  const root = document.documentElement;
  root.style.setProperty('--primary',            v.primary);
  root.style.setProperty('--primary-hover',      v.primaryHover);
  root.style.setProperty('--primary-foreground', v.primaryForeground);
  root.style.setProperty('--primary-soft',       v.primarySoft);
  root.style.setProperty('--ring',               v.ring);
  root.style.setProperty('--ai',                 v.ai);
  root.style.setProperty('--ai-foreground',      v.aiForeground);
  root.style.setProperty('--ai-soft',            v.aiSoft);
  root.style.setProperty('--shadow-glow',        v.shadowGlow);
  /* Also retint chart-1 to keep accent-driven charts coherent.
     Other chart slots remain untouched so multi-series charts stay
     readable and semantic colors elsewhere are preserved. */
  root.style.setProperty('--chart-1',            v.primary);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]   = useState<Theme>(() => readInitialTheme());
  const [accent, setAccentState] = useState<AccentId>(() => readInitialAccent());

  /* Apply theme on mount & change */
  useEffect(() => {
    applyTheme(theme);
    applyAccent(accent, theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme, accent]);

  /* Persist accent */
  useEffect(() => {
    try { localStorage.setItem(ACCENT_KEY, accent); } catch { /* ignore */ }
  }, [accent]);

  const toggle = useCallback(() => {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme  = useCallback((t: Theme) => setThemeState(t), []);
  const setAccent = useCallback((id: AccentId) => setAccentState(id), []);

  return (
    <ThemeContext.Provider value={{
      theme, isDark: theme === 'dark', toggle, setTheme,
      accent, setAccent, palettes: ACCENT_PALETTES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
