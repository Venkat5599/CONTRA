"""
CONTRA accuracy grader — code-based, deterministic (eval-driven development).

Runs the offline pipeline on a fixture case, compares emitted findings against the
case's machine-readable ground_truth.json, returns precision/recall/FP/FN.

A finding matches ground truth when its (rule_id, technique_id) pair is expected.
This produces submission deliverable #6 (Accuracy Report) numbers, reproducibly.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from pathlib import Path

from ..agent import LoopState, Hypothesis, JsonlLogger, run_loop
from ..planner_offline import OfflinePlanner
from ..providers import FixtureProvider


@dataclass
class CaseScore:
    case: str
    expected: int
    detected: int
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    matched: list[str]
    missed: list[str]
    spurious: list[str]

    def passed(self) -> bool:
        return self.false_positives == 0 and self.false_negatives == 0

    def to_dict(self) -> dict:
        return asdict(self)


def _tech_set(findings: list[dict]) -> set[tuple[str, str]]:
    out: set[tuple[str, str]] = set()
    for f in findings:
        rid = f.get("rule_id", "")
        tech = f.get("technique", "")
        # technique strings look like "T1070.006 Indicator Removal: Timestomp"
        tid = tech.split()[0] if tech else ""
        out.add((rid, tid))
    return out


def grade_case(case_dir: str | Path, max_iterations: int = 15,
               log_dir: str | Path = "logs") -> CaseScore:
    case_dir = Path(case_dir)
    gt = json.loads((case_dir / "ground_truth.json").read_text(encoding="utf-8"))
    expected = {(e["rule_id"], e["technique_id"]) for e in gt["expected_findings"]}

    provider = FixtureProvider(case_dir)
    planner = OfflinePlanner()
    log_path = Path(log_dir) / f"eval_{case_dir.name}.jsonl"
    logger = JsonlLogger(log_path)
    state = LoopState(
        image=str(case_dir), max_iterations=max_iterations,
        hypotheses=[Hypothesis(text="host shows execution of an unknown binary", priority=0.7)],
    )
    run_loop(state, logger, planner=planner, tool_caller=provider)

    detected = _tech_set(state.findings)
    tp = expected & detected
    fp = detected - expected
    fn = expected - detected
    precision = len(tp) / len(detected) if detected else (1.0 if not expected else 0.0)
    recall = len(tp) / len(expected) if expected else (1.0 if not detected else 0.0)

    fmt = lambda s: sorted(f"{r}:{t}" for r, t in s)
    return CaseScore(
        case=case_dir.name, expected=len(expected), detected=len(detected),
        true_positives=len(tp), false_positives=len(fp), false_negatives=len(fn),
        precision=round(precision, 3), recall=round(recall, 3),
        matched=fmt(tp), missed=fmt(fn), spurious=fmt(fp),
    )
