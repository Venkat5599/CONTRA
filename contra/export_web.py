"""
CONTRA web exporter — runs every fixture case and emits one JSON bundle the
frontend console consumes. Single source of truth: the same engine, providers,
and trace that the eval harness uses.

    python -m contra.export_web
    -> writes web/public/data/cases.json
"""

from __future__ import annotations

import json
from pathlib import Path

from .agent import LoopState, Hypothesis, JsonlLogger, run_loop
from .planner_offline import OfflinePlanner
from .providers import FixtureProvider
from .eval.grader import grade_case
from .eval.run_evals import discover_cases
from .report import SEVERITY_BY_RULE, _read_trace, build_report


def export_case(case_dir: Path) -> dict:
    log_path = Path("logs") / f"web_{case_dir.name}.jsonl"
    provider = FixtureProvider(case_dir)
    state = LoopState(
        image=str(case_dir), max_iterations=15,
        hypotheses=[Hypothesis(text="host shows execution of an unknown binary", priority=0.7)],
    )
    run_loop(state, JsonlLogger(log_path), planner=OfflinePlanner(), tool_caller=provider)
    trace = _read_trace(log_path)
    score = grade_case(case_dir)

    findings = [{
        "rule_id": f["rule_id"],
        "technique": f["technique"],
        "severity": SEVERITY_BY_RULE.get(f["rule_id"], "MEDIUM"),
        "summary": f["summary"],
        "trusted_source": f["trusted_source"],
        "distrusted_source": f["distrusted_source"],
        "confidence": round(f["confidence"], 2),
        "pivot_hint": f["pivot_hint"],
        "evidence_refs": f.get("evidence_refs", []),
    } for f in state.findings]

    artifacts = [{
        "artifact_type": a["artifact_type"],
        "source_tool": a["source_tool"],
        "trust": a["trust"],
        "forge_cost": a["forge_cost"],
        "raw_cmd": a["raw_cmd"],
        "evidence_sha256": a["evidence_sha256"],
        "parse_ok": a["parse_ok"],
    } for a in state.artifacts.values()]

    corrections = [{
        "iteration": r["iteration"], "rule": r["rule"], "technique": r["technique"],
        "trusted": r["trusted"], "distrusted": r["distrusted"], "pivot": r["pivot"],
        "confidence": r["confidence"],
    } for r in trace if r["event"] == "CORRECT"]

    timeline = [{
        "iteration": r.get("iteration"), "event": r["event"],
        "tool": r.get("tool"), "artifact_type": r.get("artifact_type"),
        "trust": r.get("trust"), "technique": r.get("technique"),
    } for r in trace if r["event"] in ("plan", "observe", "CORRECT")]

    return {
        "name": case_dir.name,
        "verdict": "MALICIOUS ACTIVITY CONFIRMED" if findings else "NO EVIL FOUND",
        "iterations": state.iteration,
        "findings": findings,
        "artifacts": artifacts,
        "corrections": corrections,
        "timeline": timeline,
        "score": score.to_dict(),
        "report_md": build_report(state, trace, case_dir.name),
    }


def main() -> None:
    cases = [export_case(c) for c in discover_cases()]
    bundle = {
        "generated_by": "contra.export_web",
        "thesis": "Assume the evidence is lying. Find evil in the contradictions "
                  "between artifacts an attacker can forge and ones they cannot.",
        "cases": cases,
        "aggregate": {
            "cases": len(cases),
            "findings": sum(len(c["findings"]) for c in cases),
            "false_positives": sum(c["score"]["false_positives"] for c in cases),
            "false_negatives": sum(c["score"]["false_negatives"] for c in cases),
        },
    }
    out = Path("web/public/data/cases.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    print(f"[written] {out}  ({len(cases)} cases, "
          f"{bundle['aggregate']['findings']} findings, "
          f"{bundle['aggregate']['false_positives']} FP)")


if __name__ == "__main__":
    main()
