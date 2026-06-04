"""
CONTRA offline demo — full pipeline on synthetic evidence, no SIFT, no LLM.

Proves: provider -> agent loop -> contradiction engine -> self-correction -> findings
+ JSONL trace. This is the local milestone you run before touching real case data.

    python -m contra.demo_offline
    python -m contra.demo_offline --case contra/fixtures/case_blackcat --max-iterations 12
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .agent import LoopState, Hypothesis, JsonlLogger, run_loop
from .planner_offline import OfflinePlanner
from .providers import FixtureProvider


def main() -> None:
    ap = argparse.ArgumentParser(description="CONTRA offline pipeline demo")
    ap.add_argument("--case", default="contra/fixtures/case_blackcat")
    ap.add_argument("--max-iterations", type=int, default=12)
    ap.add_argument("--log", default="logs/offline_run.jsonl")
    args = ap.parse_args()

    provider = FixtureProvider(args.case)
    planner = OfflinePlanner()
    logger = JsonlLogger(args.log)

    state = LoopState(
        image=args.case, max_iterations=args.max_iterations,
        hypotheses=[Hypothesis(text="host shows execution of an unknown binary", priority=0.7)],
    )
    run_loop(state, logger, planner=planner, tool_caller=provider)

    print("\n" + "=" * 64)
    print(f"CONTRA offline run — case: {args.case}")
    print(f"iterations: {state.iteration}   artifacts: {len(state.artifacts)}"
          f"   findings: {len(state.findings)}")
    print("=" * 64)
    for f in state.findings:
        print(f"\n[{f['rule_id']}] {f['technique']}")
        print(f"   {f['summary']}")
        print(f"   trust: believe {f['trusted_source']} (>{f['distrusted_source']})"
              f"   conf={f['confidence']:.2f}")
        print(f"   pivot: {f['pivot_hint']}")

    out = Path(args.log).with_name("findings.json")
    out.write_text(json.dumps(state.findings, indent=2, default=str), encoding="utf-8")
    print(f"\nfindings written: {out}")
    print(f"trace written:    {args.log}")


if __name__ == "__main__":
    main()
