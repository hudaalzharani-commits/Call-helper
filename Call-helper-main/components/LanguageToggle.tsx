import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageToggleProps {
  className?: string;
  size?: 'sm' | 'default';
}

export function LanguageToggle({ className = '', size = 'default' }: LanguageToggleProps) {
  const { locale, toggleLocale, t } = useLanguage();
  const dim = size === 'sm' ? 'size-8' : 'size-9';
  const icon = size === 'sm' ? 'size-3.5' : 'size-4';
  const label = locale === 'ar' ? t('lang.switchToEnglish') : t('lang.switchToArabic');

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={label}
      title={label}
      className={[
        dim,
        'inline-flex items-center justify-center gap-1 rounded-full',
        'border border-border bg-surface text-foreground',
        'hover:bg-surface-2 transition-colors text-[11px] font-semibold tracking-wide',
        className,
      ].join(' ')}
    >
      <Languages className={`${icon} shrink-0 text-[var(--ai)]`} strokeWidth={2} aria-hidden />
      <span className="hidden sm:inline">{locale === 'ar' ? 'EN' : 'AR'}</span>
    </button>
  );
}
