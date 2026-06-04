import { useEffect, useRef, useState } from "react";
import {
  motion, useReducedMotion, useScroll, useSpring, useTransform,
  useInView, animate, type Variants,
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
