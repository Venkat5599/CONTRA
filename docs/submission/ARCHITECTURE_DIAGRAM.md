# CONTRA — Architecture Diagram & Trust Boundaries

> Submission deliverable #3. Architectural guardrails vs prompt guardrails are marked
> explicitly. Judges should understand the system and its trust boundaries at a glance.

```
                        SIFT WORKSTATION / VPS  (Ubuntu 24.04 · .NET 9)
                ┌──────────────────────────────────────────────────────────┐
                │  REAL forensic binaries, invoked READ-ONLY                 │
                │  volatility3 · MFTECmd · PECmd · AmcacheParser · SrumECmd  │
                └───────────────┬───────────────────────────────────────────┘
                                │  argv only · shell=False · allow-list
   ════════════════════════════╪═══════════════ ARCHITECTURAL BOUNDARY ═════════
                                │  (destructive funcs DO NOT EXIST here)
                ┌───────────────▼───────────────────────────────────────────┐
                │  READ-ONLY EXECUTOR / MCP SURFACE                          │
                │  get_mft_record · list_memory_procs · get_amcache · …      │
                │  every return → {value, trust, raw_cmd, evidence_sha256}   │
                └───────────────┬───────────────────────────────────────────┘
                                │  typed, trust-tagged artifacts
                ┌───────────────▼───────────────────────────────────────────┐
                │  CONTRADICTION ENGINE  (deterministic — NOT the LLM)       │
                │  R1 timestomp · R2 fileless · R3 log-clear · R4 wipe · R5  │
                │  source disagreement → MITRE technique                     │
                └───────────────┬───────────────────────────────────────────┘
                                │  contradictions + artifacts
                ┌───────────────▼───────────────────────────────────────────┐
                │  AUTONOMOUS LOOP                                           │
                │  PLAN ──(LLM picks next tool)── ACT ── OBSERVE ──          │
                │   ── VERIFY(trust-check) ── CORRECT(re-weight + pivot)     │
                │   --max-iterations cap · JSONL trace (ts, tokens, trust)  │
                └──────┬───────────────────────────────────┬────────────────┘
       ┌ ─ ─ ─ ─ ─ ─ ─┘ PROMPT BOUNDARY (cosmetic)         │ findings = nodes + edges
       │  LLM system prompt asks it to explain reasoning.   │
       │  NOT relied on for integrity — that's enforced     │
       │  above at the architectural boundary.              │
       └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▼
                ┌───────────────────────────────────────────────────────────┐
                │  EVIDENCE CONSOLE (web)  +  INCIDENT REPORT (md)           │
                │  contradiction graph · self-correction timeline ·         │
                │  audit trail: every finding → command + SHA-256            │
                └───────────────────────────────────────────────────────────┘
```

## Trust boundaries (graded under criterion #4)

| Boundary | Enforcement | Type |
|----------|-------------|------|
| Agent cannot run destructive commands | function absent from executor/MCP surface | **ARCHITECTURAL** |
| Only known SIFT binaries run | hardcoded allow-list, `shell=False`, argv array | **ARCHITECTURAL** |
| Evidence never modified | read-only invocation, SHA-256 recorded per result | **ARCHITECTURAL** |
| LLM stays in the tool catalog | invented/unknown tool rejected before execution | **ARCHITECTURAL** |
| Agent explains each step | system-prompt instruction | prompt (cosmetic) |

The dashed line is the only prompt-based control, and nothing about evidence integrity
depends on it. The solid line is where safety actually lives: a prompt injection in the
case data cannot construct a destructive call, because no such function exists.
