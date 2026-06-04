import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Case } from "./types";

interface Step {
  kind: "plan" | "observe" | "correct";
  iteration?: number;
  tool?: string;
  artifact_type?: string;
  trust?: number;
  parse_ok?: boolean;
  evidence_sha256?: string;
  rule?: string;
  technique?: string;
  trusted?: string;
  distrusted?: string;
  pivot?: string;
  text: string;
}

const fluid = [0.32, 0.72, 0, 1] as const;
const trustColor = (t?: number) => (t == null ? "#9ca3af" : t >= 0.8 ? "var(--color-trust-high)" : t >= 0.55 ? "var(--color-trust-mid)" : "var(--color-trust-low)");

const KIND = {
  plan:    { label: "PLAN",    color: "rgba(255,255,255,0.55)", glyph: "→" },
  observe: { label: "OBSERVE", color: "var(--color-trust-high)", glyph: "◎" },
  correct: { label: "CORRECT", color: "var(--color-evil)",       glyph: "✕" },
};

export default function Player({ c }: { c: Case }) {
  const steps = (c.replay ?? []) as Step[];
  const [i, setI] = useState(0);          // how many steps revealed
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // reset when case changes
  useEffect(() => { setI(0); setPlaying(false); }, [c.name]);

  useEffect(() => {
    if (!playing) return;
    if (i >= steps.length) { setPlaying(false); return; }
    timer.current = window.setTimeout(() => setI((n) => n + 1),
      steps[i]?.kind === "correct" ? 1500 : 850);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, i, steps]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [i]);

  const done = i >= steps.length;
  const correctsSoFar = steps.slice(0, i).filter((s) => s.kind === "correct").length;

  const play = () => {
    if (done) setI(0);
    setPlaying(true);
  };

  return (
    <div className="p-6">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={playing ? () => setPlaying(false) : play}
          className="group flex items-center gap-2 rounded-full bg-white/[0.06] py-2 pl-4 pr-2 font-mono text-[13px] text-white/85 transition-all duration-500 ease-fluid hover:bg-white/[0.1] active:scale-[0.98]">
          {playing ? "pause" : done ? "replay" : "play investigation"}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[12px] transition-transform duration-500 ease-fluid group-hover:translate-x-0.5">
            {playing ? "❚❚" : "▶"}
          </span>
        </button>
        <button onClick={() => { setPlaying(false); setI(steps.length); }}
          className="rounded-full border border-white/10 px-3 py-2 font-mono text-[12px] text-white/45 transition-colors hover:text-white/75">
          skip ↦
        </button>
        <div className="ml-auto flex items-center gap-4 font-mono text-[12px] text-white/45">
          <span>step <span className="text-white/80">{Math.min(i, steps.length)}</span>/{steps.length}</span>
          <span className="text-evil">{correctsSoFar} caught</span>
        </div>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div className="h-full rounded-full bg-white/40"
          animate={{ width: `${(Math.min(i, steps.length) / Math.max(steps.length, 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: fluid }} />
      </div>

      {/* stream */}
      <div ref={scroller} className="mt-5 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {steps.slice(0, i).map((s, idx) => {
            const k = KIND[s.kind];
            const isCorrect = s.kind === "correct";
            return (
              <motion.div key={idx}
                initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: fluid }}
                className={`rounded-2xl border p-3.5 ${isCorrect ? "border-evil/30 bg-evil/[0.06]" : "border-white/[0.07] bg-white/[0.02]"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                    style={{ background: `${k.color}1f`, color: k.color }}>{k.glyph}</span>
                  <span className="font-mono text-[11px] tracking-wider" style={{ color: k.color }}>{k.label}</span>
                  {s.iteration != null && <span className="font-mono text-[11px] text-white/30">iter {s.iteration}</span>}
                  {s.tool && <span className="font-mono text-[11px] text-white/45">{s.tool}</span>}
                  {s.trust != null && (
                    <span className="ml-auto font-mono text-[11px]" style={{ color: trustColor(s.trust) }}>
                      trust {s.trust}
                    </span>
                  )}
                </div>

                {s.kind === "plan" && (
                  <div className="mt-2 pl-8 font-display text-[13px] text-white/65">{s.text}</div>
                )}
                {s.kind === "observe" && (
                  <div className="mt-2 flex items-center gap-2 pl-8 font-mono text-[12px] text-white/50">
                    <span>{s.artifact_type}</span>
                    {s.evidence_sha256 && <span className="text-white/25">sha {s.evidence_sha256}…</span>}
                    {s.parse_ok === false && <span className="text-trust-low">no evidence (fail-closed)</span>}
                  </div>
                )}
                {isCorrect && (
                  <div className="mt-2 pl-8">
                    <div className="font-mono text-[12px] text-evil">{s.rule} · {s.technique?.split(" ")[0]}</div>
                    <div className="mt-1 text-[13px] text-white/75">
                      believe <span className="text-trust-high">{s.trusted}</span> ·{" "}
                      <span className="text-trust-low line-through decoration-white/30">{s.distrusted}</span> forged
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-white/40">↳ pivot: {s.pivot}</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {i === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center font-mono text-[12px] text-white/35">
            press play — watch the agent reason, run tools, and catch the lies
          </div>
        )}
        {done && i > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-trust-high/20 bg-trust-high/[0.05] p-4 text-center">
            <span className="font-display text-[15px]" style={{ color: c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)" }}>
              {c.verdict}
            </span>
            <span className="ml-2 font-mono text-[12px] text-white/40">
              {c.findings.length} findings · {c.corrections.length} self-corrections · {c.iterations} iterations
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
