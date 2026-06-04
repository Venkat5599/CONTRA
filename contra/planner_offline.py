"""
Offline deterministic planner — runs the loop with no LLM.

Encodes a senior analyst's opening sequence as a fixed queue so the whole pipeline
is reproducible locally. The LLM planner (days 5–7) replaces this with real
reasoning, but this proves the control flow, contradiction firing, self-correction
logging, and graph output end-to-end first.

Pivots from the contradiction engine are appended as hypotheses; this planner maps
known pivot hints to the corroborating tool, so R1 -> prefetch/netscan happens
autonomously (the demo's self-correction follow-through).
"""

from __future__ import annotations

from typing import Any


# Opening triage sequence (what a senior analyst pulls first).
BASE_SEQUENCE: list[tuple[str, dict[str, Any]]] = [
    ("get_mft_record", {"path": "C:\\Windows\\Temp\\evil.exe"}),
    ("list_memory_procs", {}),
    ("get_amcache", {}),
    ("get_prefetch", {"exe": "evil.exe"}),
    ("get_usnjrnl", {}),
    ("get_srum", {}),
    ("get_eventlog", {"channel": "Security"}),
]

# Pivot hint substring -> follow-up tool calls (the corroboration after a contradiction).
PIVOT_MAP: list[tuple[str, list[tuple[str, dict[str, Any]]]]] = [
    ("prefetch", [("get_prefetch", {"exe": "evil.exe"})]),
    ("netscan",  [("list_memory_netconns", {})]),
    ("C2",       [("list_memory_netconns", {})]),
]


class OfflinePlanner:
    def __init__(self) -> None:
        self._queue: list[tuple[str, dict[str, Any]]] = list(BASE_SEQUENCE)
        self._emitted: set[str] = set()

    def _enqueue_pivots(self, state: Any) -> None:
        # Inspect new hypotheses (pivot hints) and queue corroborating tools.
        for hyp in state.hypotheses:
            for needle, tools in PIVOT_MAP:
                if needle.lower() in hyp.text.lower():
                    for t in tools:
                        if t[0] not in self._emitted and t not in self._queue:
                            self._queue.append(t)

    def __call__(self, state: Any, hyp: Any) -> dict[str, Any] | None:
        self._enqueue_pivots(state)
        if not self._queue:
            return None
        tool, args = self._queue.pop(0)
        self._emitted.add(tool)
        return {"tool": tool, "args": args,
                "rationale": f"offline-planner: deterministic step for '{hyp.text[:48]}'"}
