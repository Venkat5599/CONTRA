"""
CONTRA autonomous run — LLM planner edition.

The LLM chooses each next tool (real reasoning); the FixtureProvider serves evidence;
the deterministic engine catches contradictions. Proves genuine autonomy without a SIFT
box. Swap FixtureProvider -> a real MCP/SIFT provider later with zero agent changes.

    python -m contra.run_llm --case contra/fixtures/case_blackcat
    CONTRA_LLM_MODEL=minimax-m3-free python -m contra.run_llm
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .agent import LoopState, Hypothesis, JsonlLogger, run_loop
from .planner_llm import LLMPlanner
from .llm_client import LLMClient
from .providers import FixtureProvider


def main() -> None:
    ap = argparse.ArgumentParser(description="CONTRA autonomous run (LLM planner)")
    ap.add_argument("--case", default="contra/fixtures/case_blackcat")
    ap.add_argument("--max-iterations", type=int, default=10)
    ap.add_argument("--model", default=None)
    ap.add_argument("--log", default="logs/llm_run.jsonl")
    args = ap.parse_args()

    client = LLMClient(model=args.model)
    planner = LLMPlanner(client)
    provider = FixtureProvider(args.case)
    logger = JsonlLogger(args.log)

    state = LoopState(
        image=args.case, max_iterations=args.max_iterations,
        hypotheses=[Hypothesis(text="triage this Windows host for compromise", priority=0.7)],
    )
    print(f"model: {client.model}  @ {client.base_url}\ncase: {args.case}\n" + "-" * 60)
    run_loop(state, logger, planner=planner, tool_caller=provider)

    print("\nLLM tool decisions:")
    for i, c in enumerate(planner.calls, 1):
        d = c.get("decision") or {}
        if "error" in c:
            print(f"  {i}. [error] {c['error']}")
        elif d.get("done"):
            print(f"  {i}. DONE — {d.get('rationale','')}")
        else:
            print(f"  {i}. {d.get('tool','?'):22} {d.get('rationale','')}")

    print(f"\nfindings ({len(state.findings)}):")
    for f in state.findings:
        print(f"  [{f['rule_id']}] {f['technique'].split(' ')[0]} — {f['summary'][:80]}")
    print(f"\niterations: {state.iteration}   llm calls: {client.calls}   "
          f"tokens: {client.tokens}")

    Path(args.log).with_name("llm_findings.json").write_text(
        json.dumps(state.findings, indent=2, default=str), encoding="utf-8")


if __name__ == "__main__":
    main()
