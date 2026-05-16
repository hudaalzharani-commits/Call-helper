/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'Sora', 'system-ui', 'sans-serif'],
        display: ['Sora',  'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:   'calc(var(--radius) - 6px)',
        md:   'calc(var(--radius) - 4px)',
        lg:   'var(--radius)',
        xl:   'calc(var(--radius) + 4px)',
        '2xl':'calc(var(--radius) + 8px)',
        '3xl':'calc(var(--radius) + 16px)',
      },
      colors: {
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        surface:     'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
          hover:      'var(--primary-hover)',
          soft:       'var(--primary-soft)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
          strong:     'var(--muted-strong)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        ai: {
          DEFAULT:    'var(--ai)',
          foreground: 'var(--ai-foreground)',
          soft:       'var(--ai-soft)',
        },
        success:     'var(--success)',
        warning:     'var(--warning)',
        danger:      'var(--danger)',
        info:        'var(--info)',
        destructive: {
          DEFAULT:    'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border:        'var(--border)',
        'border-strong':'var(--border-strong)',
        input:         'var(--input)',
        'input-background': 'var(--input-background)',
        ring:          'var(--ring)',
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT:              'var(--sidebar)',
          foreground:           'var(--sidebar-foreground)',
          primary:              'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent:               'var(--sidebar-accent)',
          'accent-foreground':  'var(--sidebar-accent-foreground)',
          border:               'var(--sidebar-border)',
          ring:                 'var(--sidebar-ring)',
        },
      },
      boxShadow: {
        xs:  'var(--shadow-xs)',
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow-md)',
        lg:  'var(--shadow-lg)',
        xl:  'var(--shadow-xl)',
        glow: 'var(--shadow-glow)',
      },
      transitionTimingFunction: {
        'rafiq': 'cubic-bezier(.2,.8,.2,1)',
      },
      animation: {
        'fade-in':   'fadeIn .42s cubic-bezier(.2,.8,.2,1) both',
        'rise-in':   'riseIn .56s cubic-bezier(.2,.8,.2,1) both',
        'scale-in':  'scaleIn .28s cubic-bezier(.2,.8,.2,1) both',
        'reveal':    'reveal .48s cubic-bezier(.2,.8,.2,1) both',
        'breathe':   'breathe 18s ease-in-out infinite',
        'pulse-once':'pulseOnce 1.4s ease-out 1 both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(.97)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        reveal: {
          from: { opacity: '0', transform: 'translateY(10px)', filter: 'blur(2px)' },
          to:   { opacity: '1', transform: 'translateY(0)',    filter: 'blur(0)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
