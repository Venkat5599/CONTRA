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
  const col = accent ?? "white";
  const numeric = /^\d+$/.test(value);
  return (
    <motion.div className="flex-1"
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7, ease: fluid, delay: index * 0.07 }}
      whileHover={{ y: -4 }}>
      <Bezel>
        <div className="group relative overflow-hidden px-5 py-7">
          {/* accent glow bloom */}
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
            style={{ background: col }} />
          <div className="absolute right-4 top-4 font-mono text-[10px] text-white/20">0{index + 1}</div>
          <div className="relative font-mono text-5xl font-semibold tabular-nums"
            style={{ color: col, textShadow: accent ? `0 0 30px ${col}55` : "none" }}>
            {numeric ? <CountUp to={parseInt(value, 10)} /> : value}
          </div>
          <div className="relative mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
        </div>
      </Bezel>
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
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold"
              style={{ background: `${sevColor[f.severity]}1a`, color: sevColor[f.severity] }}>
              {f.rule_id} · {f.severity}
            </span>
            <span className="font-mono text-[12px] text-white/45">{f.technique.split(" ")[0]}</span>
          </div>
          <h3 className="mt-3 font-display text-[19px] leading-snug text-white/90">
            {f.technique.split(" ").slice(1).join(" ")}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.summary}</p>

          <div className="mt-5 flex items-center gap-2 text-[12px]">
            <span className="rounded-md bg-trust-high/10 px-2 py-1 font-mono text-trust-high">
              believe {f.trusted_source}
            </span>
            <span className="text-white/30">&gt;</span>
            <span className="rounded-md bg-trust-low/10 px-2 py-1 font-mono text-trust-low line-through decoration-white/30">
              {f.distrusted_source}
            </span>
          </div>
          <div className="mt-4 border-t border-white/5 pt-3 text-[12px] text-white/40">
            <span className="text-white/55">pivot →</span> {f.pivot_hint}
          </div>
          {f.evidence_refs.length > 0 && (
            <div className="mt-2 font-mono text-[11px] text-white/30">
              ⛓ {f.evidence_refs.join(" ")}
            </div>
          )}
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
    <div className="space-y-3 p-6">
      {rows.map((a) => (
        <div key={a.artifact_type} className="flex items-center gap-3">
          <div className="w-40 truncate font-mono text-[12px] text-white/60">{a.artifact_type}</div>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: trustColor(a.trust) }}
              initial={{ width: 0 }} whileInView={{ width: `${a.trust * 100}%` }}
              viewport={{ once: true }} transition={{ duration: 0.9, ease: fluid }} />
          </div>
          <div className="w-10 text-right font-mono text-[12px]" style={{ color: trustColor(a.trust) }}>
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
    return <div className="p-6 text-[14px] text-white/40">Evidence internally consistent — no contradictions.</div>;
  return (
    <div className="relative p-6">
      <div className="absolute left-[2.05rem] top-8 bottom-8 w-px bg-gradient-to-b from-evil/40 via-white/10 to-transparent" />
      <div className="space-y-5">
        {corrections.map((c, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <div className="flex gap-4">
              <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-evil/15 ring-1 ring-evil/40">
                <span className="font-mono text-[10px] text-evil">{c.iteration}</span>
              </div>
              <div>
                <div className="font-mono text-[12px] text-evil/90">{c.rule} · {c.technique.split(" ")[0]}</div>
                <div className="mt-0.5 text-[13px] text-white/70">
                  believed <span className="text-trust-high">{c.trusted}</span>, flagged{" "}
                  <span className="text-trust-low">{c.distrusted}</span> as tampered
                </div>
                <div className="mt-0.5 text-[12px] text-white/40">→ {c.pivot}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Contradiction graph (SVG): trusted vs distrusted, evil edge ────── */
export function ContradictionGraph({ c }: { c: Case }) {
  const f = c.findings;
  const W = 520, rowH = 92, H = Math.max(160, f.length * rowH + 40);
  return (
    <div className="overflow-x-auto p-6">
      <svg width={W} height={H} className="min-w-[520px]">
        {f.map((finding, i) => {
          const y = 40 + i * rowH;
          return (
            <g key={i}>
              {/* distrusted node (left, forgeable) */}
              <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}>
                <circle cx={70} cy={y} r={26} fill="var(--color-trust-low)" fillOpacity={0.12}
                  stroke="var(--color-trust-low)" strokeOpacity={0.5} />
                <text x={70} y={y - 34} textAnchor="middle" className="fill-white/45"
                  style={{ font: "500 10px JetBrains Mono" }}>forged</text>
                {/* evil contradiction edge */}
                <motion.line x1={96} y1={y} x2={W - 96} y2={y}
                  stroke="var(--color-evil)" strokeWidth={2} strokeDasharray="5 5"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.2 + i * 0.08, ease: fluid }} />
                <rect x={W / 2 - 52} y={y - 12} width={104} height={24} rx={12}
                  fill="var(--color-evil)" fillOpacity={0.15} />
                <text x={W / 2} y={y + 4} textAnchor="middle" className="fill-current"
                  style={{ font: "600 10px JetBrains Mono", fill: "var(--color-evil)" }}>
                  {finding.technique.split(" ")[0]}
                </text>
                {/* trusted node (right, hard to forge) */}
                <circle cx={W - 70} cy={y} r={26} fill="var(--color-trust-high)" fillOpacity={0.12}
                  stroke="var(--color-trust-high)" strokeOpacity={0.5} />
                <text x={W - 70} y={y - 34} textAnchor="middle" className="fill-white/45"
                  style={{ font: "500 10px JetBrains Mono" }}>trusted</text>
                <text x={70} y={y + 44} textAnchor="middle" className="fill-white/40"
                  style={{ font: "400 9px JetBrains Mono" }}>{finding.distrusted_source.split(":").pop()}</text>
                <text x={W - 70} y={y + 44} textAnchor="middle" className="fill-white/40"
                  style={{ font: "400 9px JetBrains Mono" }}>{finding.trusted_source.split(":").pop()}</text>
              </motion.g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Provenance table (the audit trail) ─────────────────────────────── */
export function ProvenanceTable({ artifacts }: { artifacts: Artifact[] }) {
  return (
    <div className="overflow-x-auto p-6">
      <table className="w-full text-left font-mono text-[12px]">
        <thead>
          <tr className="text-white/40">
            <th className="pb-3 font-medium">artifact</th>
            <th className="pb-3 font-medium">tool</th>
            <th className="pb-3 font-medium">trust</th>
            <th className="pb-3 font-medium">command</th>
            <th className="pb-3 font-medium">sha-256</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((a, i) => (
            <tr key={i} className="border-t border-white/5 text-white/65">
              <td className="py-2 pr-4">{a.artifact_type}</td>
              <td className="py-2 pr-4 text-white/45">{a.source_tool}</td>
              <td className="py-2 pr-4" style={{ color: trustColor(a.trust) }}>{a.trust.toFixed(2)}</td>
              <td className="py-2 pr-4 text-white/45">{a.raw_cmd.join(" ")}</td>
              <td className="py-2 text-white/30">{(a.evidence_sha256 || "—").slice(0, 12)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
