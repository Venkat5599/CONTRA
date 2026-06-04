import { useState } from "react";
import { motion } from "framer-motion";
import type { Bundle, Case } from "./types";
import {
  Bezel, Reveal, StatTile, FindingCard, TrustHierarchy,
  CorrectionTimeline, ContradictionGraph, ProvenanceTable, fluid,
} from "./ui";
import {
  TrustLadder, ArchitectureFlow, GuardrailSplit, IterationTimeline, BigSection,
} from "./ui2";
import Player from "./Player";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 font-mono text-[12px] uppercase tracking-[0.18em] text-white/40">{children}</div>;
}

export default function Console({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
  const [active, setActive] = useState(0);
  const c: Case = bundle.cases[active];
  const agg = bundle.aggregate;
  const precision = c.score.detected ? c.score.true_positives / c.score.detected : 1;

  return (
    <div className="relative min-h-[100dvh] bg-void text-white/90">
      <div className="mesh-field" />
      <div className="grid-field" />
      <div className="grain" />

      <nav className="fixed inset-x-0 top-0 z-40 flex justify-center">
        <div className="mx-auto mt-6 flex w-max items-center gap-4 rounded-full border border-white/10 bg-black/60 px-5 py-2.5 backdrop-blur-2xl">
          <button onClick={onBack} className="group flex items-center gap-1.5 font-mono text-[12px] text-white/55 transition-colors hover:text-white">
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">←</span> back
          </button>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-display text-[15px] font-bold tracking-tight text-white">CONTRA</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/45">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-trust-high" /> live console
          </span>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-40 pt-40 md:px-8">
        {/* console title */}
        <Reveal>
          <div className="mb-16 flex items-end justify-between border-b border-white/8 pb-8">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/35">autonomous DFIR · evidence console</div>
              <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-white md:text-6xl">Find Evil.</h1>
            </div>
            <div className="hidden text-right font-mono text-[11px] leading-relaxed text-white/35 md:block">
              read-only MCP<br />trust-weighted engine
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-x-10 gap-y-12 md:flex md:gap-x-12">
          <StatTile index={0} label="cases triaged" value={String(agg.cases)} />
          <StatTile index={1} label="evil found" value={String(agg.findings)} accent="var(--color-evil)" />
          <StatTile index={2} label="false positives" value={String(agg.false_positives)} accent="var(--color-trust-high)" />
          <StatTile index={3} label="missed artifacts" value={String(agg.false_negatives)} accent="var(--color-trust-high)" />
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-2">
          <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">case</span>
          {bundle.cases.map((cc, i) => (
            <button key={cc.name} onClick={() => setActive(i)}
              className="group relative rounded-full border px-4 py-2 font-mono text-[12px] transition-all duration-500 ease-fluid hover:scale-[1.03]"
              style={{
                borderColor: i === active ? "rgba(244,63,94,0.45)" : "rgba(255,255,255,0.1)",
                background: i === active ? "rgba(244,63,94,0.12)" : "rgba(255,255,255,0.02)",
                color: i === active ? "#fb7185" : "rgba(255,255,255,0.55)",
                boxShadow: i === active ? "0 0 24px rgba(244,63,94,0.25)" : "none",
              }}>
              {cc.name}
              <span className="ml-2 rounded-full px-1.5 py-0.5 text-[10px]"
                style={{ background: i === active ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.06)", color: i === active ? "#fb7185" : "rgba(255,255,255,0.4)" }}>
                {cc.findings.length}
              </span>
            </button>
          ))}
        </div>

        <motion.div key={c.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: fluid }} className="mt-10">
          <Bezel>
            <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden px-8 py-9">
              {/* verdict-colored side glow */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
                style={{ background: c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)",
                         boxShadow: `0 0 30px ${c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)"}` }} />
              <div className="pl-3">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                  <motion.span className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)" }}
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  verdict
                </div>
                <div className="mt-2 font-display text-2xl font-semibold md:text-3xl"
                  style={{ color: c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)",
                           textShadow: `0 0 40px ${c.findings.length ? "rgba(244,63,94,0.4)" : "rgba(52,211,153,0.4)"}` }}>
                  {c.verdict}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-mono text-[13px] md:flex md:gap-9">
                {[
                  ["iterations", String(c.iterations), "text-white/85"],
                  ["self-corrections", String(c.corrections.length), "text-evil"],
                  ["precision", precision.toFixed(2), "text-trust-high"],
                  ["recall", c.score.recall.toFixed(2), "text-trust-high"],
                ].map(([l, v, col]) => (
                  <div key={l}>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">{l}</div>
                    <div className={`mt-0.5 text-lg ${col}`}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Bezel>
        </motion.div>

        {/* Investigation Player — watch the agent reason + self-correct live */}
        <div className="mt-16">
          <SectionLabel>▶ investigation replay · watch it catch the lie</SectionLabel>
          <Bezel><Player c={c} /></Bezel>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-12">
          <div className="md:col-span-7">
            <SectionLabel>findings · traced to evidence</SectionLabel>
            <div className="space-y-5">
              {c.findings.length === 0
                ? <Bezel><div className="p-8 text-center font-serif text-lg italic text-trust-high">No evil. Evidence held up under scrutiny.</div></Bezel>
                : c.findings.map((f, i) => <FindingCard key={i} f={f} i={i} />)}
            </div>
          </div>
          <div className="space-y-5 md:col-span-5">
            <div><SectionLabel>self-correction trace</SectionLabel><Bezel><CorrectionTimeline corrections={c.corrections} /></Bezel></div>
            <div><SectionLabel>evidence trust hierarchy</SectionLabel><Bezel><TrustHierarchy artifacts={c.artifacts} /></Bezel></div>
          </div>
          <div className="md:col-span-7">
            <SectionLabel>contradiction graph · forged vs trusted</SectionLabel><Bezel><ContradictionGraph c={c} /></Bezel>
          </div>
          <div className="md:col-span-5">
            <SectionLabel>audit trail · finding → tool exec</SectionLabel><Bezel><ProvenanceTable artifacts={c.artifacts} /></Bezel>
          </div>
        </div>

        <div className="mt-10">
          <SectionLabel>autonomous execution · iteration by iteration</SectionLabel>
          <Bezel><IterationTimeline steps={c.timeline} /></Bezel>
        </div>

        <BigSection eyebrow="architecture · pattern #2"
          title="The agent cannot run a destructive command."
          sub="Not because a prompt forbids it — because the function does not exist on the MCP surface.">
          <Bezel><ArchitectureFlow /></Bezel>
        </BigSection>
        <BigSection eyebrow="the core idea"
          title="Evidence weighted by what it costs to forge."
          sub="When two sources disagree, believe the harder-to-forge one. The disagreement itself is the evil.">
          <Bezel><TrustLadder /></Bezel>
        </BigSection>
        <BigSection eyebrow="evidence integrity · criterion #4"
          title="Spoliation is impossible by construction."
          sub="Prompt-injected destruction attempts have nowhere to land.">
          <Bezel><GuardrailSplit /></Bezel>
        </BigSection>

        <Reveal delay={0.1}>
          <div className="mt-28 text-center font-mono text-[11px] text-white/25">
            {bundle.generated_by} · every finding is reproducible · read-only MCP · MIT
          </div>
        </Reveal>
      </main>
    </div>
  );
}
