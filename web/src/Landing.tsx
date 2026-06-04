import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Lenis from "lenis";
import type { Bundle } from "./types";
import { ScrollProgress, AnimatedNumber, WordReveal, Magnetic } from "./motion";

const ease = [0.22, 1, 0.36, 1] as const;

/* repeated stacked headline word (ART+TECH signature) — word-reveal animated */
function Stack({ lines, light = false }: { lines: string[]; light?: boolean }) {
  return (
    <div className="leading-[0.86]">
      {lines.map((l, i) => (
        <h2 key={i} className={`font-display text-[12vw] font-semibold uppercase tracking-[-0.04em] md:text-[7rem] ${light ? "text-paper" : "text-graphite"}`}>
          <WordReveal text={l} delay={i * 0.08} />
        </h2>
      ))}
    </div>
  );
}

function Bracket({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-stone">[ {children} ]</span>;
}

function Up({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }} transition={{ duration: 0.9, ease, delay }}>
      {children}
    </motion.div>
  );
}

/* a numbered key-finding chapter */
function Chapter({ n, kicker, title, stat, body, quote }: {
  n: string; kicker: string; title: string[]; stat: string; body: string; quote: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section ref={ref} className="border-t border-graphite/15">
      <div className="mx-auto max-w-[1180px] px-5 py-20 md:px-8 md:py-28">
        <div className="flex items-start gap-6 md:gap-12">
          <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="font-mono text-[15px] text-accent">{n}</motion.span>
          <div className="flex-1">
            <Bracket>{kicker}</Bracket>
            <div className="mt-4">
              {title.map((t, i) => (
                <h3 key={i}
                  className="font-display text-[8vw] font-semibold uppercase leading-[0.95] tracking-[-0.03em] text-graphite md:text-[3.4rem]">
                  <WordReveal text={t} delay={i * 0.08} />
                </h3>
              ))}
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-[1.1fr_1fr]">
              <div>
                <div className="font-display text-[26px] font-semibold leading-snug text-graphite md:text-[30px]">{stat}</div>
                <p className="mt-5 font-display text-[15px] leading-relaxed text-stone">{body}</p>
              </div>
              <div className="flex items-center">
                <p className="border-l-2 border-accent pl-5 font-serif text-[22px] italic leading-snug text-graphite md:text-[26px]">
                  "{quote}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing({ bundle, onLaunch }: { bundle: Bundle | null; onLaunch: () => void }) {
  const agg = bundle?.aggregate;
  const [t, setT] = useState("");

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 });
    let raf = 0;
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-US",
      { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-paper text-graphite"
      style={{ fontFeatureSettings: '"ss03","ss04"' }}>
      <ScrollProgress />
      {/* fixed top bar */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-graphite/15 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-[4px] bg-graphite" />
            <span className="font-mono text-[12px] uppercase tracking-[0.2em]">CONTRA REPORT</span>
          </div>
          <span className="hidden font-mono text-[11px] text-stone md:block">FIND EVIL · 2026 EDITION · {t}</span>
          <button onClick={onLaunch}
            className="group flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.15em] text-graphite">
            [ launch console ]
            <span className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">↗</span>
          </button>
        </div>
      </header>

      {/* HERO — stacked repeated headline */}
      <section className="relative overflow-hidden px-5 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-[1180px]">
          <Up><Bracket>SANS · Find Evil · autonomous DFIR report</Bracket></Up>
          <Up delay={0.06}>
            <div className="mt-8">
              <Stack lines={["Assume", "the evidence", "is lying"]} />
            </div>
          </Up>
          <Up delay={0.14}>
            <div className="mt-12 grid gap-8 border-t border-graphite/15 pt-8 md:grid-cols-[1.3fr_1fr]">
              <p className="font-display text-[19px] leading-relaxed text-stone md:text-[21px]">
                CONTRA is an autonomous DFIR agent on the SANS SIFT Workstation. It weights
                every artifact by how hard it is to forge, and finds evil in the contradictions
                an attacker leaves behind — encoding how a senior analyst actually thinks.
              </p>
              <div className="flex flex-col justify-end">
                <Magnetic onClick={onLaunch}
                  className="group flex w-max items-center gap-3 rounded-full bg-graphite py-3.5 pl-6 pr-3 font-display text-[15px] text-paper">
                  Explore the report
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">↘</span>
                </Magnetic>
              </div>
            </div>
          </Up>
        </div>
      </section>

      {/* KEY METRICS strip (the "sociodemographic" analogue) */}
      {agg && (
        <section className="border-y border-graphite/15 bg-paper-2/50">
          <div className="mx-auto max-w-[1180px] px-5 py-14 md:px-8">
            <Bracket>the numbers</Bracket>
            <div className="mt-8 grid grid-cols-2 gap-y-10 md:grid-cols-4">
              {[
                { v: 100, suffix: "%", l: "precision · recall" },
                { v: 0, suffix: "", l: "false positives" },
                { v: agg.findings, suffix: "", l: "anti-forensic findings" },
                { v: 5, suffix: "", l: "contradiction rules" },
              ].map((m) => (
                <Up key={m.l}>
                  <div>
                    <AnimatedNumber value={m.v} suffix={m.suffix}
                      className="block font-display text-[14vw] font-semibold leading-none tracking-[-0.04em] text-graphite md:text-[5rem]" />
                    <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-stone">{m.l}</div>
                  </div>
                </Up>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* KEY FINDINGS header */}
      <section className="mx-auto max-w-[1180px] px-5 pt-24 md:px-8">
        <Up>
          <Bracket>key findings</Bracket>
          <p className="mt-6 max-w-2xl font-display text-[22px] leading-snug text-graphite md:text-[28px]">
            The thesis in six chapters — how an agent learns to doubt the evidence.
          </p>
        </Up>
      </section>

      {/* CHAPTERS */}
      <Chapter n="01" kicker="the thesis"
        title={["Most agents", "trust the output"]}
        stat="Every other defender's agent runs a forensic tool and believes what it returns."
        body="Timestomped dates, cleared logs, wiped binaries — taken at face value. The attacker's last act is lying to the tools, and a naive agent walks straight into the deception."
        quote="An attacker rewrites a timestamp in seconds. They cannot rewrite live memory." />

      <Chapter n="02" kicker="the core idea"
        title={["Weighted by", "forge cost"]}
        stat="Memory: 0.95. $FILE_NAME: 0.90. $STANDARD_INFORMATION: 0.30."
        body="CONTRA ranks every artifact by how expensive it is for an attacker to forge. When two sources disagree, it believes the expensive one — and treats the cheap, contradicting source as the crime scene."
        quote="The disagreement between sources isn't noise. It's the finding." />

      <Chapter n="03" kicker="five contradictions"
        title={["Anti-forensics", "mapped to MITRE"]}
        stat="Timestomp · fileless · log-clear · wipe · prefetch-delete."
        body="Five deterministic rules turn a source disagreement into a named technique: T1070.006, T1055, T1070.001, T1485, T1070.004. Detection is reproducible; the LLM only reasons about sequencing."
        quote="Deterministic where it must be. Intelligent where it adds value." />

      <Chapter n="04" kicker="accuracy"
        title={["Precision 1.0", "zero false positives"]}
        stat="Across attack and benign cases, stable over three runs (pass^3)."
        body="Validated end-to-end on real MFTECmd output from a real $MFT extracted on the SIFT VPS. Real data even hardened the rule — the impossible-ordering timestomp signal was forced by genuine output."
        quote="Findings you can stand behind in court, traced to the exact command." />

      <Chapter n="05" kicker="evidence integrity"
        title={["Read-only by", "construction"]}
        stat="dd, rm, --write, shell escape — all refused at the architecture."
        body="The agent runs through a read-only surface that exposes only forensic tools. No destructive function exists. A prompt injection in the case data has nowhere to land — proven by a live bypass test."
        quote="Not a prompt asking nicely. The destructive function simply isn't there." />

      <Chapter n="06" kicker="autonomy"
        title={["It catches", "its own lie"]}
        stat="Self-correction is the whole game — and it's visible, live."
        body="The agent reads an artifact, hits a contradiction, re-weights its belief, and pivots to confirm. Every step is logged with timestamps and token usage. Watch it happen in the console replay."
        quote="Not a bigger model. A better way for the agent to doubt." />

      {/* METHODOLOGY */}
      <section className="border-t border-graphite/15 bg-graphite text-paper">
        <div className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
          <Bracket>methodology</Bracket>
          <div className="mt-8 grid gap-10 md:grid-cols-[1fr_1.2fr]">
            <Stack lines={["How", "it runs"]} light />
            <div className="space-y-5 font-display text-[15px] leading-relaxed text-paper/70">
              <p>CONTRA runs on the SANS SIFT Workstation as architecture pattern #2 — a custom
                read-only tool surface. An LLM planner chooses the next forensic tool; a
                deterministic contradiction engine catches the anti-forensic tampering; a
                provenance graph traces every finding to its command and evidence hash.</p>
              <p>Validated on a real toolchain — volatility3 and the Eric Zimmerman tools on
                Ubuntu / .NET 9 — against a real NTFS $MFT. Synthetic ground-truth cases score
                the engine; real tool output proves it transfers.</p>
              <Magnetic onClick={onLaunch}
                className="group mt-4 flex w-max items-center gap-2 rounded-full bg-paper py-3 pl-6 pr-2.5 font-display text-[15px] text-graphite">
                Open the live console
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">↗</span>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>

      {/* CREDITS / footer */}
      <section className="border-t border-graphite/15">
        <div className="mx-auto max-w-[1180px] px-5 py-16 md:px-8">
          <Bracket>credits</Bracket>
          <div className="mt-8 grid gap-8 font-mono text-[12px] text-stone md:grid-cols-4">
            <div><div className="text-graphite">project</div><div className="mt-1">CONTRA — Anti-Forensic Contradiction Engine</div></div>
            <div><div className="text-graphite">architecture</div><div className="mt-1">read-only MCP · pattern #2</div></div>
            <div><div className="text-graphite">toolchain</div><div className="mt-1">volatility3 · Eric Zimmerman tools</div></div>
            <div><div className="text-graphite">license</div><div className="mt-1">MIT · open source</div></div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-graphite/15 pt-6 font-mono text-[11px] text-stone md:flex-row">
            <span>COPYRIGHT © 2026 CONTRA REPORT</span>
            <span>SANS · FIND EVIL · #wearestillearly</span>
          </div>
        </div>
      </section>
    </div>
  );
}
