"""
CONTRA RealProvider — the agent runs LIVE SIFT tools on the VPS and parses real output.

Drop-in replacement for FixtureProvider. Same call signature, so the agent loop,
contradiction engine, and graph are unchanged — only the evidence source becomes real.

Each tool: build read-only argv -> RemoteExecutor (allow-list enforced) -> parse real
stdout with contra.parsers -> wrap in the trust envelope with the real command + a
SHA-256 of the source artifact for provenance.

Env: CONTRA_VPS_HOST/USER/PASS, plus CONTRA_MFT (remote $MFT path) and friends.
"""

from __future__ import annotations

import os
from typing import Any

from .remote_exec import RemoteExecutor
from .trust import TrustTaggedResult
from . import parsers

EVID = os.environ.get("CONTRA_EVID_DIR", "/root/evidence")
MFT_PATH = os.environ.get("CONTRA_MFT", f"{EVID}/$MFT")
MEM_PATH = os.environ.get("CONTRA_MEM", f"{EVID}/memory.raw")
AMCACHE = os.environ.get("CONTRA_AMCACHE", f"{EVID}/Amcache.hve")


class RealProvider:
    def __init__(self, executor: RemoteExecutor | None = None,
                 target_file: str = "C:\\Windows\\Temp\\evil.exe"):
        self.x = executor or RemoteExecutor()
        self.target_file = target_file

    def _wrap(self, value, atype, tool, argv, src_path="", parse_ok=True, notes=""):
        sha = ""
        try:
            if src_path:
                sha = self.x.sha256(src_path)
        except Exception:
            pass
        return TrustTaggedResult(value=value, artifact_type=atype, source_tool=tool,
                                 raw_cmd=argv, evidence_sha256=sha,
                                 parse_ok=parse_ok, notes=notes).to_dict()

    def __call__(self, tool: str, args: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._dispatch(tool, args)
        except Exception as e:  # network/guardrail/parse error -> fail closed
            return TrustTaggedResult(value=None, artifact_type="unknown",
                                     source_tool=tool, raw_cmd=[tool],
                                     parse_ok=False, notes=f"{type(e).__name__}: {e}"[:200]
                                     ).to_dict()

    def _dispatch(self, tool: str, args: dict[str, Any]) -> dict[str, Any]:
        if tool == "get_mft_record":
            argv = ["MFTECmd", "-f", MFT_PATH, "--csvf", "out.csv", "--json", "/tmp/contra_mft"]
            # MFTECmd writes a json file; run then read it back
            out, err, rc = self.x.run(["MFTECmd", "-f", MFT_PATH, "--json", "/tmp/contra_mft"])
            raw = self._read_latest_json("/tmp/contra_mft")
            rec = parsers.parse_mft_json(raw, args.get("path", self.target_file))
            return self._wrap(rec, "mft_fn_timestamp", "MFTECmd",
                              ["MFTECmd", "-f", MFT_PATH, "--json", "-"],
                              src_path=MFT_PATH, parse_ok=rec is not None,
                              notes=err[:160])

        if tool == "list_memory_procs":
            argv = ["vol", "-f", MEM_PATH, "-r", "json", "windows.pslist"]
            out, err, rc = self.x.run(argv, timeout=600)
            procs = parsers.parse_vol_pslist(out)
            return self._wrap(procs, "memory_proc", "volatility3.pslist", argv,
                              src_path=MEM_PATH, parse_ok=procs is not None, notes=err[:160])

        if tool == "list_memory_netconns":
            argv = ["vol", "-f", MEM_PATH, "-r", "json", "windows.netscan"]
            out, err, rc = self.x.run(argv, timeout=600)
            conns = parsers.parse_vol_netscan(out)
            return self._wrap(conns, "memory_netconn", "volatility3.netscan", argv,
                              src_path=MEM_PATH, parse_ok=conns is not None, notes=err[:160])

        if tool == "get_amcache":
            argv = ["AmcacheParser", "-f", AMCACHE, "--json", "/tmp/contra_am"]
            out, err, rc = self.x.run(argv)
            raw = self._read_latest_json("/tmp/contra_am")
            am = parsers.parse_amcache_json(raw)
            return self._wrap(am, "amcache", "AmcacheParser",
                              ["AmcacheParser", "-f", AMCACHE, "--json", "-"],
                              src_path=AMCACHE, parse_ok=am is not None, notes=err[:160])

        # tools without real evidence yet -> honest "not available" (parse_ok False)
        return TrustTaggedResult(value=None, artifact_type=_atype_for(tool),
                                 source_tool=tool, raw_cmd=[tool], parse_ok=False,
                                 notes="no real evidence wired for this tool yet").to_dict()

    def _read_latest_json(self, remote_dir: str) -> str:
        c = self.x._conn()
        _, o, _ = c.exec_command(f"ls -t {remote_dir}/*.json 2>/dev/null | head -1")
        path = o.read().decode().strip()
        return self.x.read_file(path) if path else ""


def _atype_for(tool: str) -> str:
    return {"get_prefetch": "prefetch", "get_usnjrnl": "usnjrnl",
            "get_srum": "srum", "get_eventlog": "eventlog"}.get(tool, "unknown")
