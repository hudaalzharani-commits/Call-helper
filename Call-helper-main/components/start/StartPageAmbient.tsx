import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** موجتان رفيعتان فقط — دعم جوي هادئ */
const WAVE_PATHS = [
  'M-80 520 C 140 400, 360 580, 620 470 S 980 380, 1280 450 S 1520 500, 1580 420',
  'M-60 600 C 220 500, 460 660, 740 540 S 1100 460, 1420 520',
];

const PARTICLE_COUNT = 22;

function seededParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const t = (i * 17 + 7) % 100;
    return {
      id: i,
      left: `${(t * 9.7 + 12) % 100}%`,
      top: `${(t * 13.3 + 8) % 100}%`,
      size: 1 + (i % 3) * 0.35,
      delay: (i % 10) * 0.5,
      duration: 10 + (i % 6) * 2,
    };
  });
}

export function StartPageAmbient() {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(() => seededParticles(PARTICLE_COUNT), []);

  return (
    <motion.div
      className="start-page__ambient"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
    >
      <svg
        className="start-page__ambient-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="start-ambient-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--start-wave)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--start-wave)" stopOpacity="0.35" />
            <stop offset="50%" stopColor="var(--start-wave-light)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="var(--start-wave)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--start-wave)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {WAVE_PATHS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="url(#start-ambient-stroke)"
            strokeWidth={i === 0 ? 1 : 0.75}
            strokeLinecap="round"
            className="start-page__ambient-wave"
            initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0.5 }}
            animate={
              reduceMotion
                ? { pathLength: 1, opacity: 0.22 }
                : {
                    pathLength: [0.45, 0.92, 0.5],
                    opacity: [0.14, 0.28, 0.16],
                    x: [0, i === 0 ? 8 : -6, 0],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: 26 + i * 6,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                    delay: i * 2,
                  }
            }
          />
        ))}
      </svg>

      <div className="start-page__ambient-fill" />

      <div className="start-page__particles">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="start-page__particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
            }}
            animate={
              reduceMotion
                ? { opacity: 0.2 }
                : {
                    opacity: [0.08, 0.28, 0.1],
                    y: [0, -6 - (p.id % 4) * 2, 0],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: p.duration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: p.delay,
                  }
            }
          />
        ))}
      </div>
    </motion.div>
  );
}
