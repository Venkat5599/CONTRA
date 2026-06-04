"""
CONTRA MCP server — the read-only tool surface exposed to the agent.

Architecture pattern #2 (Custom MCP Server). Instead of giving the agent a generic
`execute_shell_cmd`, we expose typed forensic functions. The agent PHYSICALLY CANNOT
run destructive commands because this server has no such function.

Each tool:
  - invokes a real SIFT binary via safe_exec.run_readonly (allow-listed, shell=False)
  - parses raw output into typed data (fail-closed: parse_ok=False keeps raw for audit)
  - returns a TrustTaggedResult so every value carries trust + provenance

Transport: MCP over stdio (works with Claude Code / Claude API tool use).
Parsers below are SKELETONS — fill per real tool output during days 1–4.
"""

from __future__ import annotations

import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

from .safe_exec import run_readonly, sha256_file, GuardrailViolation
from .trust import TrustTaggedResult

mcp = FastMCP("contra-readonly-forensics")

# Path to the read-only mounted image / artifact root. Set by deploy script.
IMAGE_ROOT = os.environ.get("CONTRA_IMAGE_ROOT", "/evidence")
MEMORY_IMAGE = os.environ.get("CONTRA_MEMORY_IMAGE", "/evidence/memory.raw")


def _result(value: Any, artifact_type: str, source_tool: str,
            raw_cmd: list[str], evidence_path: str = "",
            parse_ok: bool = True, notes: str = "") -> dict[str, Any]:
    sha = ""
    try:
        if evidence_path and os.path.exists(evidence_path):
            sha = sha256_file(evidence_path, max_bytes=1 << 20)
    except OSError:
        pass
    return TrustTaggedResult(
        value=value, artifact_type=artifact_type, source_tool=source_tool,
        raw_cmd=raw_cmd, evidence_sha256=sha, parse_ok=parse_ok, notes=notes,
    ).to_dict()


# ── MFT: the two timestamps that catch timestomping ─────────────────────────
@mcp.tool()
def get_mft_record(path: str) -> dict[str, Any]:
    """
    Return $STANDARD_INFORMATION and $FILE_NAME timestamps for a file in the image.
    SI is trivially forgeable (trust 0.30); FN needs kernel (trust 0.90).
    Disagreement => timestomping (T1070.006). This is the demo's money artifact.
    """
    argv = ["MFTECmd", "-f", os.path.join(IMAGE_ROOT, "$MFT"), "--json", "-"]
    out, err, rc = run_readonly(argv)
    si = _parse_mft_si(out, path)   # SKELETON
    fn = _parse_mft_fn(out, path)   # SKELETON
    ok = si is not None and fn is not None
    value = {"path": path, "si_timestamps": si, "fn_timestamps": fn,
             "si_trust": 0.30, "fn_trust": 0.90}
    return _result(value, "mft_fn_timestamp", "MFTECmd", argv,
                   evidence_path=os.path.join(IMAGE_ROOT, "$MFT"),
                   parse_ok=ok, notes=err[:200] if err else "")


@mcp.tool()
def list_memory_procs() -> dict[str, Any]:
    """List processes from the memory image (volatility3 pslist). Trust 0.95."""
    argv = ["vol", "-f", MEMORY_IMAGE, "-r", "json", "windows.pslist"]
    out, err, rc = run_readonly(argv)
    procs = _parse_vol_json(out)    # SKELETON
    return _result(procs, "memory_proc", "volatility3.pslist", argv,
                   evidence_path=MEMORY_IMAGE, parse_ok=procs is not None,
                   notes=err[:200] if err else "")


@mcp.tool()
def list_memory_netconns() -> dict[str, Any]:
    """Network connections from memory (volatility3 netscan). Trust 0.95 — catches live C2."""
    argv = ["vol", "-f", MEMORY_IMAGE, "-r", "json", "windows.netscan"]
    out, err, rc = run_readonly(argv)
    conns = _parse_vol_json(out)
    return _result(conns, "memory_netconn", "volatility3.netscan", argv,
                   evidence_path=MEMORY_IMAGE, parse_ok=conns is not None,
                   notes=err[:200] if err else "")


@mcp.tool()
def get_prefetch(exe: str) -> dict[str, Any]:
    """Prefetch run-count + last-run times for an exe. Trust 0.80 — confirms execution."""
    argv = ["PECmd", "-d", os.path.join(IMAGE_ROOT, "Windows", "Prefetch"), "--json", "-"]
    out, err, rc = run_readonly(argv)
    pf = _parse_prefetch(out, exe)  # SKELETON
    return _result(pf, "prefetch", "PECmd", argv, parse_ok=pf is not None,
                   notes=err[:200] if err else "")


@mcp.tool()
def get_amcache() -> dict[str, Any]:
    """Amcache execution records. Trust 0.80 — proves a binary existed/ran."""
    hive = os.path.join(IMAGE_ROOT, "Windows", "AppCompat", "Programs", "Amcache.hve")
    argv = ["AmcacheParser", "-f", hive, "--json", "-"]
    out, err, rc = run_readonly(argv)
    am = _parse_amcache(out)        # SKELETON
    return _result(am, "amcache", "AmcacheParser", argv, evidence_path=hive,
                   parse_ok=am is not None, notes=err[:200] if err else "")


@mcp.tool()
def get_srum() -> dict[str, Any]:
    """SRUM network/app usage. Trust 0.78 — contradicts cleared event logs."""
    srum = os.path.join(IMAGE_ROOT, "Windows", "System32", "sru", "SRUDB.dat")
    argv = ["SrumECmd", "-f", srum, "--json", "-"]
    out, err, rc = run_readonly(argv)
    sr = _parse_srum(out)
    return _result(sr, "srum", "SrumECmd", argv, evidence_path=srum,
                   parse_ok=sr is not None, notes=err[:200] if err else "")


@mcp.tool()
def get_eventlog(channel: str) -> dict[str, Any]:
    """Windows event log records for a channel. Trust 0.40 — clearable/forgeable."""
    argv = ["vol", "-f", MEMORY_IMAGE, "-r", "json", "windows.evtxlog", "--channel", channel]
    out, err, rc = run_readonly(argv)
    ev = _parse_vol_json(out)
    return _result(ev, "eventlog", "evtx", argv, parse_ok=ev is not None,
                   notes=err[:200] if err else "")


# ── parser skeletons (fill during days 1–4 against real tool output) ─────────
def _parse_mft_si(raw: str, path: str) -> dict[str, str] | None:
    """TODO: extract $SI created/modified/accessed for `path` from MFTECmd json."""
    return None


def _parse_mft_fn(raw: str, path: str) -> dict[str, str] | None:
    """TODO: extract $FN created/modified/accessed for `path`."""
    return None


def _parse_vol_json(raw: str) -> list[dict[str, Any]] | None:
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None


def _parse_prefetch(raw: str, exe: str) -> dict[str, Any] | None:
    return None


def _parse_amcache(raw: str) -> list[dict[str, Any]] | None:
    return None


def _parse_srum(raw: str) -> list[dict[str, Any]] | None:
    return None


if __name__ == "__main__":
    mcp.run()   # stdio transport
