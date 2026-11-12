'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { VelocityMarquee } from '@/components/motion/VelocityMarquee';
import { Button } from '@/components/ui/Button';
import { SectionIntro } from '@/components/ui/SectionIntro';
import { clients, projects } from '@/lib/content';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;

/** A brand in the constellation — a project with a case study, or a client. */
type Brand = {
  key: string;
  name: string;
  sector: string;
  logo?: { src: string; width: number; height: number };
  preview?: string;
  href?: string;
};

function brands(): Brand[] {
  return [
    ...projects.map((project) => ({
      key: project.id,
      name: project.client,
      sector: project.industry ?? project.sector,
      logo: project.logo,
      preview: project.screens?.[0]?.src,
      href: `/projects#${project.id}`,
    })),
    ...clients.map((client) => ({
      key: client.name,
      name: client.name,
      sector: client.sector,
      logo: client.logo,
      preview: client.preview,
    })),
  ];
}

/**
 * Selected work as a constellation. The VRAZEAL wordmark opens the section on
 * its own, spanning the page. Scrolling shrinks it to the centre and flies
 * every brand in from beyond the edges to take its place on the ring. From
 * then on the logos keep circling at a constant speed, with depth: those
 * behind are smaller and dimmer, those in front pass over the mark. Hovering
 * a logo stops the rotation and shows its website.
 *
 * Touch gets a different section entirely — see `BrandDeck`.
 */
