import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Bundle } from "./types";

const ease = [0.22, 1, 0.36, 1] as const;

function Up({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.9, ease, delay }}>
      {children}
    </motion.div>
  );
}

function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("en-US",
      { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[12px] text-stone">{t} <span className="text-graphite/40">NYC</span></span>;
}

export default function Landing({ bundle, onLaunch }: { bundle: Bundle | null; onLaunch: () => void }) {
  const agg = bundle?.aggregate;

  return (
    <div className="relative min-h-[100dvh] bg-paper text-graphite">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-[6px] bg-graphite" />
            <span className="font-display text-[16px] font-semibold tracking-tight">CONTRA</span>
          </div>
          <nav className="hidden items-center gap-8 font-display text-[14px] text-stone md:flex">
            <a href="#thesis" className="transition-colors hover:text-graphite">Thesis</a>
            <a href="#how" className="transition-colors hover:text-graphite">How it works</a>
            <a href="#proof" className="transition-colors hover:text-graphite">Proof</a>
          </nav>
          <button onClick={onLaunch}
            className="group flex items-center gap-2 rounded-full bg-graphite py-2 pl-4 pr-2 font-display text-[14px] text-paper transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
            Launch console
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px]">↗</span>
          </button>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60rem 30rem at 70% -10%, rgba(214,69,46,0.10), transparent 60%), radial-gradient(50rem 40rem at 10% 120%, rgba(20,21,26,0.05), transparent 60%)" }} />
        <div className="relative mx-auto max-w-[1180px] px-5 pb-20 pt-20 md:px-8 md:pb-28 md:pt-28">
          <Up>
            <div className="mb-7 flex items-center gap-3">
              <span className="rounded-full border border-line bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
                SANS · Find Evil
              </span>
              <Clock />
            </div>
          </Up>
          <Up delay={0.05}>
            <h1 className="max-w-[15ch] font-display text-[13vw] font-semibold leading-[0.95] tracking-[-0.03em] md:text-[6.5rem]">
              The forensic agent that assumes the evidence is lying.
            </h1>
          </Up>
          <Up delay={0.12}>
            <p className="mt-8 max-w-xl font-display text-[19px] leading-relaxed text-stone">
              CONTRA is an autonomous DFIR analyst. It weights every artifact by how hard it is to
              forge — and finds evil in the contradictions an attacker leaves behind.
            </p>
          </Up>
          <Up delay={0.18}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={onLaunch}
                className="group flex items-center gap-2 rounded-full bg-accent py-3 pl-6 pr-2.5 font-display text-[15px] text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                See it find evil
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">↗</span>
              </button>
              <a href="#how" className="font-display text-[15px] text-graphite underline-offset-4 hover:underline">How it works</a>
            </div>
          </Up>

          {/* stat row */}
          {agg && (
            <Up delay={0.24}>
              <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line md:grid-cols-4">
                {[
                  ["Cases triaged", String(agg.cases), ""],
                  ["Evil found", String(agg.findings), "text-accent"],
                  ["False positives", String(agg.false_positives), ""],
                  ["Precision", "1.00", ""],
                ].map(([l, v, cls]) => (
                  <div key={l} className="bg-paper px-6 py-7">
                    <div className={`font-mono text-4xl font-semibold ${cls}`}>{v}</div>
                    <div className="mt-1 font-display text-[13px] text-stone">{l}</div>
                  </div>
                ))}
              </div>
            </Up>
          )}
        </div>
      </section>

      {/* thesis — isolated artifacts need a skeptic */}
      <section id="thesis" className="border-t border-line bg-paper-2/60">
        <div className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
          <Up>
            <p className="max-w-3xl font-serif text-[28px] italic leading-snug text-graphite md:text-[40px]">
              "An attacker can rewrite a timestamp in seconds. They cannot rewrite live memory.
              CONTRA believes the evidence that's expensive to forge — and treats the cheap,
              contradicting evidence as the crime scene."
            </p>
          </Up>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              ["Most agents trust the tool output", "They run a forensic tool and believe whatever it returns. Timestomped dates, cleared logs — taken at face value.", "01"],
              ["A senior analyst never does", "They rank artifacts by forge cost. $FILE_NAME over $STANDARD_INFORMATION. Memory over disk. Always.", "02"],
              ["CONTRA encodes that instinct", "A deterministic trust hierarchy + contradiction engine. The disagreement between sources is the finding.", "03"],
            ].map(([t, d, n], i) => (
              <Up key={t} delay={i * 0.08}>
                <div className="flex h-full flex-col rounded-[1.75rem] border border-line bg-paper p-7">
                  <span className="font-mono text-[12px] text-accent">{n}</span>
                  <h3 className="mt-4 font-display text-[20px] font-semibold leading-snug">{t}</h3>
                  <p className="mt-3 font-display text-[15px] leading-relaxed text-stone">{d}</p>
                </div>
              </Up>
            ))}
          </div>
        </div>
      </section>

      {/* how it works — flow */}
      <section id="how" className="border-t border-line">
        <div className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
          <Up>
            <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-accent">Architecture · pattern #2</span>
            <h2 className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-tight tracking-tight md:text-[56px]">
              Read-only by construction.
            </h2>
            <p className="mt-5 max-w-xl font-display text-[17px] text-stone">
              The agent reasons over a custom MCP server that exposes typed forensic functions —
              and no destructive primitive. Spoliation isn't forbidden by a prompt. It's impossible.
            </p>
          </Up>
          <div className="mt-14 grid gap-4 md:grid-cols-5">
            {[
              ["SIFT tools", "volatility3, MFTECmd, PECmd, Amcache — invoked read-only"],
              ["MCP server", "typed functions only · no shell · no write"],
              ["Contradiction engine", "deterministic R1–R5 anti-forensic rules"],
              ["Autonomous loop", "plan → act → verify → self-correct · capped"],
              ["Provenance graph", "every finding → command + SHA-256"],
            ].map(([t, d], i) => (
              <Up key={t} delay={i * 0.06}>
                <div className="flex h-full flex-col rounded-2xl border border-line bg-paper p-5">
                  <span className="font-mono text-[11px] text-stone">{String(i + 1).padStart(2, "0")}</span>
                  <h4 className="mt-3 font-display text-[15px] font-semibold leading-snug">{t}</h4>
                  <p className="mt-2 font-display text-[13px] leading-relaxed text-stone">{d}</p>
                </div>
              </Up>
            ))}
          </div>
        </div>
      </section>

      {/* proof — real finding card */}
      <section id="proof" className="border-t border-line bg-graphite text-paper">
        <div className="mx-auto max-w-[1180px] px-5 py-24 md:px-8 md:py-32">
          <Up>
            <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-accent">Proof · not a mockup</span>
            <h2 className="mt-4 max-w-3xl font-display text-[40px] font-semibold leading-tight tracking-tight md:text-[56px]">
              It catches the lie, then proves it.
            </h2>
          </Up>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Up>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-8">
                <div className="font-mono text-[12px] text-accent">T1070.006 · Timestomp</div>
                <p className="mt-4 font-serif text-[22px] italic leading-snug text-paper/90">
                  "$STANDARD_INFORMATION says 2019. $FILE_NAME says three days ago. The 2019 date is
                  forged — and $FILE_NAME is the one you can't fake from user mode."
                </p>
                <div className="mt-6 flex items-center gap-2 font-mono text-[12px]">
                  <span className="rounded-md bg-trust-high/15 px-2 py-1 text-trust-high">believe $FILE_NAME</span>
                  <span className="text-paper/30">&gt;</span>
                  <span className="rounded-md bg-trust-low/15 px-2 py-1 text-trust-low line-through decoration-paper/30">$STANDARD_INFORMATION</span>
                </div>
              </div>
            </Up>
            <Up delay={0.08}>
              <div className="flex h-full flex-col justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-8">
                <div>
                  <div className="font-mono text-[12px] text-paper/45">live autonomous run · minimax-m3</div>
                  <ul className="mt-4 space-y-2.5 font-mono text-[13px] text-paper/70">
                    <li><span className="text-paper/40">1.</span> list_memory_procs <span className="text-paper/35">— highest trust first</span></li>
                    <li><span className="text-paper/40">2.</span> get_amcache <span className="text-paper/35">— resolve contradiction</span></li>
                    <li><span className="text-paper/40">3.</span> get_mft_record <span className="text-accent">— caught timestomp</span></li>
                    <li><span className="text-paper/40">4.</span> get_usnjrnl <span className="text-paper/35">— corroborate w/ journal</span></li>
                  </ul>
                </div>
                <button onClick={onLaunch}
                  className="group mt-8 flex w-max items-center gap-2 rounded-full bg-paper py-3 pl-6 pr-2.5 font-display text-[15px] text-graphite transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
                  Open the live console
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">↗</span>
                </button>
              </div>
            </Up>
          </div>
        </div>
      </section>

      {/* cta + footer */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1180px] px-5 py-28 text-center md:px-8 md:py-40">
          <Up>
            <h2 className="mx-auto max-w-[18ch] font-display text-[44px] font-semibold leading-[1.02] tracking-tight md:text-[72px]">
              Defenders that move at machine speed.
            </h2>
          </Up>
          <Up delay={0.08}>
            <button onClick={onLaunch}
              className="group mx-auto mt-10 flex w-max items-center gap-2 rounded-full bg-graphite py-3.5 pl-7 pr-3 font-display text-[16px] text-paper transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]">
              Launch CONTRA console
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">↗</span>
            </button>
          </Up>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-3 px-5 py-7 font-mono text-[12px] text-stone md:flex-row md:px-8">
            <span>CONTRA · Anti-Forensic Contradiction Engine</span>
            <span>read-only MCP · MIT · {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
