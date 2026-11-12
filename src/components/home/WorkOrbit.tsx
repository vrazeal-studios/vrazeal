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
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
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
 * Touch gets a different section entirely — see `BrandGrid`.
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
      {isDesktop && !reduced ? <PinnedOrbit all={all} /> : <BrandGrid all={all} reduced={Boolean(reduced)} />}
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
 * Touch — the brand wall
 * ------------------------------------------------------------------ */

/**
 * The orbit does not survive the trip to a phone: at that width the ring
 * collapses, the logos overlap the wordmark and every target is moving. So
 * touch gets its own section — the wordmark held still, then a wall of brand
 * plates that rise in on arrival and drift gently afterwards. Everything is a
 * stationary tap target, and each plate carries the name and sector the orbit
 * could only show on hover.
 */
function BrandGrid({ all, reduced }: { all: Brand[]; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });

  return (
    <div ref={ref} className="shell mt-14 pb-section">
      {/* The mark, stated once and held. */}
      <motion.div
        className="mx-auto w-[72%] max-w-[22rem]"
        initial={reduced ? undefined : { opacity: 0, y: 18 }}
        animate={reduced ? undefined : inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <Image
          src="/logo-wordmark.png"
          alt="VRAZEAL"
          width={1200}
          height={172}
          sizes="72vw"
          className="theme-invert h-auto w-full"
        />
      </motion.div>
      <motion.p
        className="eyebrow mt-5 text-center"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced ? undefined : inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
      >
        Trusted by
      </motion.p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {all.map((brand, index) => (
          <BrandTile key={brand.key} brand={brand} index={index} inView={inView} reduced={reduced} />
        ))}

        {/* The open slot, same as the orbit's. */}
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 24 }}
          animate={reduced ? undefined : inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.8, delay: 0.3 + all.length * 0.07, ease: EASE }}
        >
          <Link
            href="/contact"
            className="group flex h-full min-h-[11rem] flex-col items-center justify-center rounded-[18px] border border-dashed border-paper/25 p-4 text-center transition-colors duration-500 active:border-accent"
          >
            <span className="accent-serif text-[1.25rem] leading-none text-paper/80">Your logo</span>
            <span className="mt-2 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-accent-bright">
              here →
            </span>
          </Link>
        </motion.div>
      </div>

      <div className="mt-10 flex justify-center">
        <Button as={Link} href="/projects" variant="ghost" size="md">
          All case studies
        </Button>
      </div>
    </div>
  );
}

function BrandTile({
  brand,
  index,
  inView,
  reduced,
}: {
  brand: Brand;
  index: number;
  inView: boolean;
  reduced: boolean;
}) {
  const body = (
    // The gentle drift that replaces the orbit's rotation on touch.
    <motion.div
      className="flex h-full min-h-[11rem] flex-col justify-between rounded-[18px] border border-hair bg-carbon p-4"
      animate={reduced ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 5 + (index % 3), repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
    >
      <span className="flex flex-1 items-center justify-center">
        <span className="flex h-[4.5rem] w-full items-center justify-center rounded-xl bg-white p-3 [[data-theme=light]_&]:bg-transparent">
          {brand.logo ? (
            <Image
              src={brand.logo.src}
              alt={`${brand.name} logo`}
              width={brand.logo.width}
              height={brand.logo.height}
              sizes="140px"
              className="h-full w-auto max-w-full object-contain"
            />
          ) : (
            <span className="text-center font-display text-[0.875rem] font-medium text-black">{brand.name}</span>
          )}
        </span>
      </span>
      <span className="mt-4 block">
        <span className="line-clamp-2 block font-display text-[0.9375rem] font-medium leading-tight tracking-[-0.02em] text-paper">
          {brand.name}
        </span>
        <span className="mt-1 block truncate font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-ash">
          {brand.sector}
        </span>
      </span>
    </motion.div>
  );

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 24 }}
      animate={reduced ? undefined : inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.8, delay: 0.3 + index * 0.07, ease: EASE }}
    >
      {brand.href ? (
        <Link href={brand.href} aria-label={`${brand.name} case study`} className="block h-full">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}
