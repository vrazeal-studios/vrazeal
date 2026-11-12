'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Project, ProjectScreen } from '@/lib/content';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Screens shown after the lead shot before the walkthrough folds. */
const INITIAL = 4;

type Shot = ProjectScreen & { group: string; path: string; n: number };

function hostOf(url?: string) {
  return url ? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : 'preview';
}

function pathFor(host: string, label: string, admin: boolean) {
  return `${admin ? `admin.${host}` : host}/${label.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * The whole walkthrough, straight after the case study's title — the lead
 * screen full width, then the rest two-up as you scroll, folded behind a
 * "View more" after the first few.
 *
 * This replaces a pinned horizontal rail that sat further down the page. The
 * rail reserved a screen height plus the full width of fourteen cards in
 * vertical scroll, which is what made one case study feel endless.
 */
export function ProjectGallery({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  const host = hostOf(project.url);

  const { lead, rest } = useMemo(() => {
    const store = project.screens ?? [];
    const admin = project.adminScreens ?? [];
    let n = 0;
    const all: Shot[] = [
      ...store.map((screen) => ({
        ...screen,
        group: 'Storefront',
        path: pathFor(host, screen.label, false),
        n: ++n,
      })),
      ...admin.map((screen) => ({
        ...screen,
        group: 'Admin portal',
        path: pathFor(host, screen.label, true),
        n: ++n,
      })),
    ];
    return { lead: all[0], rest: all.slice(1) };
  }, [project, host]);

  if (!lead) return null;

  const visible = expanded ? rest : rest.slice(0, INITIAL);
  const hidden = rest.length - visible.length;

  return (
    <section className="pt-16 lg:pt-20">
      <LeadShot shot={lead} />

      <div className="shell mt-16 lg:mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hair pb-6">
          <p className="eyebrow flex items-center gap-3">
            <span className="text-paper">Walkthrough</span>
            <span className="h-px w-8 bg-paper/25" />
            Inside the build
          </p>
          <p className="font-mono text-label text-ash">
            {rest.length + 1} screens
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:gap-y-20">
          {rows(visible).map((row) =>
            row.kind === 'group' ? (
              // Spanning both columns pushes the header onto its own line, so
              // a group that would start mid-row still gets a clean break.
              <GroupLabel key={`g-${row.label}`} label={row.label} />
            ) : (
              <Shot
                key={row.shot.src}
                shot={row.shot}
                // Only the first run is staggered; expanded ones come in together.
                delay={row.i < INITIAL ? row.i * 0.08 : 0}
              />
            ),
          )}
        </div>

        <AnimatePresence initial={false}>
          {hidden > 0 && (
            <motion.div
              key="more"
              className="mt-16 flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <span aria-hidden className="h-16 w-px bg-gradient-to-b from-transparent to-hair" />
              <Button type="button" variant="ghost" onClick={() => setExpanded(true)} icon={<span aria-hidden>↓</span>}>
                View {hidden} more {hidden === 1 ? 'screen' : 'screens'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

type Row = { kind: 'group'; label: string } | { kind: 'shot'; shot: Shot; i: number };

/** Interleaves a header before the first screen of each group. */
function rows(shots: Shot[]): Row[] {
  const out: Row[] = [];
  let group = '';
  shots.forEach((shot, i) => {
    if (shot.group !== group) {
      out.push({ kind: 'group', label: shot.group });
      group = shot.group;
    }
    out.push({ kind: 'shot', shot, i });
  });
  return out;
}

function GroupLabel({ label }: { label: string }) {
  return (
    <motion.p
      className="eyebrow flex items-center gap-3 text-accent-bright lg:col-span-2"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {label}
      <span className="h-px w-10 bg-accent/40" />
    </motion.p>
  );
}

/** The live site in a frame, opening from a slot as it scrolls into view. */
function LeadShot({ shot }: { shot: Shot }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const inset = useTransform(scrollYProgress, [0, 1], [14, 0]);
  const clipPath = useTransform(inset, (v) => `inset(${v}% ${v * 0.6}% ${v}% ${v * 0.6}% round 24px)`);
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1]);

  return (
    <div ref={ref} className="px-gutter">
      <motion.div
        className="relative mx-auto aspect-[16/9] w-full max-w-shell overflow-hidden rounded-[24px] border border-paper/10 bg-white"
        style={reduced ? undefined : { clipPath }}
        initial={reduced ? undefined : { opacity: 0 }}
        whileInView={reduced ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: EASE }}
      >
        <motion.div className="absolute inset-0" style={reduced ? undefined : { scale }}>
          <Image src={shot.src} alt={shot.alt} fill sizes="100vw" priority className="object-cover object-top" />
        </motion.div>
      </motion.div>
    </div>
  );
}

function Shot({ shot, delay }: { shot: Shot; delay: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.figure
      className="group"
      initial={reduced ? undefined : { opacity: 0, y: 32 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      <div className="overflow-hidden rounded-[18px] border border-paper/10 bg-carbon shadow-[0_40px_100px_-50px_var(--shadow-c)]">
        <div className="flex items-center gap-3 border-b border-hair px-4 py-3">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-paper/15" />
            <span className="h-2 w-2 rounded-full bg-paper/15" />
            <span className="h-2 w-2 rounded-full bg-paper/15" />
          </span>
          <span className="mx-auto truncate rounded-md bg-paper/[0.05] px-3 py-1 font-mono text-[0.625rem] text-ash">
            {shot.path}
          </span>
          <span className="font-mono text-[0.625rem] text-ash">{String(shot.n).padStart(2, '0')}</span>
        </div>
        <div className="relative aspect-[16/9] overflow-hidden bg-white">
          <Image
            src={shot.src}
            alt={shot.alt}
            fill
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="object-cover object-top transition-transform duration-[1.2s] ease-expo group-hover:scale-[1.04]"
          />
        </div>
      </div>

      <figcaption className="mt-5">
        <span className="font-mono text-label uppercase text-accent-bright">{shot.label}</span>
        <span className="mt-2 block max-w-[56ch] text-[0.875rem] leading-[1.55] text-smoke">{shot.caption}</span>
      </figcaption>
    </motion.figure>
  );
}
