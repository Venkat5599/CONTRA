"""
CONTRA end-to-end real run — autonomous agent driving LIVE SIFT tools on the VPS.

This is the full thesis, real top to bottom: LLM (or offline) planner chooses tools,
RealProvider runs MFTECmd/volatility on the VPS over the read-only boundary, the
deterministic engine catches contradictions, findings trace to real commands + hashes.

    # offline planner (deterministic, no LLM) against real tools:
    python -m contra.run_real --planner offline
    # genuine autonomy: LLM picks the tools, real evidence answers:
    python -m contra.run_real --planner llm
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .agent import LoopState, Hypothesis, JsonlLogger, run_loop
from .planner_offline import OfflinePlanner
from .provider_real import RealProvider
from .remote_exec import RemoteExecutor


def main() -> None:
    ap = argparse.ArgumentParser(description="CONTRA real run on the SIFT VPS")
    ap.add_argument("--planner", choices=["offline", "llm"], default="offline")
    ap.add_argument("--max-iterations", type=int, default=10)
    ap.add_argument("--target", default="C:\\Windows\\Temp\\evil.exe")
    ap.add_argument("--log", default="logs/real_run.jsonl")
    args = ap.parse_args()

    executor = RemoteExecutor()
    provider = RealProvider(executor, target_file=args.target)

    if args.planner == "llm":
        from .planner_llm import LLMPlanner
        planner = LLMPlanner()
    else:
        planner = OfflinePlanner()

    logger = JsonlLogger(args.log)
    state = LoopState(image="vps:/root/evidence", max_iterations=args.max_iterations,
                      hypotheses=[Hypothesis(text="triage this host for compromise", priority=0.7)])

    print(f"REAL run · planner={args.planner} · target={args.target}")
    print("-" * 60)
    try:
        run_loop(state, logger, planner=planner, tool_caller=provider)
    finally:
        executor.close()

    print(f"\nartifacts collected (real tools): {len(state.artifacts)}")
    for atype, a in state.artifacts.items():
        ok = "ok" if a["parse_ok"] else "FAIL"
        print(f"  {atype:18} via {a['source_tool']:22} [{ok}]  sha={a['evidence_sha256'][:12]}…")

    print(f"\nfindings ({len(state.findings)}):")
    for f in state.findings:
        print(f"  [{f['rule_id']}] {f['technique']}")
        print(f"      {f['summary']}")

    Path(args.log).with_name("real_findings.json").write_text(
        json.dumps(state.findings, indent=2, default=str), encoding="utf-8")
    print(f"\ntrace: {args.log}")


if __name__ == "__main__":
    main()
