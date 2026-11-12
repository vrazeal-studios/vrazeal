'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  words: string[];
  className?: string;
  /** Milliseconds each word holds. */
  interval?: number;
  /** Hold on the first word until this is true (e.g. until the intro lifts). */
  active?: boolean;
};

const word: Variants = {
  enter: { transition: { staggerChildren: 0.028 } },
  center: { transition: { staggerChildren: 0.028 } },
  exit: { transition: { staggerChildren: 0.018 } },
};

/**
 * Travel is a percentage of each character's own line box, but the clip box is
 * taller than that — it carries DESCENDER_ROOM below the baseline so letters
 * like the "p" in "platforms" are not sheared off. A character parked at 105%
 * therefore still shows inside that extra strip, which is what made the
 * outgoing and incoming words overlap. Anything past (1 + DESCENDER_ROOM/
 * line-height) clears it; 155% holds for the line-heights this is used at.
 */
const TRAVEL = 155;
/** Room below the baseline, in em. Kept in step with TRAVEL above. */
const DESCENDER_ROOM = 0.18;

const char: Variants = {
  enter: { y: `${TRAVEL}%`, rotate: 8, opacity: 0 },
  center: { y: '0%', rotate: 0, opacity: 1, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
  exit: { y: `-${TRAVEL}%`, rotate: -6, opacity: 0, transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } },
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * A word slot inside a headline. Each word rolls in character by character
 * while the slot's width springs to fit it, so the rest of the line stays
 * typeset rather than jumping.
 *
 * Sits inline: it top-aligns to the line box and extends its clip below the
 * line so descenders survive the overflow mask.
 */
export function KineticWord({ words, className, interval = 2600, active = true }: Props) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const measureRef = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const measure = () =>
      setWidths(Array.from(node.children).map((child) => (child as HTMLElement).getBoundingClientRect().width));
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [words]);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [active, reduced, interval, words.length]);

  const current = words[index];
  const width = widths[index];

  return (
    <span className={cn('relative inline-block align-top', className)}>
      {/* Invisible measuring row — same font, so widths are exact. */}
      <span ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap">
        {words.map((item) => (
          <span key={item} className="pr-[0.08em]">
            {item}
          </span>
        ))}
      </span>

      <span className="sr-only">{words.join(', ')}</span>

      <motion.span
        aria-hidden
        className="relative inline-block overflow-hidden whitespace-nowrap align-top"
        style={{
          height: `calc(1lh + ${DESCENDER_ROOM}em)`,
          paddingBottom: `${DESCENDER_ROOM}em`,
          marginBottom: `-${DESCENDER_ROOM}em`,
        }}
        animate={width ? { width } : undefined}
        // Snappier than the character roll, so the slot has already resized by
        // the time the new word lands in it.
        transition={{ type: 'spring', stiffness: 210, damping: 26, mass: 0.7 }}
      >
        {reduced ? (
          <span className="inline-block pr-[0.08em]">{current}</span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={current}
              className="inline-block pr-[0.08em]"
              variants={word}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {Array.from(current).map((letter, i) => (
                <motion.span key={`${letter}-${i}`} variants={char} className="inline-block origin-bottom-left">
                  {letter === ' ' ? ' ' : letter}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
        )}
      </motion.span>
    </span>
  );
}
