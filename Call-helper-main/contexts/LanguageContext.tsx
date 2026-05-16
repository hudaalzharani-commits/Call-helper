import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { type Locale, translate, type TranslationKey, type TranslateParams } from '../i18n/translations';

export type LayoutDir = 'rtl' | 'ltr';

interface LanguageContextValue {
  locale: Locale;
  dir: LayoutDir;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'rafiq_locale';

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ar';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'ar';
}

function layoutDirForLocale(locale: Locale): LayoutDir {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

function applyDocumentLocale(locale: Locale) {
  const dir = layoutDirForLocale(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitialLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => (current === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );

  const dir = layoutDirForLocale(locale);
  const isRtl = dir === 'rtl';

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      dir,
      isRtl,
      setLocale,
      toggleLocale,
      t,
    }),
    [locale, dir, isRtl, setLocale, toggleLocale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
