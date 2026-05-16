import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/* Compact accent-palette picker.
   Frontend-only — selection persists via ThemeContext → localStorage.
   Does NOT change semantic status colors (success/warning/danger/info). */
export function AccentPalettePicker() {
  const { accent, setAccent, palettes, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Close on outside click / Esc */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="اختيار لون التمييز"
        aria-expanded={open}
        className="size-9 rounded-full inline-flex items-center justify-center border border-border bg-surface hover:bg-surface-2 transition-colors"
      >
        <Palette className="size-4" style={{ color: 'var(--primary)' }} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Accent palette"
          className="absolute end-0 top-[calc(100%+8px)] w-72 z-50 scale-in"
          style={{
            background: 'var(--popover)',
            color: 'var(--popover-foreground)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
            padding: 8,
          }}
        >
          <div className="px-2.5 pt-2 pb-1">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase"
               style={{ color: 'var(--muted-strong)' }}>
              لوحة الألوان
            </p>
            <p className="text-[11px] mt-0.5 text-right" style={{ color: 'var(--muted-foreground)' }}>
              يؤثر على الأزرار والتنقل النشط وحلقات التركيز.
            </p>
          </div>

          <div className="mt-1 flex flex-col gap-0.5">
            {palettes.map(p => {
              const selected = p.id === accent;
              const swatchColor = isDark ? p.dark.primary : p.light.primary;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setAccent(p.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left"
                  style={{
                    background: selected ? 'var(--surface-2)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span
                    aria-hidden
                    className="shrink-0 size-7 rounded-lg"
                    style={{
                      background: swatchColor,
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.10)',
                    }}
                  />
                  <span className="flex-1 text-sm font-medium"
                        style={{ color: 'var(--foreground)' }}>
                    {p.name}
                  </span>
                  {selected && (
                    <Check className="size-4 shrink-0" style={{ color: 'var(--primary)' }} strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
