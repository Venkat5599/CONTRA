"""
CONTRA evidence providers — the swap point between offline and real modes.

FixtureProvider  : reads planted synthetic JSON, wraps in the trust envelope.
                   Lets the full loop run locally with no SIFT, no network.
RealProvider     : (days 1–4) runs allow-listed SIFT binaries via safe_exec and
                   parses output. Same call signature, so the agent code never changes.

Both return a TrustTaggedResult dict keyed identically, so the contradiction engine
and agent loop are provider-agnostic.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .trust import TrustTaggedResult

# tool name -> (fixture filename, artifact_type, source_tool, raw_cmd template)
TOOL_MAP: dict[str, tuple[str, str, str, list[str]]] = {
    "get_mft_record":      ("mft.json",      "mft_fn_timestamp", "MFTECmd",
                            ["MFTECmd", "-f", "$MFT", "--json", "-"]),
    "list_memory_procs":   ("pslist.json",   "memory_proc",      "volatility3.pslist",
                            ["vol", "-f", "memory.raw", "-r", "json", "windows.pslist"]),
    "list_memory_netconns":("netscan.json",  "memory_netconn",   "volatility3.netscan",
                            ["vol", "-f", "memory.raw", "-r", "json", "windows.netscan"]),
    "get_prefetch":        ("prefetch.json", "prefetch",         "PECmd",
                            ["PECmd", "-d", "Windows/Prefetch", "--json", "-"]),
    "get_srum":            ("srum.json",     "srum",             "SrumECmd",
                            ["SrumECmd", "-f", "SRUDB.dat", "--json", "-"]),
    "get_eventlog":        ("eventlog.json", "eventlog",         "evtx",
                            ["vol", "-f", "memory.raw", "-r", "json", "windows.evtxlog"]),
    "get_amcache":         ("amcache.json",  "amcache",          "AmcacheParser",
                            ["AmcacheParser", "-f", "Amcache.hve", "--json", "-"]),
    "get_usnjrnl":         ("usnjrnl.json",  "usnjrnl",          "MFTECmd.usn",
                            ["MFTECmd", "-f", "$J", "--json", "-"]),
}


class FixtureProvider:
    """Serves planted artifacts from a fixture case directory."""

    def __init__(self, case_dir: str | Path):
        self.case_dir = Path(case_dir)
        if not self.case_dir.is_dir():
            raise FileNotFoundError(f"fixture case not found: {self.case_dir}")

    def __call__(self, tool: str, args: dict[str, Any]) -> dict[str, Any]:
        if tool not in TOOL_MAP:
            return TrustTaggedResult(
                value=None, artifact_type="unknown", source_tool=tool,
                raw_cmd=[tool], parse_ok=False, notes="tool not in fixture map",
            ).to_dict()
        fname, atype, source_tool, raw_cmd = TOOL_MAP[tool]
        fpath = self.case_dir / fname
        try:
            raw = fpath.read_text(encoding="utf-8")
            value = json.loads(raw)
            sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()
            return TrustTaggedResult(
                value=value, artifact_type=atype, source_tool=source_tool,
                raw_cmd=raw_cmd, evidence_sha256=sha, parse_ok=True,
                notes=f"fixture:{fname}",
            ).to_dict()
        except (OSError, json.JSONDecodeError) as e:
            return TrustTaggedResult(
                value=None, artifact_type=atype, source_tool=source_tool,
                raw_cmd=raw_cmd, parse_ok=False, notes=f"fixture error: {e}",
            ).to_dict()
