# CONTRA — Product Requirements Document

> **Anti-Forensic Contradiction Engine** — an autonomous DFIR agent that assumes the
> evidence is lying and finds evil by catching the contradictions between artifacts that
> can be forged and artifacts that cannot.
>
> Submission target: SANS **Find Evil!** hackathon. Architecture pattern #2 (Custom MCP Server).

---

## 1. The thesis

Every other submission will build an agent that runs forensic tools and trusts the output.
A senior analyst never does — the adversary actively tampers with artifacts (timestomping,
log clearing, anti-forensic deletion). CONTRA encodes the analyst's mental model as a
**trust hierarchy**: each artifact is weighted by how expensive it is for an attacker to forge.

When two sources disagree, CONTRA does not average and does not guess. It believes the
higher-trust source and raises the tampering itself as a finding — the contradiction *is* the
evil. Self-correction is not "I made a mistake," it is "the disk is gaslighting me."

This maps directly onto the judging rubric's most-weighted criterion (#1 autonomous
self-correction) and the criterion most teams will fake (#4 architectural guardrails).

---

## 2. Goals & non-goals

### Goals
- Fully autonomous triage loop over a single Windows host (disk image + memory image).
- Custom **read-only** MCP server wrapping real SIFT binaries — destructive commands are
  *physically absent* from the tool surface (architectural guardrail, not a prompt).
- Deterministic **contradiction engine** that flags source disagreements as anti-forensic TTPs.
- Trust-weighted confidence scoring so confirmed findings are distinguished from inferences.
- Provenance graph: every finding traces to the exact tool execution + evidence hash.
- Measured self-correction: hallucination/false-trust count at iteration 1 vs final.

### Non-goals (explicit scope cuts for the 12-day window)
- No Linux, macOS, cloud, or network-capture analysis. Windows only.
- No remediation/containment actions. Read + report only.
- No multi-host correlation. One host, two evidence sources.
- No fine-tuning. Off-the-shelf LLM (Claude) driving the loop via the MCP tools.

---

## 3. Users

| User | Need CONTRA meets |
|------|-------------------|
| SOC L1/L2 analyst at 3 AM | autonomous first-pass triage that flags tampering humans miss under time pressure |
| DFIR lead | provenance trail to defend findings in court — no evidence spoliation |
| Hackathon judge (Mandiant/DOJ/FBI forensics) | sees the agent get fooled, then catch the lie, on real data, with traces |

---

## 4. The core mechanism

### 4.1 Evidence Trust Hierarchy

| Artifact | Forge cost | Trust |
|---|---|---|
| RAM (live process, injected code, sockets) | very high | 0.95 |
| `$FILE_NAME` timestamps (NTFS, needs kernel) | high | 0.90 |
| `$LogFile` / `$UsnJrnl` journal | high | 0.85 |
| Prefetch / Amcache / SRUM | medium-high | 0.80 |
| Windows Event Logs | clearable | 0.40 |
| `$STANDARD_INFORMATION` timestamps | trivial (timestomp) | 0.30 |
| File content mtime (app-set) | trivial | 0.20 |

### 4.2 Contradiction → Anti-Forensic mapping

| Contradiction | Conclusion | MITRE |
|---|---|---|
| `$SI` time ≪ `$FN` time | timestomping | T1070.006 |
| process in RAM, binary not on disk | fileless / hollowing | T1055 |
| Event log "no logon" but SRUM shows net activity | log cleared | T1070.001 |
| Amcache has exec record, MFT says never existed | anti-forensic delete | T1070.004 |
| Prefetch run-count > 0, no persistence found | hidden persistence (ADS/WMI) → pivot | T1547 |
| `$UsnJrnl` create+delete, file gone | wipe attempt → carve slack | T1485 |

Each row is a self-correction trigger: a deterministic diff fires, the LLM names the
technique, the agent re-weights and pivots.

---

## 5. Functional requirements

| ID | Requirement | Maps to judging |
|----|-------------|-----------------|
| FR-1 | MCP server exposes ONLY read functions; no shell/exec/write primitive | #4 |
| FR-2 | Every tool return is a trust-tagged envelope: value, source_tool, trust, raw_cmd, sha256 | #5 |
| FR-3 | Image opened read-only; loop-mount or forensic lib enforces no-write at OS level | #4 |
| FR-4 | Contradiction engine runs deterministically over collected artifacts | #2 |
| FR-5 | Agent loop has hard `--max-iterations` cap and graceful termination | #1 |
| FR-6 | Each iteration logged to JSONL: ts, tool, tokens, trust, contradiction, correction | #1, #8 |
| FR-7 | Findings emitted as graph nodes + contradiction edges; node→provenance clickable | #5, #6 |
| FR-8 | Confidence score is trust-weighted; confirmed vs inferred labeled distinctly | #2 |
| FR-9 | Accuracy harness scores FP/FN vs Protocol SIFT baseline on ground-truth image | #2 |

---

## 6. Success metrics

- **Self-correction**: ≥ 1 case where iteration-1 verdict is wrong (trusted forged artifact)
  and final verdict is right, with full trace preserved. Target: measured hallucination drop.
- **Accuracy**: false-positive + missed-artifact count ≤ Protocol SIFT baseline on the
  ground-truth image.
- **Integrity**: documented bypass attempt (prompt injection in case data) fails at the
  architecture — the destructive function does not exist.
- **Auditability**: judge can click any finding and reach the exact `raw_cmd` + evidence hash.

---

## 7. Deliverables (the 8 required submission items)

1. Public GitHub repo, MIT license.
2. 5-min demo video — the timestomp self-correction sequence + graph.
3. Architecture diagram — architectural vs prompt guardrails clearly split (see ARCHITECTURE.md).
4. Project story — leads with the trust-hierarchy insight.
5. Dataset doc — SANS sample image + planted ground-truth anti-forensic artifacts.
6. Accuracy report — contradictions caught, FP/FN vs baseline, iter-1 vs final.
7. Try-it instructions — deploy script on SIFT OVA / VPS, README.
8. Agent execution logs — per-iteration JSONL with timestamps + token usage.

---

## 8. The demo (money shot)

1. Agent finds `evil.exe`; `$SI` says created 2019 → initially rates benign (iteration-1 mistake, shown honestly).
2. Trust-check fires: `$FN` says 3 days ago. trust(FN 0.90) ≫ trust(SI 0.30). Contradiction.
3. Agent self-corrects aloud: "$SI contradicts $FN → timestomping T1070.006, 2019 date is forged."
4. Pivots autonomously → prefetch → confirms `evil.exe` ran 3 days ago, 4×.
5. Cross-checks memory → process resident, C2 socket open.
6. Graph: gray node flips red, contradiction edge drawn, click → both MFTECmd runs + sha256.

---

## 9. Timeline (12 days)

| Days | Work |
|------|------|
| 1–2 | SIFT OVA + Protocol SIFT install on VPS. MCP skeleton + trust envelope. Wrap 6 tools. |
| 3–4 | Trust tags + contradiction engine (SI-vs-FN first). |
| 5–7 | Autonomous loop + max-iter + JSONL logging. |
| 8–9 | flowsint graph wired to agent output, node→provenance. |
| 10 | Plant ground truth, run benchmark vs baseline, accuracy report. |
| 11 | Record demo, arch diagram, bypass test. |
| 12 | Docs, README, buffer. |

---

## 10. Risks

| Risk | Mitigation |
|------|-----------|
| Agent loop infinite-spirals | hard max-iter cap + no-progress detector |
| SIFT tool output parsing brittle | typed parsers per tool, fail closed, log raw on parse error |
| LLM over-trusts low-trust source | trust-weight enforced in *deterministic* scorer, not left to LLM |
| Demo image lacks anti-forensic artifact | plant known timestomp + cleared-log ground truth |
| VPS can't run SIFT OVA (nested virt) | run SIFT tools natively on Linux VPS, skip OVA where possible |
