import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CHMark } from './Logo';
import { LivingWithYouHeadline } from './LivingWithYouHeadline';
import { ThemeToggle } from './ThemeToggle';
import { StartPageAmbient } from './start/StartPageAmbient';
import { StartPageGlassPanel } from './start/StartPageGlassPanel';

interface StartPageProps {
  onStart: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/** شاشة افتتاحية سينمائية — CH by Rafiq */
export function StartPage({ onStart }: StartPageProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.classList.add('start-page-active');
    document.body.classList.add('start-page-active');
    return () => {
      document.documentElement.classList.remove('start-page-active');
      document.body.classList.remove('start-page-active');
    };
  }, []);

  return (
    <div className="start-page start-page--cinematic" dir="ltr" lang="en">
      <StartPageAmbient />
      <div className="start-page__vignette" aria-hidden="true" />

      <motion.div
        className="start-page__theme"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <ThemeToggle size="sm" className="start-page__theme-btn" />
      </motion.div>

      <div className="start-page__layout">
        <motion.main
          className="start-page__hero"
          aria-labelledby="start-headline"
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
          }}
        >
          <motion.header className="start-page__brand" variants={fadeUp}>
            <CHMark height={72} className="start-page__mark" />
            <p className="start-page__byline">
              by <span className="start-page__byline-name">Rafiq</span>
            </p>
          </motion.header>

          <motion.p className="start-page__kicker" variants={fadeUp}>
            Where Operations Think
          </motion.p>

          <motion.div variants={fadeUp}>
            <LivingWithYouHeadline id="start-headline" variant="cinematic" />
          </motion.div>

          <motion.p className="start-page__tagline" custom={0.28} variants={fadeUp}>
            Let&apos;s build clarity, together.
          </motion.p>

          <motion.div variants={fadeUp}>
            <button
              type="button"
              className="start-page__cta"
              onClick={onStart}
              aria-label="Start"
            >
              <span className="start-page__cta-label">START</span>
            </button>
          </motion.div>
        </motion.main>

        <StartPageGlassPanel />
      </div>

      <motion.footer
        className="start-page__footer"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
      >
        <span>Operational Intelligence System</span>
        <span className="start-page__footer-brand">CH by Rafiq</span>
      </motion.footer>

      <KeyboardEnterShortcut onTrigger={onStart} />
    </div>
  );
}

function KeyboardEnterShortcut({ onTrigger }: { onTrigger: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault();
        onTrigger();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTrigger]);
  return null;
}
