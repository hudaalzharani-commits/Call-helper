import { Activity, Brain, Users, Wrench } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

const MENU_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: 'Live Monitoring', icon: Activity },
  { label: 'AI Insights', icon: Brain },
  { label: 'Team Performance', icon: Users },
  { label: 'Issue Resolution', icon: Wrench },
];

const panelVariants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.85, delay: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function StartPageGlassPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      className="start-page__panel"
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={panelVariants}
      aria-label="Operational capabilities"
    >
      <p className="start-page__panel-label">Capabilities</p>
      <ul className="start-page__panel-list">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.li
              key={item.label}
              className="start-page__panel-item"
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
              whileHover={reduceMotion ? undefined : { x: 2 }}
            >
              <button type="button" className="start-page__panel-btn">
                <span className="start-page__panel-icon" aria-hidden="true">
                  <Icon strokeWidth={1.75} />
                </span>
                <span>{item.label}</span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </motion.aside>
  );
}