export function WorkOrbit() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reduced = useReducedMotion();
  const all = useMemo(brands, []);

  return (
    <section id="work" className="relative scroll-mt-10 overflow-x-clip bg-void pt-section">
      <div className="shell">
        <SectionIntro
          index="03"
          label="Selected work"
          title={[
            'Work that',
            <>
              <span className="accent-serif">ships</span>
              <span className="text-accent">.</span>
            </>,
          ]}
          aside="Brands we have designed and built for — from live e-commerce platforms to identities and campaigns."
        />
      </div>
      {isDesktop && !reduced ? <PinnedOrbit all={all} /> : <BrandDeck all={all} reduced={Boolean(reduced)} />}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Desktop — the orbit
 * ------------------------------------------------------------------ */

/** The sequence is scrubbed by scroll while the stage is pinned. */
function PinnedOrbit({ all }: { all: Brand[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    <div ref={ref} className="relative mt-6 h-[260vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <OrbitStage all={all} progress={scrollYProgress} />
      </div>
    </div>
  );
}

type Selection = { index: number; side: 'left' | 'right' } | null;

function OrbitStage({ all, progress }: { all: Brand[]; progress: MotionValue<number> }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(stageRef);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [selected, setSelected] = useState<Selection>(null);
  const spin = useMotionValue(0);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /**
   * One revolution every ~48 seconds, driven by elapsed time alone. Scroll
   * position is deliberately not mixed in: tying the angle to the scrubber
   * made the ring lurch with every wheel notch instead of gliding.
   */
  useAnimationFrame((_, delta) => {
    if (reduced || !inView || selected) return;
    spin.set(spin.get() + Math.min(delta, 50) * 0.00013);
  });

  const total = all.length + 1; // brands + the open slot
  const rx = Math.min(size.w * 0.36, 640);
  const ry = size.h * 0.3;
  const planet = Math.max(130, Math.min(size.w * 0.115, 190));

  const markScale = useTransform(progress, [0, 0.12, 0.5], [1, 1, 0.3]);
  const poolOpacity = useTransform(progress, [0.28, 0.4], [0, 1]);
  const captionOpacity = useTransform(progress, [0.72, 0.86], [0, 1]);
  const captionY = useTransform(progress, [0.72, 0.86], [16, 0]);

  const sectors = Array.from(new Set(all.map((brand) => brand.sector)));

  return (
    <div ref={stageRef} className="relative h-full w-full" onMouseLeave={() => setSelected(null)}>
      {/* Light pooling behind the mark — the only thing left under the logos. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[60%] -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: poolOpacity,
          background: 'radial-gradient(closest-side, rgba(10,132,255,0.16), transparent)',
        }}
      />

      {/* The wordmark — page-wide at first, then the centre of the orbit. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[94vw] max-w-[1500px]"
        style={{ x: '-50%', y: '-50%', scale: markScale }}
      >
        <Image
          src="/logo-wordmark.png"
          alt="VRAZEAL"
          width={1200}
          height={172}
          priority={false}
          sizes="94vw"
          className="theme-invert h-auto w-full"
        />
      </motion.div>

      {all.map((brand, index) => (
        <Planet
          key={brand.key}
          brand={brand}
          index={index}
          total={total}
          progress={progress}
          spin={spin}
          rx={rx}
          ry={ry}
          size={planet}
          showCard={selected?.index === index}
          cardSide={selected?.side ?? 'right'}
          onSelect={(side) => setSelected({ index, side })}
          onClear={() => setSelected(null)}
        />
      ))}
      <Planet index={all.length} total={total} progress={progress} spin={spin} rx={rx} ry={ry} size={planet} />

      <motion.div
        className="shell absolute inset-x-0 bottom-8 z-40 flex items-end justify-between gap-6"
        style={{ opacity: captionOpacity, y: captionY }}
      >
        <p className="eyebrow max-w-[60ch] leading-relaxed">{sectors.join(' · ')}</p>
        <Button as={Link} href="/projects" variant="ghost" size="md">
          All case studies
        </Button>
      </motion.div>
    </div>
  );
}

function Planet({
  brand,
  index,
  total,
  progress,
  spin,
  rx,
  ry,
  size,
  showCard = false,
  cardSide = 'right',
  onSelect,
  onClear,
}: {
  brand?: Brand;
  index: number;
  total: number;
  progress: MotionValue<number>;
  spin: MotionValue<number>;
  rx: number;
  ry: number;
  size: number;
  showCard?: boolean;
  cardSide?: 'left' | 'right';
  onSelect?: (side: 'left' | 'right') => void;
  onClear?: () => void;
}) {
  const reduced = useReducedMotion();
  const base = (index / total) * Math.PI * 2 - Math.PI / 2;
  const start = 0.3 + index * 0.05;
  const fly = useTransform(progress, [start, start + 0.26], [0, 1], { clamp: true });

  const angle = useTransform(spin, (s: number) => base + s);
  const x = useTransform([angle, fly], ([a, f]: number[]) => Math.cos(a) * rx * (1 + (1 - f) * 1.5));
  const y = useTransform([angle, fly], ([a, f]: number[]) => Math.sin(a) * ry * (1 + (1 - f) * 1.5));
  const depth = useTransform(angle, (a: number) => (Math.sin(a) + 1) / 2); // 0 = back, 1 = front
  const scale = useTransform([depth, fly], ([d, f]: number[]) => (0.78 + d * 0.32) * (0.4 + 0.6 * f));
  const filter = useTransform(
    [depth, fly],
    ([d, f]: number[]) => `blur(${((1 - f) * 10).toFixed(1)}px) brightness(${(0.62 + d * 0.38).toFixed(2)})`,
  );
  const zIndex = useTransform(depth, (d: number) => (d > 0.5 ? 30 : 10));

  const disc = (
    <motion.span
      className="relative flex h-full w-full items-center justify-center rounded-full"
      whileHover={{ scale: 1.14 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {brand ? (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white p-[13%] shadow-[0_0_50px_-8px_rgba(10,132,255,0.55)] [[data-theme=light]_&]:bg-transparent [[data-theme=light]_&]:shadow-none">
          {brand.logo ? (
            <Image
              src={brand.logo.src}
              alt={`${brand.name} logo`}
              width={brand.logo.width}
              height={brand.logo.height}
              sizes="160px"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-center font-display text-sm font-medium text-black">{brand.name}</span>
          )}
        </span>
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center rounded-full border border-dashed border-paper/30 text-center transition-colors duration-500 hover:border-accent">
          <span className="accent-serif text-[1.125rem] leading-none text-paper/80">Your logo</span>
          <span className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-ash">here →</span>
        </span>
      )}
    </motion.span>
  );

  // The preview opens towards the centre, so it never leaves the screen.
  const side = (): 'left' | 'right' => (x.get() > 0 ? 'left' : 'right');

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        x,
        y,
        scale,
        opacity: fly,
        filter,
        zIndex: showCard ? 50 : zIndex,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
    >
      {/* Independent bob, so the ring reads as logos floating rather than
          beads threaded on a wire. Phase is offset per logo. */}
      <motion.div
        className="h-full w-full"
        animate={reduced ? undefined : { y: [0, -9, 0] }}
        transition={{ duration: 6 + (index % 4), repeat: Infinity, ease: 'easeInOut', delay: index * 0.45 }}
      >
        {!brand ? (
          <Link href="/contact" aria-label="Your logo here — start a project" className="block h-full w-full">
            {disc}
          </Link>
        ) : brand.href ? (
          <Link
            href={brand.href}
            aria-label={`${brand.name} case study`}
            data-cursor-label="View"
            className="block h-full w-full"
            onMouseEnter={() => onSelect?.(side())}
            onMouseLeave={onClear}
            onFocus={() => onSelect?.(side())}
            onBlur={onClear}
          >
            {disc}
          </Link>
        ) : (
          <button
            type="button"
            aria-label={`Preview ${brand.name}`}
            data-cursor-label="Peek"
            className="block h-full w-full"
            onMouseEnter={() => onSelect?.(side())}
            onMouseLeave={() => onClear?.()}
            onFocus={() => onSelect?.(side())}
            onBlur={() => onClear?.()}
          >
            {disc}
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showCard && brand && (
          <motion.div
            className={cn(
              'pointer-events-none absolute top-1/2 w-72',
              cardSide === 'right' ? 'left-[calc(100%+1.25rem)]' : 'right-[calc(100%+1.25rem)]',
            )}
            initial={{ opacity: 0, y: '-40%', x: cardSide === 'right' ? -12 : 12, scale: 0.94 }}
            animate={{ opacity: 1, y: '-50%', x: 0, scale: 1 }}
            exit={{ opacity: 0, y: '-45%', scale: 0.96 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <PreviewCard brand={brand} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PreviewCard({ brand }: { brand: Brand }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-paper/10 bg-carbon shadow-[0_30px_80px_-30px_var(--shadow-c)]">
      {brand.preview && (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
          <Image src={brand.preview} alt={`${brand.name} website`} fill sizes="288px" className="object-cover object-top" />
        </div>
      )}
      <div className="flex flex-col justify-between p-4">
        <div className="min-w-0">
          <p className="truncate font-display text-[1.125rem] font-medium tracking-[-0.02em]">{brand.name}</p>
          <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ash">{brand.sector}</p>
        </div>
        {brand.href && (
          <span className="mt-3 text-[0.8125rem] text-accent-bright">Read the case study →</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Touch — the brand deck
 * ------------------------------------------------------------------ */

/**
 * The stretch of the deck's pass through the viewport (0 = its top meets the
 * bottom of the screen, 1 = its bottom leaves the top) over which the cards
 * are dealt: the first card goes once the deck is fully on screen, the last
 * just before it reaches the top. About 95px of scroll per card on a phone.
 */
const DEAL_FROM = 0.3;
const DEAL_TO = 0.68;

/** Resting poses for the front card and the two peeking behind it. */
const STACK = [
  { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
  { x: 0, y: -22, scale: 0.93, rotate: 2.5, opacity: 1 },
  { x: 0, y: -42, scale: 0.86, rotate: -2, opacity: 0.8 },
];

type Card = { kind: 'brand'; brand: Brand } | { kind: 'open' };

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The orbit does not survive the trip to a phone: at that width the ring
 * collapses, the logos overlap the wordmark and every target is moving. So
 * touch gets a deck of brand cards instead. Scrolling deals it: as the deck
 * travels up the screen each card in turn is flung off and the next rises to
 * the front, and scrolling back up brings them back. A swipe in either
 * direction deals by hand, and the progress bar jumps to any card. Brand
 * names run in outline above the deck, and the last card is the open slot.
 * Nothing is pinned, so the section stays one card tall.
 */
function BrandDeck({ all, reduced }: { all: Brand[]; reduced: boolean }) {
  const cards = useMemo<Card[]>(
    () => [...all.map((brand) => ({ kind: 'brand' as const, brand })), { kind: 'open' as const }],
    [all],
  );
  const n = cards.length;
  const deckRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [side, setSide] = useState<1 | -1>(-1);

  const { scrollYProgress } = useScroll({ target: deckRef, offset: ['start end', 'end start'] });
  const dealtByScroll = useRef(0);

  // Only a change in the scroll-chosen card moves the deck, so a card dealt
  // by hand stays put until the reader scrolls on to the next step.
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const t = Math.min(1, Math.max(0, (progress - DEAL_FROM) / (DEAL_TO - DEAL_FROM)));
    const index = Math.round(t * (n - 1));
    if (index === dealtByScroll.current) return;
    dealtByScroll.current = index;
    setSide(-1);
    setActive(index);
  });

  const deal = (towards: 1 | -1) => {
    setSide(towards);
    setActive((current) => (current + 1) % n);
  };

  const jump = (index: number) => {
    setSide(-1);
    setActive(index);
  };

  return (
    <div className="relative mt-12 pb-section">
      <div className="shell flex items-end justify-between gap-4">
        <p className="eyebrow flex items-center gap-3">
          <span className="text-paper">Trusted by</span>
          <span className="h-px w-8 bg-paper/25" />
          {all.length} brands
        </p>
        <p className="flex items-baseline font-mono text-label text-ash">
          <span className="relative inline-flex h-[1.25em] overflow-hidden text-paper">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={active}
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {pad(active + 1)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="mx-1.5">/</span>
          {pad(n)}
        </p>
      </div>

      {/* Every name on the deck, running in outline. */}
      <VelocityMarquee baseVelocity={-1.4} skew={false} className="mt-6">
        {all.map((brand) => (
          <span
            key={brand.key}
            aria-hidden
            className="flex items-center whitespace-nowrap font-display text-[3.25rem] font-medium leading-[1.1] tracking-[-0.05em]"
          >
            <span className="text-outline">{brand.name}</span>
            <span className="px-5 text-[1.5rem] text-accent">✦</span>
          </span>
        ))}
      </VelocityMarquee>

      <div className="shell mt-6">
        <div
          ref={deckRef}
          className="relative mx-auto h-[25.5rem] max-w-[24rem]"
          aria-roledescription="carousel"
          aria-label="Brands we have worked with"
        >
          {cards.map((card, index) => (
            <DeckCard
              key={card.kind === 'brand' ? card.brand.key : 'open'}
              card={card}
              index={index}
              place={(index - active + n) % n}
              n={n}
              side={side}
              onDeal={deal}
            />
          ))}
        </div>

        {/* Story-style progress — one segment per card, and a way to jump. */}
        <div className="mx-auto mt-7 flex max-w-[24rem] gap-1.5">
          {cards.map((card, index) => {
            const label = card.kind === 'brand' ? card.brand.name : 'Your logo here';
            const isActive = index === active;
            return (
              <button
                key={label}
                type="button"
                aria-label={`Show ${label}`}
                aria-current={isActive}
                onClick={() => jump(index)}
                className="relative h-6 flex-1"
              >
                <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full bg-paper/15">
                  {index < active && <span className="absolute inset-0 bg-paper/50" />}
                  {isActive && (
                    <motion.span
                      key={active}
                      className="absolute inset-0 origin-left bg-accent shadow-[0_0_8px_#0A84FF]"
                      initial={{ scaleX: reduced ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-8 flex max-w-[24rem] items-center justify-between gap-4">
          <p className="flex items-center gap-2.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ash">
            <motion.span
              aria-hidden
              className="text-[0.875rem] text-accent-bright"
              animate={reduced ? undefined : { x: [0, -5, 5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
            >
              ⟷
            </motion.span>
            Swipe the deck
          </p>
          <Button as={Link} href="/projects" variant="ghost" size="md">
            All case studies
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeckCard({
  card,
  index,
  place,
  n,
  side,
  onDeal,
}: {
  card: Card;
  index: number;
  place: number;
  n: number;
  side: 1 | -1;
  onDeal: (towards: 1 | -1) => void;
}) {
  const dragX = useMotionValue(0);
  const tilt = useTransform(dragX, [-220, 0, 220], [-14, 0, 14]);
  const dragged = useRef(false);

  const front = place === 0;
  const stacked = place < STACK.length;
  const dealt = !stacked && place === n - 1; // the card that just left the front

  const pose = stacked
    ? STACK[place]
    : dealt
      ? { x: side * 440, y: 24, scale: 0.96, rotate: side * 20, opacity: 0 }
      : { x: 0, y: -56, scale: 0.8, rotate: 0, opacity: 0 };

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 h-[22.5rem]"
      style={{ transformOrigin: '50% 0%', zIndex: dealt ? n + 1 : n - place, pointerEvents: front ? 'auto' : 'none' }}
      initial={false}
      animate={pose}
      transition={
        dealt ? { duration: 0.6, ease: [0.32, 0, 0.67, 0] } : { type: 'spring', stiffness: 240, damping: 28, mass: 0.9 }
      }
      aria-hidden={!front}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ x: dragX, rotate: tilt, touchAction: 'pan-y' }}
        drag={front ? 'x' : false}
        dragSnapToOrigin
        dragElastic={1}
        onPointerDownCapture={() => {
          dragged.current = false;
        }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) {
            onDeal(info.offset.x > 0 ? 1 : -1);
          }
        }}
        // A swipe that ends over a link must not also follow it.
        onClickCapture={(event) => {
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <DeckFace card={card} index={index} front={front} />
        {/* Cards waiting their turn sit in shadow, so only their edges read. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] bg-void"
          initial={false}
          animate={{ opacity: front ? 0 : 0.7 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </motion.div>
    </motion.div>
  );
}

function DeckFace({ card, index, front }: { card: Card; index: number; front: boolean }) {
  const glow = (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full"
      style={{ background: 'radial-gradient(closest-side, rgba(10,132,255,0.26), transparent)' }}
    />
  );

  if (card.kind === 'open') {
    return (
      <Link
        href="/contact"
        tabIndex={front ? 0 : -1}
        draggable={false}
        className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-dashed border-accent/50 bg-carbon p-6 shadow-[0_40px_90px_-40px_var(--shadow-c)]"
      >
        {glow}
        <span className="relative flex items-center justify-between">
          <span className="eyebrow">Open slot</span>
          <span className="font-mono text-label text-ash">{pad(index + 1)}</span>
        </span>
        <span className="relative block">
          <span className="accent-serif block text-[3.25rem] leading-[0.95] text-paper">
            Your logo
            <br />
            here<span className="text-accent">.</span>
          </span>
          <span className="mt-4 block max-w-[26ch] text-[0.9375rem] leading-[1.5] text-smoke">
            The next brand on this deck could be yours.
          </span>
        </span>
        <span className="relative inline-flex items-center gap-2 self-start rounded-pill bg-accent px-5 py-3 text-[0.875rem] font-medium text-white shadow-[0_0_30px_rgba(10,132,255,0.45)]">
          Start a project <span aria-hidden>→</span>
        </span>
      </Link>
    );
  }

  const { brand } = card;
  const body = (
    <span className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-paper/10 bg-carbon p-6 shadow-[0_40px_90px_-40px_var(--shadow-c)]">
      {glow}
      <span className="relative flex items-center justify-between gap-4">
        <span className="eyebrow truncate">{brand.sector}</span>
        <span className="font-mono text-label text-ash">{pad(index + 1)}</span>
      </span>

      <span className="relative flex flex-1 items-center justify-center py-6">
        <span className="flex h-36 w-full items-center justify-center rounded-[20px] bg-white p-6 shadow-[0_0_60px_-14px_rgba(10,132,255,0.55)] [[data-theme=light]_&]:bg-transparent [[data-theme=light]_&]:shadow-none">
          {brand.logo ? (
            <Image
              src={brand.logo.src}
              alt={`${brand.name} logo`}
              width={brand.logo.width}
              height={brand.logo.height}
              sizes="260px"
              draggable={false}
              className="h-full w-auto max-w-full select-none object-contain"
            />
          ) : (
            <span className="text-center font-display text-[1.125rem] font-medium text-black">{brand.name}</span>
          )}
        </span>
      </span>

      <span className="relative flex items-end justify-between gap-4 border-t border-hair pt-5">
        <span className="min-w-0">
          <span className="line-clamp-2 block font-display text-[1.625rem] font-medium leading-[1.02] tracking-[-0.04em] text-paper">
            {brand.name}
          </span>
          <span className="mt-2 block font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ash">
            {brand.href ? 'Read the case study' : 'Brand partner'}
          </span>
        </span>
        {brand.href && (
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/50 text-accent-bright"
          >
            ↗
          </span>
        )}
      </span>
    </span>
  );

  return brand.href ? (
    <Link
      href={brand.href}
      tabIndex={front ? 0 : -1}
      draggable={false}
      aria-label={`${brand.name} case study`}
      className="block h-full"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
