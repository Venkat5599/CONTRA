# CONTRA — Submission Checklist (all 8 required components)

> Missing any one = elimination. This maps each required item to its artifact.

| # | Required component | Artifact | Status |
|---|--------------------|----------|--------|
| 1 | Code Repository (public, MIT/Apache) | this repo, `LICENSE` (MIT) | ✅ |
| 2 | Demo Video (5 min, live + self-correction) | `docs/submission/DEMO_SCRIPT.md` → record | ◻ script ready |
| 3 | Architecture Diagram (trust boundaries, arch vs prompt) | `ARCHITECTURE.md` + `docs/submission/ARCHITECTURE_DIAGRAM.md` | ✅ |
| 4 | Written Project Description (Devpost format) | `docs/submission/PROJECT_STORY.md` | ✅ |
| 5 | Dataset Documentation | `docs/submission/DATASET.md` | ✅ |
| 6 | Accuracy Report (FP/FN, evidence integrity, spoliation) | `docs/submission/ACCURACY_REPORT.md` | ✅ |
| 7 | Try-It-Out Instructions | `docs/submission/TRY_IT.md` | ✅ |
| 8 | Agent Execution Logs (timestamps, tokens, per-iteration) | `logs/*.jsonl` (generated each run) | ✅ |

## Judging criteria → where we score

| Criterion | Evidence in this repo |
|-----------|-----------------------|
| 1 · Autonomous execution (tiebreaker) | LLM planner reasons about evidence reliability + pivots on contradiction; `run_llm.py`, JSONL traces |
| 2 · IR accuracy | precision/recall 1.0, 0 FP, pass^3; confirmed vs inferred labelling |
| 3 · Breadth/depth | deep on Windows anti-forensics: 5 rules, real `$MFT` + synthetic memory/journal |
| 4 · Constraint implementation | read-only executor, live bypass test (4 refused), `tests/test_guardrail.py` |
| 5 · Audit trail | every finding → `raw_cmd` + `evidence_sha256`; provenance table in report + console |
| 6 · Usability/docs | one-command local run, web console, full deliverable set |
