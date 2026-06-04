<div align="center">

# CONTRA

### The forensic agent that assumes the evidence is lying.

**An autonomous DFIR agent that finds evil in the contradictions an attacker leaves behind.**

[![Live Console](https://img.shields.io/badge/live%20console-contra--dfir.vercel.app-d6452e?style=for-the-badge)](https://contra-dfir.vercel.app)
[![MCP Server](https://img.shields.io/badge/MCP-installable-34d399?style=for-the-badge)](#-try-it-in-two-minutes)
[![License: MIT](https://img.shields.io/badge/license-MIT-white?style=for-the-badge)](LICENSE)

SANS **Find Evil!** · Architecture pattern #2 (Custom MCP Server) · precision **1.00** · recall **1.00** · **0** false positives

[**Live Console**](https://contra-dfir.vercel.app) · [**Try it**](#-try-it-in-two-minutes) · [**How it works**](#-how-it-works) · [**Architecture**](#-architecture) · [**Accuracy**](#-accuracy)

</div>

---

## The thesis

> An attacker can rewrite a timestamp in seconds. They cannot rewrite live memory.

Every other defender's agent runs a forensic tool and **believes the output**. But the
attacker's last act on a host is lying to those tools — timestomping the binary, clearing
the event log, wiping the dropper. An agent that trusts artifacts at face value walks
straight into the deception.

A senior analyst never does this. They rank evidence by **how expensive it is to forge**.
`$STANDARD_INFORMATION` is trivial to fake; `$FILE_NAME` needs kernel access; live memory
cannot be retroactively forged at all. When two sources disagree, the analyst believes the
expensive one — and treats the cheap, contradicting one as **the crime scene**.

**CONTRA encodes that instinct.** It assumes the evidence is lying, weights every artifact
by forge cost, and finds evil in the contradictions. Self-correction isn't *"I made a
mistake"* — it's *"the disk is gaslighting me."*

---

## ⚡ Try it in two minutes

CONTRA ships as a **real read-only MCP server**. No disk image, no VPS, no config — three
forensic sample cases are bundled. Pick a path:

### Easiest — hand the repo to Claude
Open this repo in Claude Code (or paste it to any Claude with tools) and say:
> *"Set up CONTRA and triage the sample case."*

It reads [`CLAUDE.md`](CLAUDE.md) and installs + registers + runs itself.

### Two commands — Claude Desktop
```bash
pip install "git+https://github.com/Venkat5599/CONTRA.git"
contra-setup        # auto-registers in Claude Desktop — no JSON editing
```
Fully quit & reopen Claude Desktop, then ask:
> *"List the contra cases, then triage case_blackcat and explain the evil."*

Expect:
```
MALICIOUS ACTIVITY CONFIRMED
  R1  T1070.006  Timestomp       believe $FILE_NAME  >  $STANDARD_INFORMATION (forged)
  R2  T1055      fileless         believe volatility3.pslist  >  filesystem
  R3  T1070.001  cleared logs     believe SrumECmd  >  eventlog
```
Then `triage case_clean` → **NO EVIL FOUND** (proves zero false positives).

### No client — just the engine
```bash
pip install -e .  &&  python -m contra.demo_offline
```

> Full client setup (Cursor / Cline / manual config): [`docs/submission/MCP_INSTALL.md`](docs/submission/MCP_INSTALL.md)

---

## 🧠 How it works

CONTRA decouples **judgment** (an LLM) from **truth** (a deterministic engine):

```
   LLM planner  ─ reasons about evidence reliability, picks the next forensic tool
        │
   Read-only MCP surface  ─ typed forensic tools only; no shell, no write, no delete
        │
   Contradiction engine  ─ DETERMINISTIC: diffs sources by trust, names the technique
        │
   Self-correction loop  ─ contradiction → re-weight belief → pivot to confirm
        │
   Provenance  ─ every finding → exact command + SHA-256 of the evidence
```

The LLM only decides *sequencing*. The findings — the integrity-critical part — are
deterministic and reproducible. That's the split judges can stand behind in court.

### The Evidence Trust Hierarchy

| Artifact | Forge cost | Trust |
|----------|-----------|------:|
| Memory (process, netconn, injection) | very high | **0.95** |
| `$FILE_NAME` timestamps (NTFS) | high | **0.90** |
| `$UsnJrnl` / `$LogFile` journal | high | **0.85** |
| Prefetch / Amcache / SRUM | medium-high | **0.80** |
| Windows Event Logs | clearable | **0.40** |
| `$STANDARD_INFORMATION` timestamps | trivial | **0.30** |

### Five anti-forensic contradictions → MITRE ATT&CK

| Rule | Contradiction | Technique |
|------|---------------|-----------|
| **R1** | `$SI` predates / contradicts `$FN` | T1070.006 Timestomp |
| **R2** | process in memory, no file on disk | T1055 Process Injection / fileless |
| **R3** | SRUM shows activity, event log empty | T1070.001 Clear Windows Event Logs |
| **R4** | `$UsnJrnl` create+delete, file gone | T1485 Data Destruction |
| **R5** | Amcache proves exec, no prefetch | T1070.004 File Deletion |

---

## 🛡️ Architecture

**Pattern #2 — Custom MCP Server.** The guardrail is *architectural*, not a prompt.

```
   SIFT tools (volatility3 · MFTECmd · PECmd · AmcacheParser)   ← invoked read-only
        │
  ══════╪══════════════ ARCHITECTURAL BOUNDARY ══════════════
        │   destructive functions DO NOT EXIST here
   READ-ONLY MCP SURFACE
   get_mft_record · list_memory_procs · get_amcache · triage_case · …
        │   every return → { value, trust, raw_cmd, evidence_sha256 }
   CONTRADICTION ENGINE (deterministic)  →  AUTONOMOUS LOOP  →  PROVENANCE
```

There is **no `execute_shell`, no `write_file`, no `dd`/`rm`** on the surface. A prompt
injection inside the case data cannot construct a destructive call — the function isn't
there. Verified by a **live bypass test**: `dd`, `rm`, `--write`, and a shell escape are
all refused at the architecture, while read-only calls succeed.

📄 Full diagram + trust boundaries: [`docs/submission/ARCHITECTURE_DIAGRAM.md`](docs/submission/ARCHITECTURE_DIAGRAM.md)

---

## 📊 Accuracy

Reproducible — `python -m contra.eval.run_evals --pass-k 3`:

| Case | Type | Findings | FP | FN | Precision | Recall |
|------|------|---------:|---:|---:|----------:|-------:|
| `case_blackcat` | attack | 3 / 3 | 0 | 0 | 1.00 | 1.00 |
| `case_silentexfil` | attack | 2 / 2 | 0 | 0 | 1.00 | 1.00 |
| `case_clean` | benign | 0 / 0 | 0 | 0 | 1.00 | 1.00 |
| **Aggregate** | | **5 / 5** | **0** | **0** | **1.00** | **1.00** |

Stable over `pass^3`. **Validated on real tool output** — R1 fires on a genuine timestomp
parsed from real **MFTECmd 2026.5** over a real NTFS `$MFT` extracted with Sleuthkit on a
SIFT workstation. Real data even *hardened* the rule (the impossible-ordering signal was
forced by genuine output — documented, not hidden).

📄 Full accuracy report + spoliation test: [`docs/submission/ACCURACY_REPORT.md`](docs/submission/ACCURACY_REPORT.md)

---

## 🖥️ The console

[**contra-dfir.vercel.app**](https://contra-dfir.vercel.app) — watch the agent reason,
self-correct, and catch the lie in a live **investigation replay**: plan → observe →
**CORRECT** (contradiction caught, in red) → pivot. Every finding traces to its command
and evidence hash. Switch cases to see attacks light up and the benign host stay quiet.

---

## Repository

```
contra/
  trust.py            Evidence Trust Hierarchy + trust-tagged envelope
  mcp_server.py       the installable read-only MCP surface (11 tools)
  contradiction.py    deterministic R1–R5 anti-forensic engine
  agent.py            autonomous loop · max-iter cap · JSONL traces
  planner_llm.py      LLM planner (genuine autonomous tool sequencing)
  provider_real.py    runs LIVE SIFT tools on a host over the read-only boundary
  parsers.py          real MFTECmd / volatility3 / amcache parsers
  install_desktop.py  one-command Claude Desktop installer (contra-setup)
  eval/               accuracy harness (precision/recall vs ground truth)
  fixtures/           3 sample cases + real captured MFTECmd output
web/                  the evidence console (React + Vite)
tools/vps_scripts/    provision real SIFT toolchain on a Linux host
docs/submission/      all SANS deliverables (accuracy, dataset, story, …)
tests/                21 tests — guardrail, accuracy, MCP surface, real parsers
```

```bash
pip install -e ".[dev]" && pytest -q      # 21 passing
```

---

<div align="center">

**Not a bigger model. A better way for the agent to doubt.**

Deterministic trust math under an LLM's judgment — autonomy you can stand behind.

MIT · [contra-dfir.vercel.app](https://contra-dfir.vercel.app) · `#findevil`

</div>
