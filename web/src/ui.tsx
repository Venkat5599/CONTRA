import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import type { Artifact, Case, Correction, Finding } from "./types";

export const fluid = [0.32, 0.72, 0, 1] as const;

export function trustColor(t: number): string {
  if (t >= 0.8) return "var(--color-trust-high)";
  if (t >= 0.55) return "var(--color-trust-mid)";
  return "var(--color-trust-low)";
}
const sevColor: Record<string, string> = {
  CRITICAL: "var(--color-evil)",
  HIGH: "#fb923c",
  MEDIUM: "#fbbf24",
};

/* ── Double-bezel: glass plate in an aluminium tray ─────────────────── */
export function Bezel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[2rem] border border-white/10 bg-white/[0.025] p-1.5 ${className}`}>
      <div className="h-full rounded-[calc(2rem-0.375rem)] bg-ink/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55">
      {children}
    </span>
  );
}

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: fluid, delay }}
    >
      {children}
    </motion.div>
  );
}

export function StatTile({ label, value, accent, index = 0 }: {
  label: string; value: string; accent?: string; index?: number;
}) {
  const col = accent ?? "rgba(255,255,255,0.92)";
  const numeric = /^\d+$/.test(value);
  return (
    <motion.div className="group relative flex-1"
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7, ease: fluid, delay: index * 0.08 }}>
      {/* hairline divider between tiles (editorial), not heavy boxes */}
      {index > 0 && <span className="pointer-events-none absolute -left-5 top-2 hidden h-[78%] w-px bg-white/8 md:block" />}
      <div className="relative px-1 py-3">
        <div className="mb-5 flex items-center gap-2 font-mono text-[10px] text-white/25">
          <span>0{index + 1}</span>
          <span className="h-px w-6" style={{ background: accent ? col : "rgba(255,255,255,0.15)" }} />
        </div>
        <div className="font-display text-7xl font-semibold leading-none tabular-nums tracking-[-0.03em] md:text-8xl"
          style={{ color: col, textShadow: accent ? `0 0 50px ${col}33` : "none" }}>
          {numeric ? <CountUp to={parseInt(value, 10)} /> : value}
        </div>
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      </div>
    </motion.div>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1, ease: fluid, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{n}</span>;
}

/* ── Finding card ───────────────────────────────────────────────────── */
export function FindingCard({ f, i }: { f: Finding; i: number }) {
  return (
    <Reveal delay={i * 0.06}>
      <Bezel>
        <div className="p-8">
          {/* header */}
          <div className="flex items-center justify-between">
            <span className="rounded-full px-3 py-1 font-mono text-[11px] font-semibold"
              style={{ background: `${sevColor[f.severity]}1a`, color: sevColor[f.severity] }}>
              {f.rule_id} · {f.severity}
            </span>
            <span className="font-mono text-[12px] tracking-wide text-white/35">{f.technique.split(" ")[0]}</span>
          </div>

          {/* title + summary */}
          <h3 className="mt-5 font-display text-[22px] leading-tight text-white/90">
            {f.technique.split(" ").slice(1).join(" ")}
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-white/50">{f.summary}</p>

          {/* trust reasoning — clean two-row comparison */}
          <div className="mt-7 space-y-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-trust-high/12 text-[11px] text-trust-high ring-1 ring-trust-high/30">✓</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">believe</span>
              <span className="font-mono text-[13px] text-trust-high">{f.trusted_source}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-trust-low/12 text-[11px] text-trust-low ring-1 ring-trust-low/30">✕</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">forged</span>
              <span className="font-mono text-[13px] text-trust-low line-through decoration-white/25">{f.distrusted_source}</span>
            </div>
          </div>

          {/* pivot + provenance footer */}
          <div className="mt-6 space-y-2.5">
            <div className="flex gap-2 text-[12px] leading-relaxed text-white/45">
              <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-white/30">pivot</span>
              <span>{f.pivot_hint}</span>
            </div>
            {f.evidence_refs.length > 0 && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/25">
                <span className="text-white/35">⛓ provenance</span>
                <code className="truncate">{f.evidence_refs.join(" ")}</code>
              </div>
            )}
          </div>
        </div>
      </Bezel>
    </Reveal>
  );
}

/* ── Trust hierarchy bar list ───────────────────────────────────────── */
export function TrustHierarchy({ artifacts }: { artifacts: Artifact[] }) {
  const seen = new Map<string, Artifact>();
  artifacts.forEach((a) => { if (!seen.has(a.artifact_type)) seen.set(a.artifact_type, a); });
  const rows = [...seen.values()].sort((a, b) => b.trust - a.trust);
  return (
    <div className="space-y-4 p-7">
      {rows.map((a) => (
        <div key={a.artifact_type} className="flex items-center gap-4">
          <div className="w-36 shrink-0 truncate font-mono text-[12px] text-white/55">{a.artifact_type}</div>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: trustColor(a.trust), boxShadow: `0 0 12px ${trustColor(a.trust)}66` }}
              initial={{ width: 0 }} whileInView={{ width: `${a.trust * 100}%` }}
              viewport={{ once: true }} transition={{ duration: 0.9, ease: fluid }} />
          </div>
          <div className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums" style={{ color: trustColor(a.trust) }}>
            {a.trust.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Self-correction timeline ───────────────────────────────────────── */
export function CorrectionTimeline({ corrections }: { corrections: Correction[] }) {
  if (corrections.length === 0)
    return <div className="p-8 text-center font-serif text-[15px] italic text-white/40">Evidence internally consistent — no contradictions.</div>;
  return (
    <div className="relative p-7">
      <div className="absolute left-[2.45rem] top-10 bottom-10 w-px bg-gradient-to-b from-evil/40 via-white/10 to-transparent" />
      <div className="space-y-7">
        {corrections.map((c, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <div className="flex gap-4">
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-evil/15 ring-1 ring-evil/40">
                <span className="font-mono text-[11px] text-evil">{c.iteration}</span>
              </div>
              <div className="flex-1 pt-0.5">
                <div className="font-mono text-[12px] tracking-wide text-evil/90">{c.rule} · {c.technique.split(" ")[0]}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-white/70">
                  believed <span className="text-trust-high">{c.trusted}</span>, flagged{" "}
                  <span className="text-trust-low">{c.distrusted}</span> as tampered
                </div>
                <div className="mt-1.5 text-[12px] leading-relaxed text-white/40">→ {c.pivot}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Contradiction graph — clean full-width "forged vs trusted" rows ──── */
export function ContradictionGraph({ c }: { c: Case }) {
  return (
    <div className="space-y-5 p-7">
      {/* column legend */}
      <div className="flex items-center justify-between pb-1 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="text-trust-low">forged · distrusted</span>
        <span className="text-white/25">contradiction</span>
        <span className="text-trust-high">trusted · believed</span>
      </div>

      {c.findings.map((f, i) => (
        <Reveal key={i} delay={i * 0.08}>
          <div className="flex items-center gap-3">
            {/* forged source node */}
            <div className="flex w-[34%] items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trust-low/12 ring-1 ring-trust-low/40 font-mono text-[11px] text-trust-low">✕</span>
              <span className="truncate font-mono text-[12px] text-white/55">
                {f.distrusted_source.split(":").pop()}
              </span>
            </div>

            {/* animated contradiction edge + technique */}
            <div className="relative flex flex-1 items-center">
              <motion.span className="h-px flex-1 bg-gradient-to-r from-trust-low/50 via-evil/60 to-trust-high/50"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                style={{ transformOrigin: "left" }}
                transition={{ duration: 0.9, ease: fluid, delay: 0.2 + i * 0.08 }} />
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-evil/15 px-2.5 py-0.5 font-mono text-[10px] text-evil ring-1 ring-evil/25">
                {f.technique.split(" ")[0]}
              </span>
            </div>

            {/* trusted source node */}
            <div className="flex w-[34%] items-center justify-end gap-2.5">
              <span className="truncate text-right font-mono text-[12px] text-white/70">
                {f.trusted_source.split(":").pop()}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trust-high/12 ring-1 ring-trust-high/40 font-mono text-[11px] text-trust-high">✓</span>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ── Provenance audit trail — row cards, long commands handled cleanly ── */
export function ProvenanceTable({ artifacts }: { artifacts: Artifact[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 p-5 md:grid-cols-2">
      {artifacts.map((a, i) => (
        <Reveal key={i} delay={i * 0.03}>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 transition-colors hover:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <span className="font-mono text-[12px] text-white/80">{a.artifact_type}</span>
                <span className="truncate font-mono text-[11px] text-white/35">{a.source_tool}</span>
              </div>
              <span className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                style={{ color: trustColor(a.trust), background: `${trustColor(a.trust)}14` }}>
                {a.trust.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 font-mono text-[11px] text-white/25">$</span>
              <code className="truncate font-mono text-[11px] text-white/45">{a.raw_cmd.join(" ")}</code>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-white/25">
                {a.evidence_sha256 ? `sha ${a.evidence_sha256.slice(0, 10)}…` : "—"}
              </span>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
