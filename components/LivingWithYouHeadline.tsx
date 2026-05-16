import { useEffect, useState, type CSSProperties } from 'react';

type YouLayerStyle = {
  family: string;
  style: 'italic' | 'normal';
  you: string | { gradient: string };
};

type WithStaticStyle = {
  family: string;
  style: 'italic' | 'normal';
  color: string;
};

/** ألوان من متغيرات ثيم المشروع (--primary, --ai, --foreground) */
const FONT_LAYERS_COSMOS: YouLayerStyle[] = [
  { family: "'Playfair Display', Georgia, serif", style: 'italic', you: 'var(--primary)' },
  {
    family: "'Cormorant Garamond', Georgia, serif",
    style: 'italic',
    you: {
      gradient: 'linear-gradient(125deg, var(--primary) 0%, var(--ai) 55%, var(--primary) 100%)',
    },
  },
  { family: "'Lora', Georgia, serif", style: 'italic', you: 'var(--ai)' },
  {
    family: "'DM Serif Display', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(110deg, var(--primary) 0%, color-mix(in srgb, var(--ai) 80%, var(--primary)) 100%)',
    },
  },
  { family: "'Libre Baskerville', Georgia, serif", style: 'italic', you: 'var(--primary)' },
  {
    family: "'Fraunces', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(135deg, var(--ai) 0%, var(--primary) 45%, var(--primary-hover) 100%)',
    },
  },
];

const FONT_LAYERS_PAPER: YouLayerStyle[] = [
  { family: "'Playfair Display', Georgia, serif", style: 'italic', you: 'var(--start-accent)' },
  {
    family: "'Cormorant Garamond', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(125deg, var(--start-accent) 0%, var(--start-accent-light) 55%, var(--start-accent) 100%)',
    },
  },
  { family: "'Lora', Georgia, serif", style: 'italic', you: 'var(--start-accent-light)' },
  {
    family: "'DM Serif Display', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(110deg, var(--start-accent) 0%, var(--start-accent-light) 100%)',
    },
  },
  { family: "'Libre Baskerville', Georgia, serif", style: 'italic', you: 'var(--start-accent)' },
  { family: "'Fraunces', Georgia, serif", style: 'italic', you: 'var(--start-accent-hover)' },
];

const FONT_LAYERS_CINEMATIC: YouLayerStyle[] = [
  { family: "'Cormorant Garamond', Georgia, serif", style: 'italic', you: 'var(--start-accent)' },
  { family: "'Playfair Display', Georgia, serif", style: 'italic', you: 'var(--start-accent-light)' },
  { family: "'EB Garamond', Georgia, serif", style: 'italic', you: '#4e5936' },
  { family: "'Lora', Georgia, serif", style: 'italic', you: 'var(--start-accent-hover)' },
  {
    family: "'Crimson Pro', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(118deg, var(--start-accent-hover) 0%, var(--start-accent) 55%, var(--start-accent-light) 100%)',
    },
  },
  { family: "'DM Serif Display', Georgia, serif", style: 'italic', you: 'var(--start-accent)' },
  { family: "'Libre Baskerville', Georgia, serif", style: 'italic', you: 'var(--start-accent-light)' },
  { family: "'Spectral', Georgia, serif", style: 'italic', you: '#637d2f' },
  {
    family: "'Fraunces', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(128deg, var(--start-accent) 0%, color-mix(in srgb, var(--start-accent-light) 75%, #8a9668) 100%)',
    },
  },
  { family: "'Playfair Display', Georgia, serif", style: 'italic', you: '#5c6840' },
  { family: "'Cormorant Garamond', Georgia, serif", style: 'italic', you: 'var(--start-accent-light)' },
  {
    family: "'EB Garamond', Georgia, serif",
    style: 'italic',
    you: {
      gradient:
        'linear-gradient(140deg, #4e5936 0%, var(--start-accent) 45%, var(--start-accent-light) 100%)',
    },
  },
];

const WITH_STATIC: Record<'cosmos' | 'paper' | 'cinematic', WithStaticStyle> = {
  cosmos: {
    family: "'Playfair Display', Georgia, serif",
    style: 'italic',
    color: 'var(--foreground-strong)',
  },
  paper: {
    family: "'Cormorant Garamond', Georgia, serif",
    style: 'italic',
    color: 'var(--start-text-strong)',
  },
  cinematic: {
    family: "'Cormorant Garamond', Georgia, serif",
    style: 'italic',
    color: 'var(--start-text-strong)',
  },
};

const CYCLE_MS = 3800;
const CYCLE_MS_CINEMATIC = 2200;
const FADE_MS = 2000;
const FADE_MS_CINEMATIC = 1100;

function youStyles(you: YouLayerStyle['you']): CSSProperties {
  if (typeof you === 'string') {
    return { color: you };
  }
  return {
    color: 'transparent',
    backgroundImage: you.gradient,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
}

export function LivingWithYouHeadline({
  id,
  variant = 'cosmos',
}: {
  id?: string;
  variant?: 'cosmos' | 'paper' | 'cinematic';
}) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const layers =
    variant === 'cinematic'
      ? FONT_LAYERS_CINEMATIC
      : variant === 'paper'
        ? FONT_LAYERS_PAPER
        : FONT_LAYERS_COSMOS;
  const withStatic = WITH_STATIC[variant];
  const cycleMs = variant === 'cinematic' ? CYCLE_MS_CINEMATIC : CYCLE_MS;
  const fadeMs = variant === 'cinematic' ? FADE_MS_CINEMATIC : FADE_MS;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % layers.length);
    }, cycleMs);
    return () => window.clearInterval(timer);
  }, [reduceMotion, layers.length, cycleMs]);

  const headline = (
    <h1
      id={id}
      className={[
        'start-page__headline',
        'start-page__headline--living',
        variant === 'cinematic' ? 'start-page__headline--cinematic' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--living-fade-ms': `${fadeMs}ms` } as CSSProperties}
    >
      <span
        className="start-page__headline-with-static"
        style={{
          fontFamily: withStatic.family,
          fontStyle: withStatic.style,
          fontWeight: 400,
          color: withStatic.color,
        }}
      >
        With
      </span>{' '}
      <span className="start-page__headline-you-living">
        {layers.map((layer, i) => {
          const isActive = reduceMotion ? i === 0 : i === index;
          return (
            <span
              key={`${layer.family}-${i}`}
              className={
                isActive
                  ? 'start-page__headline-you-layer is-active'
                  : 'start-page__headline-you-layer'
              }
              aria-hidden={!isActive}
              style={{
                fontFamily: layer.family,
                fontStyle: layer.style,
                fontWeight: 400,
              }}
            >
              <span className="start-page__headline-you" style={youStyles(layer.you)}>
                You
              </span>
            </span>
          );
        })}
      </span>
      <span className="start-page__headline-dot">.</span>
      <span className="sr-only">With You.</span>
    </h1>
  );

  if (variant === 'paper' || variant === 'cinematic') {
    return (
      <div className="start-page__paper-patch">
        <span className="start-page__paper-stack" aria-hidden="true" />
        {headline}
      </div>
    );
  }

  return headline;
}
