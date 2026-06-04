"""
MCP server tests — the installable read-only surface works and stays read-only.
Backs the 'judges install it and try it' usability claim (criterion #6) + #4.
"""

import asyncio

from contra import mcp_server


def _tool_names():
    return [t.name for t in asyncio.run(mcp_server.mcp.list_tools())]


def test_expected_readonly_tools_present():
    names = set(_tool_names())
    assert {"get_mft_record", "list_memory_procs", "triage_case",
            "check_contradictions", "list_cases"} <= names


def test_no_destructive_tool_on_surface():
    # The architectural guardrail: destructive primitives must not exist as tools.
    names = " ".join(_tool_names()).lower()
    for bad in ("shell", "exec", "write", "delete", "remove", "dd", "format"):
        assert bad not in names, f"destructive-sounding tool exposed: {bad}"


def test_triage_blackcat_finds_evil():
    r = mcp_server.triage_case("case_blackcat")
    assert r["verdict"] == "MALICIOUS ACTIVITY CONFIRMED"
    rules = {f["rule"] for f in r["findings"]}
    assert {"R1", "R2", "R3"} <= rules
    # every finding carries provenance (criterion #5)
    assert all("provenance" in f for f in r["findings"])


def test_triage_clean_finds_nothing():
    r = mcp_server.triage_case("case_clean")
    assert r["verdict"] == "NO EVIL FOUND"
    assert r["findings"] == []


def test_list_cases():
    cases = mcp_server.list_cases()["cases"]
    assert "case_blackcat" in cases and "case_clean" in cases
