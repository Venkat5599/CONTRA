# CONTRA — Project Story

> Devpost format. Submission deliverable #4.

## Inspiration

Every other defender's agent we looked at had the same blind spot: it runs a forensic
tool and **believes the output**. But a real attacker spends their last minutes on a host
doing one thing — lying to the forensic tools. They timestomp the binary, clear the event
log, wipe the dropper. An agent that trusts artifacts at face value walks straight into
the deception.

A senior analyst never does this. They rank evidence by **how expensive it is to forge**.
A `$STANDARD_INFORMATION` timestamp is trivial to fake; `$FILE_NAME` needs kernel access;
live memory cannot be retroactively forged at all. When two sources disagree, the analyst
believes the expensive one — and treats the cheap, contradicting one as the crime scene.

CONTRA encodes that instinct. **It assumes the evidence is lying, and finds evil in the
contradictions.**

## What it does

CONTRA is an autonomous DFIR agent on the SANS SIFT Workstation. Given a host's artifacts
(disk `$MFT`, memory, amcache, journals, logs), it:

1. **Plans** like an analyst — an LLM chooses the next forensic tool to run, reasoning
   about evidence reliability (memory before disk, corroborate a contradiction with a
   higher-trust source).
2. **Acts** through a read-only MCP surface — it runs real SIFT tools (MFTECmd,
   volatility3, AmcacheParser) and can *only* run those. No destructive command exists.
3. **Verifies** with a deterministic contradiction engine — it diffs sources by a trust
   hierarchy. $SI says 2019, $FN says three days ago → the 2019 date is forged → timestomp.
4. **Self-corrects** — the contradiction re-weights the agent's belief and pivots it to
   confirm (prefetch, memory, journal). Every step is logged.
5. **Reports** with full provenance — every finding traces to the exact command and a
   SHA-256 of the evidence.

## How we built it

- **Trust hierarchy + contradiction engine** (deterministic Python): 5 anti-forensic
  rules — timestomp (T1070.006), fileless (T1055), log-clear (T1070.001), wipe (T1485),
  prefetch-delete (T1070.004) — each maps a source disagreement to a MITRE technique.
- **Read-only executor**: an allow-list of forensic binaries, `shell=False`, no write
  primitive. The architectural guardrail, not a prompt.
- **Autonomous loop**: plan → act → verify → correct, with a hard `--max-iterations` cap
  and JSONL execution traces.
- **LLM planner**: OpenAI-compatible, runs on free models; the agent's reasoning chooses
  tools while the deterministic engine owns the findings.
- **Real toolchain on a SIFT VPS**: volatility3 + Eric Zimmerman tools on Ubuntu/.NET 9;
  real NTFS image → Sleuthkit `$MFT` extraction → real MFTECmd output.
- **Evidence console** (React): findings, contradiction graph, self-correction timeline,
  and a clickable audit trail — all fed by the real engine output.

## Challenges

- **Real data broke our naive rule.** On Linux-built NTFS, `$FN`-created is sparse, so
  "$SI < $FN" missed the timestomp. We hardened R1 to catch the impossible ordering
  ($SI-modified before $SI-created) and MFTECmd's own heuristics. The rule is stronger
  because real output forced it.
- **Keeping the LLM inside the boundary.** Free models drift to non-JSON; a deterministic
  coverage fallback keeps the loop correct, and the tool catalog rejects anything the model
  invents — it can never reach outside the read-only allow-list.

## What we learned

The winning architecture isn't a bigger model — it's a better way for the agent to
*doubt*. Putting deterministic trust math under the LLM's judgment gives you autonomy you
can actually stand behind in court.

## What's next

Wire the remaining rules to live memory samples, add registry-persistence and shadow-copy
deletion rules, and ship the read-only MCP server as a community SIFT package.
