"""
LLM planner safety tests — no network. Proves the planner cannot escape the
read-only tool catalog and parses messy reasoning-model output.
"""

from contra.llm_client import LLMClient
from contra.planner_llm import LLMPlanner, TOOL_CATALOG


def test_extract_json_strips_think_and_fences():
    raw = "<think>let me decide…</think>\n```json\n{\"tool\": \"get_amcache\", \"args\": {}}\n```"
    d = LLMClient.extract_json(raw)
    assert d["tool"] == "get_amcache"


def test_extract_json_bare_object():
    d = LLMClient.extract_json('blah {"done": true, "rationale": "x"} trailing')
    assert d["done"] is True


def test_planner_rejects_invented_tool():
    # A planner whose model "chooses" a tool outside the catalog must not emit it.
    class FakeClient:
        model = "x"; base_url = "y"; calls = 0; tokens = 0
        def chat(self, *a, **k):
            return '{"tool": "delete_evidence", "args": {}}'
    class State:
        artifacts = {}; findings = []; iteration = 0
    p = LLMPlanner(client=FakeClient())          # type: ignore[arg-type]
    plan = p(State(), None)
    # auto-advances to a real catalog tool, never the invented one
    assert plan is None or plan["tool"] in TOOL_CATALOG


def test_catalog_is_read_only():
    bad = {"delete_evidence", "execute_shell", "write_file", "dd"}
    assert bad.isdisjoint(TOOL_CATALOG)
