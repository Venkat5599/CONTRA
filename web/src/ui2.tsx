import { motion } from "framer-motion";
import type { Case, TimelineStep } from "./types";
import { Eyebrow, Reveal, trustColor, fluid } from "./ui";

/* ── Full Evidence Trust Hierarchy (mirrors contra/trust.py) ─────────── */
const LADDER: { type: string; trust: number; forge: string; note: string }[] = [
  { type: "memory_proc", trust: 0.95, forge: "very high", note: "live RAM state — can't be retro-forged" },
  { type: "memory_netconn", trust: 0.95, forge: "very high", note: "live C2 sockets in memory" },
  { type: "memory_injection", trust: 0.93, forge: "very high", note: "injected/hollowed regions" },
  { type: "mft_fn_timestamp", trust: 0.9, forge: "high", note: "$FILE_NAME — needs kernel to forge" },
  { type: "usnjrnl", trust: 0.85, forge: "high", note: "$UsnJrnl change journal" },
  { type: "logfile", trust: 0.85, forge: "high", note: "$LogFile transactions" },
  { type: "prefetch", trust: 0.8, forge: "medium", note: "execution evidence, OS-managed" },
  { type: "amcache", trust: 0.8, forge: "medium", note: "survives binary deletion" },
  { type: "srum", trust: 0.78, forge: "medium", note: "network/app usage db" },
  { type: "shimcache", trust: 0.75, forge: "medium", note: "app compat cache" },
  { type: "registry_value", trust: 0.7, forge: "medium", note: "hive values" },
  { type: "eventlog", trust: 0.4, forge: "medium", note: "clearable / forgeable" },
  { type: "mft_si_timestamp", trust: 0.3, forge: "trivial", note: "$STANDARD_INFO — timestomp target" },
  { type: "file_content_mtime", trust: 0.2, forge: "trivial", note: "app-set, trivially forged" },
];

export function TrustLadder() {
  return (
    <div className="p-6">
      <div className="space-y-1.5">
        {LADDER.map((r, i) => (
          <Reveal key={r.type} delay={i * 0.02}>
            <div className="flex items-center gap-4 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.03]">
              <div className="w-12 text-right font-mono text-[13px] font-semibold" style={{ color: trustColor(r.trust) }}>
                {r.trust.toFixed(2)}
              </div>
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.trust * 100}%`, background: trustColor(r.trust) }} />
              </div>
              <div className="w-44 font-mono text-[12px] text-white/70">{r.type}</div>
              <div className="hidden flex-1 text-[12px] text-white/40 md:block">{r.note}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-white/30">{r.forge}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[11px] text-white/35">
        <span className="text-trust-low">↓ cheap to forge — distrust</span>
        <span className="text-trust-high">hard to forge — believe ↑</span>
      </div>
    </div>
  );
}

/* ── Architecture data-flow ─────────────────────────────────────────── */
const FLOW = [
  { k: "SIFT binaries", d: "volatility3 · MFTECmd · PECmd · AmcacheParser", tag: "read-only" },
  { k: "Custom MCP server", d: "typed functions only — no shell, no write primitive", tag: "architectural guard" },
  { k: "Contradiction engine", d: "deterministic diff — R1…R5 anti-forensic rules", tag: "no LLM" },
  { k: "Autonomous loop", d: "plan → act → verify(trust) → correct · max-iter cap", tag: "self-correcting" },
  { k: "Provenance graph", d: "every finding → raw_cmd + sha-256", tag: "audit trail" },
];

export function ArchitectureFlow() {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-3">
        {FLOW.map((s, i) => (
          <Reveal key={s.k} delay={i * 0.05}>
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-mono text-[12px] text-white/50">
                {i + 1}
              </div>
              <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-[15px] text-white/85">{s.k}</span>
                  <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/45">{s.tag}</span>
                </div>
                <div className="mt-1 font-mono text-[12px] text-white/40">{s.d}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Guardrail / spoliation proof (criterion #4) ────────────────────── */
export function GuardrailSplit() {
  const blocked = ["dd if=/dev/zero of=/dev/sda", "rm -rf /evidence", "mkfs.ext4 /dev/sdb1", "vol --write …"];
  return (
    <div className="grid gap-5 p-6 md:grid-cols-2">
      <div className="rounded-2xl border border-trust-high/20 bg-trust-high/[0.04] p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-trust-high">architectural · enforced</div>
        <ul className="mt-3 space-y-2 text-[13px] text-white/70">
          <li>read-only MCP surface — destructive fns absent</li>
          <li>image mounted <span className="font-mono text-white/50">ro</span>, sha-256 verified</li>
          <li>binary allow-list, <span className="font-mono text-white/50">shell=False</span></li>
        </ul>
      </div>
      <div className="rounded-2xl border border-evil/20 bg-evil/[0.04] p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-evil">injected attempts · refused</div>
        <ul className="mt-3 space-y-2 font-mono text-[12px] text-white/55">
          {blocked.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <span className="text-evil">✕</span><span className="line-through decoration-white/20">{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 text-[12px] text-white/40">no code path reaches a destructive syscall — proven by 6 tests.</div>
      </div>
    </div>
  );
}

/* ── Full iteration timeline strip ──────────────────────────────────── */
export function IterationTimeline({ steps }: { steps: TimelineStep[] }) {
  const color = (e: string) => e === "CORRECT" ? "var(--color-evil)" : e === "observe" ? "var(--color-trust-high)" : "rgba(255,255,255,0.4)";
  return (
    <div className="overflow-x-auto p-6">
      <div className="flex min-w-max items-stretch gap-2">
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.03, ease: fluid }}
            className="flex w-28 shrink-0 flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="font-mono text-[10px] text-white/30">iter {s.iteration}</div>
            <div className="mt-1 font-mono text-[11px] font-semibold" style={{ color: color(s.event) }}>{s.event}</div>
            <div className="mt-1 truncate font-mono text-[10px] text-white/45">
              {s.tool ?? (s.technique ? s.technique.split(" ")[0] : "")}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Section heading helper for the lower half ──────────────────────── */
export function BigSection({ eyebrow, title, sub, children }: {
  eyebrow: string; title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <section className="mt-28">
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">{title}</h2>
        {sub && <p className="mt-4 max-w-2xl font-serif text-lg italic text-white/50">{sub}</p>}
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function _typecheck(_c: Case) {}
