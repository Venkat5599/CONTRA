"""
CONTRA LLM planner — genuine autonomy.

The LLM acts as the senior analyst's REASONING: given the evidence collected so far
and the contradictions found, it chooses the next forensic tool to run (and why).
It does NOT decide findings — the deterministic contradiction engine does that. This
keeps integrity-critical logic reproducible while the LLM supplies sequencing judgment.

Decisions are structured JSON (portable across reasoning models that emit <think>),
not native function-calling. The planner enforces the read-only tool catalog: a tool
the model invents or that isn't in the catalog is rejected — the LLM cannot reach
outside the allow-list.
"""

from __future__ import annotations

import json
from typing import Any

from .llm_client import LLMClient

# The only tools the planner may choose. Mirrors the read-only MCP surface.
TOOL_CATALOG = {
    "get_mft_record": "args {path}: $SI vs $FN timestamps for a file (timestomp check)",
    "list_memory_procs": "args {}: processes in memory (fileless/hollowing check)",
    "list_memory_netconns": "args {}: live network connections (C2 check)",
    "get_amcache": "args {}: execution records that survive deletion",
    "get_prefetch": "args {exe}: run count + last-run times",
    "get_usnjrnl": "args {}: NTFS change journal (create/delete = wipe check)",
    "get_srum": "args {}: network/app usage (contradicts cleared logs)",
    "get_eventlog": "args {channel}: Windows events (low trust — clearable)",
}

SYSTEM = """You are a senior DFIR analyst triaging a Windows host. You think in terms of
EVIDENCE RELIABILITY: an attacker tampers with artifacts, so weight each source by how
hard it is to forge.

Trust hierarchy (high = hard to forge, believe it; low = trivially forged, distrust it):
  memory (0.95) > $FILE_NAME (0.90) > $UsnJrnl (0.85) > prefetch/amcache (0.80)
  > SRUM (0.78) > event logs (0.40) > $STANDARD_INFORMATION (0.30)

Your job each turn: pick the SINGLE most useful next tool to run, given what you already
know and what still needs corroboration. Sequence like an analyst: when a contradiction
appears, pivot to confirm it with a higher-trust source. Stop when further tools add
nothing.

Respond with ONLY a JSON object, no prose:
  {"tool": "<name from catalog>", "args": {...}, "rationale": "<8-20 words>"}
or when the investigation is complete:
  {"done": true, "rationale": "<why you are stopping>"}"""


class LLMPlanner:
    def __init__(self, client: LLMClient | None = None, max_repeats: int = 1):
        self.client = client or LLMClient()
        self.calls: list[dict[str, Any]] = []
        self._used: dict[str, int] = {}
        self.max_repeats = max_repeats

    def _context(self, state: Any) -> str:
        collected = []
        for atype, a in state.artifacts.items():
            collected.append(f"- {atype} via {a['source_tool']} (trust {a['trust']}), "
                             f"parse_ok={a['parse_ok']}")
        findings = [f"- {f['rule_id']} {f['technique']}: {f['summary'][:90]}"
                    for f in state.findings]
        catalog = "\n".join(f"  {k}: {v}" for k, v in TOOL_CATALOG.items())
        return (
            f"TOOL CATALOG (choose exactly one):\n{catalog}\n\n"
            f"EVIDENCE COLLECTED ({len(state.artifacts)}):\n"
            + ("\n".join(collected) or "  (none yet)") + "\n\n"
            f"CONTRADICTIONS FOUND ({len(state.findings)}):\n"
            + ("\n".join(findings) or "  (none yet)") + "\n\n"
            f"Iteration {state.iteration + 1}. What single tool next?"
        )

    def __call__(self, state: Any, hyp: Any) -> dict[str, Any] | None:
        try:
            reply = self.client.chat(SYSTEM, self._context(state), max_tokens=600)
        except Exception as e:
            # network/gateway failure -> stop gracefully rather than loop
            self.calls.append({"error": str(e)[:160]})
            return None
        decision = LLMClient.extract_json(reply)
        self.calls.append({"raw": reply[:300], "decision": decision})

        # Explicit completion is the only clean stop signal from the model.
        if decision.get("done"):
            return None

        tool = decision.get("tool", "")
        invalid = tool not in TOOL_CATALOG
        repeated = (not invalid) and self._used.get(tool, 0) >= self.max_repeats

        # On an invalid/repeated choice (or parse miss), don't abandon the
        # investigation — auto-advance to the next unused read-only tool. Only
        # stop once every catalog tool has been exercised.
        if invalid or repeated:
            remaining = [t for t in TOOL_CATALOG if self._used.get(t, 0) == 0]
            if not remaining:
                return None
            tool = remaining[0]
            self._used[tool] = self._used.get(tool, 0) + 1
            return {"tool": tool, "args": {}, "rationale": "planner auto-advance (coverage)"}

        self._used[tool] = self._used.get(tool, 0) + 1
        return {"tool": tool, "args": decision.get("args", {}) or {},
                "rationale": decision.get("rationale", "")[:120]}
