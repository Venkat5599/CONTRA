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
      <div className="grain" />

      <nav className="fixed inset-x-0 top-0 z-40 flex justify-center">
        <div className="mx-auto mt-6 flex w-max items-center gap-4 rounded-full border border-white/10 bg-black/50 px-5 py-2.5 backdrop-blur-2xl">
          <button onClick={onBack} className="font-mono text-[12px] text-white/55 transition-colors hover:text-white">← back</button>
          <span className="h-3 w-px bg-white/15" />
          <span className="font-display text-[15px] font-bold tracking-tight text-white">CONTRA</span>
          <span className="font-mono text-[11px] text-white/45">console</span>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1180px] px-4 pb-32 pt-32 md:px-8">
        <Reveal delay={0.05}>
          <div className="flex flex-col gap-3 md:flex-row">
            <StatTile label="cases triaged" value={String(agg.cases)} />
            <StatTile label="evil found" value={String(agg.findings)} accent="var(--color-evil)" />
            <StatTile label="false positives" value={String(agg.false_positives)} accent="var(--color-trust-high)" />
            <StatTile label="missed artifacts" value={String(agg.false_negatives)} accent="var(--color-trust-high)" />
          </div>
        </Reveal>

        <div className="mt-12 flex flex-wrap gap-2">
          {bundle.cases.map((cc, i) => (
            <button key={cc.name} onClick={() => setActive(i)}
              className="group rounded-full border px-4 py-2 font-mono text-[12px] transition-all duration-500 ease-fluid"
              style={{
                borderColor: i === active ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.1)",
                background: i === active ? "rgba(244,63,94,0.1)" : "rgba(255,255,255,0.02)",
                color: i === active ? "#fb7185" : "rgba(255,255,255,0.5)",
              }}>
              {cc.name}<span className="ml-2 text-white/30">{cc.findings.length}</span>
            </button>
          ))}
        </div>

        <motion.div key={c.name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: fluid }} className="mt-6">
          <Bezel>
            <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-6">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">verdict</div>
                <div className="mt-1 font-display text-2xl font-semibold"
                  style={{ color: c.findings.length ? "var(--color-evil)" : "var(--color-trust-high)" }}>{c.verdict}</div>
              </div>
              <div className="flex gap-8 font-mono text-[13px]">
                <div><div className="text-white/40">iterations</div><div className="text-white/80">{c.iterations}</div></div>
                <div><div className="text-white/40">self-corrections</div><div className="text-white/80">{c.corrections.length}</div></div>
                <div><div className="text-white/40">precision</div><div className="text-trust-high">{precision.toFixed(2)}</div></div>
                <div><div className="text-white/40">recall</div><div className="text-trust-high">{c.score.recall.toFixed(2)}</div></div>
              </div>
            </div>
          </Bezel>
        </motion.div>

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
