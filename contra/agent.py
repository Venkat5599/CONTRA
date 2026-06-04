"""
CONTRA autonomous hypothesis loop.

The agent that reasons about evidence RELIABILITY, not just the next tool. Verify
step is a trust-check (deterministic contradiction engine), not a vibe-check.
Correct step re-weights the forged source and pivots — every correction logged.

LLM role: pick next hypothesis/tool (PLAN), name the TTP for a contradiction
(EXPLAIN). Everything integrity-critical (trust math, contradiction detection,
termination) is deterministic Python.

This is a SKELETON wiring the control flow + logging. LLM calls are stubbed at
`llm_plan` / `llm_explain` — wire to Claude API (tool use over the MCP server)
during days 5–7.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Protocol

from . import contradiction


@dataclass
class Hypothesis:
    text: str
    priority: float = 0.5
    status: str = "open"   # open | confirmed | refuted


@dataclass
class LoopState:
    image: str
    max_iterations: int
    artifacts: dict[str, Any] = field(default_factory=dict)
    hypotheses: list[Hypothesis] = field(default_factory=list)
    findings: list[dict[str, Any]] = field(default_factory=list)
    iteration: int = 0


class JsonlLogger:
    """Per-iteration structured trace — submission deliverable #8."""

    def __init__(self, path: str | Path, truncate: bool = True):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if truncate:
            self.path.write_text("", encoding="utf-8")  # fresh trace per run

    def log(self, event: str, **fields: Any) -> None:
        rec = {"ts": datetime.now(timezone.utc).isoformat(), "event": event, **fields}
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, default=str) + "\n")


# ── LLM stubs (wire to Claude API w/ MCP tool use, days 5–7) ─────────────────
def llm_plan(state: LoopState, hypothesis: Hypothesis) -> dict[str, Any]:
    """Return {"tool": <mcp_fn>, "args": {...}, "rationale": str}."""
    raise NotImplementedError("wire to Claude API tool-use over the MCP server")


def llm_explain(event: contradiction.ContradictionEvent) -> dict[str, Any]:
    """Return {"finding": str, "severity": str} naming the anti-forensic technique."""
    return {"finding": event.summary, "technique": event.technique, "severity": "high"}


def call_mcp_tool(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    """Invoke a tool on the read-only MCP server. Wired in deployment."""
    raise NotImplementedError("connect MCP client to contra-readonly-forensics")


def trust_weighted_confidence(hyp: Hypothesis, artifacts: dict[str, Any]) -> float:
    """Confidence weighted by the trust of supporting artifacts (deterministic)."""
    supporting = [a.get("trust", 0.0) for a in artifacts.values() if a.get("parse_ok")]
    return max(supporting, default=0.0)


def pivot_targets(event: contradiction.ContradictionEvent) -> list[Hypothesis]:
    """Turn a contradiction's pivot hint into new high-priority hypotheses."""
    return [Hypothesis(text=event.pivot_hint, priority=0.9)]


class Planner(Protocol):
    def __call__(self, state: "LoopState", hyp: "Hypothesis") -> dict[str, Any]: ...


class ToolCaller(Protocol):
    def __call__(self, tool: str, args: dict[str, Any]) -> dict[str, Any]: ...


def run_loop(state: LoopState, logger: JsonlLogger,
             planner: Planner = llm_plan,
             tool_caller: ToolCaller = call_mcp_tool) -> LoopState:
    logger.log("start", image=state.image, max_iterations=state.max_iterations)
    seen_tools: set[str] = set()
    seen_conflicts: set[str] = set()
    while state.hypotheses and state.iteration < state.max_iterations:
        state.iteration += 1
        hyp = max((h for h in state.hypotheses if h.status == "open"),
                  key=lambda h: h.priority, default=None)
        if hyp is None:
            break

        plan = planner(state, hyp)
        if plan is None:                       # planner exhausted — graceful stop
            logger.log("planner_done", iteration=state.iteration)
            break
        logger.log("plan", iteration=state.iteration, hypothesis=hyp.text,
                   tool=plan["tool"], rationale=plan.get("rationale", ""))

        seen_tools.add(plan["tool"])
        result = tool_caller(plan["tool"], plan.get("args", {}))
        state.artifacts[result["artifact_type"]] = result
        logger.log("observe", iteration=state.iteration, tool=plan["tool"],
                   artifact_type=result["artifact_type"], trust=result["trust"],
                   parse_ok=result["parse_ok"], raw_cmd=result["raw_cmd"],
                   evidence_sha256=result["evidence_sha256"])

        # VERIFY — deterministic trust-check
        conflicts = contradiction.check(state.artifacts)
        for c in conflicts:
            key = f"{c.rule_id}:{c.distrusted_source}"
            if key in seen_conflicts:
                continue
            seen_conflicts.add(key)
            finding = llm_explain(c)
            state.findings.append({**c.to_dict(), **finding})
            # CORRECT — distrust forged source, pivot to confirm
            state.hypotheses.extend(pivot_targets(c))
            logger.log("CORRECT", iteration=state.iteration, rule=c.rule_id,
                       technique=c.technique, trusted=c.trusted_source,
                       distrusted=c.distrusted_source, pivot=c.pivot_hint,
                       confidence=c.confidence)

        # Log corroboration strength, but termination is owned by the planner
        # (returns None when its investigative queue is exhausted) + the max-iter
        # cap. We do NOT close the driving hypothesis on a global trust score —
        # that would starve follow-up pivots before they execute.
        conf = trust_weighted_confidence(hyp, state.artifacts)
        if conf >= 0.85:
            logger.log("corroborated", iteration=state.iteration,
                       hypothesis=hyp.text, confidence=conf)

    logger.log("end", iterations=state.iteration, findings=len(state.findings),
               capped=state.iteration >= state.max_iterations)
    return state


def main() -> None:
    ap = argparse.ArgumentParser(description="CONTRA autonomous triage loop")
    ap.add_argument("--image", required=True, help="path to ro-mounted disk image root")
    ap.add_argument("--max-iterations", type=int, default=25, help="hard iteration cap")
    ap.add_argument("--log", default="logs/run.jsonl")
    ap.add_argument("--seed-hypothesis",
                    default="host shows execution of an unknown binary")
    args = ap.parse_args()

    state = LoopState(image=args.image, max_iterations=args.max_iterations,
                      hypotheses=[Hypothesis(text=args.seed_hypothesis, priority=0.7)])
    run_loop(state, JsonlLogger(args.log))


if __name__ == "__main__":
    main()
