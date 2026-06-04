import { useEffect, useRef, useState } from "react";
import {
  motion, AnimatePresence, useReducedMotion, useScroll, useSpring, useTransform,
  useInView, useVelocity, useMotionValue, animate, type Variants,
} from "framer-motion";

export const smooth = [0.22, 1, 0.36, 1] as const;
export const sharp = [0.4, 0, 0.2, 1] as const;

/* ── Top scroll-progress bar (communicates position) ─────────────────── */
export function ScrollProgress({ color = "var(--color-accent)" }: { color?: string }) {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <motion.div aria-hidden
      style={{ scaleX: x, transformOrigin: "0% 50%", background: color }}
      className="fixed inset-x-0 top-0 z-50 h-[2px]" />
  );
}

/* ── Count-up number (the metric reveal) ─────────────────────────────── */
export function AnimatedNumber({ value, suffix = "", className = "" }: {
  value: number; suffix?: string; className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration: 1.1, ease: smooth,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}

/* ── Word-by-word headline reveal (guides attention to the line) ─────── */
export function WordReveal({ text, className = "", delay = 0 }: {
  text: string; className?: string; delay?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: delay } },
  };
  const word: Variants = {
    hidden: { y: reduce ? 0 : "110%", opacity: reduce ? 1 : 0 },
    visible: { y: "0%", opacity: 1, transition: { duration: 0.7, ease: smooth } },
  };
  return (
    <motion.span className={`inline-block ${className}`} variants={container}
      initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span variants={word} className="inline-block">{w}&nbsp;</motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* ── Magnetic button wrapper (pointer-reactive, tactile) ─────────────── */
export function Magnetic({ children, className = "", onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [d, setD] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setD({ x: (e.clientX - (r.left + r.width / 2)) * 0.25,
           y: (e.clientY - (r.top + r.height / 2)) * 0.25 });
  };
  return (
    <motion.button ref={ref} onClick={onClick}
      onMouseMove={onMove} onMouseLeave={() => setD({ x: 0, y: 0 })}
      animate={{ x: d.x, y: d.y }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
      whileTap={{ scale: 0.96 }} className={className}>
      {children}
    </motion.button>
  );
}

/* ── Decode text — chars scramble from noise then resolve (forensic theme) ─ */
const GLYPHS = "ABCDEF0123456789#%&$/\\<>";
export function DecodeText({ text, className = "", trigger = "view", duration = 900 }: {
  text: string; className?: string; trigger?: "view" | "mount"; duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [out, setOut] = useState(reduce ? text : "");

  useEffect(() => {
    if (reduce) { setOut(text); return; }
    const go = trigger === "mount" || inView;
    if (!go) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const locked = Math.floor(p * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        s += i < locked || text[i] === " " ? text[i]
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, text, trigger, duration]);

  return <span ref={ref} className={className}>{out || " "}</span>;
}

/* ── Infinite marquee — scroll-velocity reactive ticker band ─────────── */
export function Marquee({ items, baseSpeed = 0.0016, className = "" }: {
  items: string[]; baseSpeed?: number; className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useVelocity(scrollY);
  const smoothVel = useSpring(vel, { stiffness: 300, damping: 80 });
  // idle boost = 1; fast scroll adds up to ~2.5x, capped; never reverses jarringly
  const boost = useTransform(smoothVel, [-2000, 0, 2000], [2.5, 1, 2.5], { clamp: true });

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;  // clamp dt to avoid jumps
      const next0 = x.get() - baseSpeed * dt * boost.get();
      let next = next0;
      if (next <= -50) next += 50;   // wrap within one copy width
      x.set(next);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce, baseSpeed, boost, x]);

  const row = [...items, ...items];
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x: reduce ? 0 : useTransform(x, (v) => `${v}%`) }} className="inline-flex">
        {[0, 1].map((c) => (
          <span key={c} className="inline-flex shrink-0">
            {row.map((it, i) => (
              <span key={`${c}-${i}`} className="mx-6 inline-flex items-center gap-6">
                <span>{it}</span><span className="text-accent">✦</span>
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Custom crosshair cursor (forensic targeting) ────────────────────── */
export function Cursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.3 });
  const [hot, setHot] = useState(false);
  const [touch, setTouch] = useState(true);

  useEffect(() => {
    if (reduce) return;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const move = (e: MouseEvent) => {
      x.set(e.clientX); y.set(e.clientY);
      const el = e.target as HTMLElement;
      setHot(!!el.closest("button, a, [data-cursor]"));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [reduce, x, y]);

  if (reduce || touch) return null;
  return (
    <motion.div aria-hidden style={{ x: sx, y: sy }}
      className="pointer-events-none fixed left-0 top-0 z-[60] -translate-x-1/2 -translate-y-1/2 mix-blend-difference">
      <motion.div animate={{ scale: hot ? 2.4 : 1 }} transition={{ duration: 0.25, ease: smooth }}
        className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-5 w-px bg-white/80" />
        <span className="absolute h-px w-5 bg-white/80" />
        <span className="h-1 w-1 rounded-full bg-white" />
      </motion.div>
    </motion.div>
  );
}

/* ── Boot preloader — CONTRA initializes, then wipes away ────────────── */
export function Preloader() {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(reduce);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1400, 1);
      setPct(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  return (
    <AnimatePresence mode="wait">
      {!done && (
        <motion.div key="pre" exit={{ y: "-100%" }} transition={{ duration: 0.8, ease: smooth }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-graphite text-paper">
          <DecodeText text="CONTRA" trigger="mount" duration={700}
            className="font-display text-[12vw] font-semibold uppercase tracking-[-0.03em] md:text-[6rem]" />
          <div className="mt-6 flex w-[200px] items-center gap-3 font-mono text-[11px] text-paper/50">
            <div className="h-px flex-1 bg-paper/15">
              <motion.div className="h-px bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
          <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/35">initializing read-only surface</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Parallax wrapper (scroll-linked depth) ──────────────────────────── */
export function Parallax({ children, amount = 60, className = "" }: {
  children: React.ReactNode; amount?: number; className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: reduce ? 0 : y }}>{children}</motion.div>
    </div>
  );
}
