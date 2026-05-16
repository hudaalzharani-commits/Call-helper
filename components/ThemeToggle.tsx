import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'default';
}

export function ThemeToggle({ className = '', size = 'default' }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();
  const dim = size === 'sm' ? 'size-8' : 'size-9';
  const icon = size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        dim,
        'inline-flex items-center justify-center rounded-full',
        'border border-border bg-surface text-foreground',
        'hover:bg-surface-2 transition-colors',
        className,
      ].join(' ')}
    >
      {isDark
        ? <Sun  className={`${icon} text-[var(--ai)]`} strokeWidth={2} />
        : <Moon className={`${icon} text-[var(--primary)]`} strokeWidth={2} />}
    </button>
  );
}
