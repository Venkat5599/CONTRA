"""
CONTRA real-tool parsers — turn actual SIFT/EZ tool output into typed artifacts.

Validated against REAL tool output captured on the SIFT VPS (Ubuntu 24.04, .NET 9,
MFTECmd 2026.5, volatility3). MFTECmd emits line-delimited JSON; $STANDARD_INFORMATION
timestamps carry the 0x10 suffix, $FILE_NAME the 0x30 suffix:

  Created0x10 / LastModified0x10 / LastAccess0x10  -> $SI  (trivially forged)
  Created0x30 / LastModified0x30 / LastAccess0x30  -> $FN  (needs kernel)
  Timestomped (bool), uSecZeros (bool)             -> MFTECmd's own heuristics

These parsers are pure (no I/O); RealProvider feeds them captured stdout.
"""

from __future__ import annotations

import json
from typing import Any


def parse_mft_json(raw: str, target_path: str) -> dict[str, Any] | None:
    """
    Find the record for target_path in MFTECmd line-delimited JSON and return
    $SI/$FN timestamp sets plus MFTECmd's own timestomp signals.
    Matching is by filename (+ optional parent path fragment), case-insensitive.
    """
    want_name = target_path.replace("\\", "/").rstrip("/").split("/")[-1].lower()
    for line in raw.splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("FileName", "").lower() != want_name:
            continue
        si = {
            "created": r.get("Created0x10"),
            "modified": r.get("LastModified0x10"),
            "accessed": r.get("LastAccess0x10"),
        }
        fn = {
            "created": r.get("Created0x30"),
            "modified": r.get("LastModified0x30"),
            "accessed": r.get("LastAccess0x30"),
        }
        return {
            "path": target_path,
            "si_timestamps": si,
            "fn_timestamps": fn,
            "si_trust": 0.30,
            "fn_trust": 0.90,
            # real-tool corroborating signals (drive an extended timestomp check)
            "mftecmd_timestomped": bool(r.get("Timestomped", False)),
            "usec_zeros": bool(r.get("uSecZeros", False)),
            "parent_path": r.get("ParentPath", ""),
            "entry": r.get("EntryNumber"),
        }
    return None


def parse_vol_pslist(raw: str) -> list[dict[str, Any]] | None:
    """volatility3 windows.pslist -r json -> normalized process list."""
    try:
        rows = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None
    out = []
    for p in rows:
        out.append({
            "PID": p.get("PID"),
            "PPID": p.get("PPID"),
            "ImageFileName": p.get("ImageFileName"),
            "backing_file_missing": p.get("File output") in (None, "Disabled", ""),
        })
    return out


def parse_vol_netscan(raw: str) -> list[dict[str, Any]] | None:
    try:
        rows = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None
    return [{
        "PID": p.get("PID"), "Owner": p.get("Owner"),
        "LocalAddr": f"{p.get('LocalAddr')}:{p.get('LocalPort')}",
        "ForeignAddr": f"{p.get('ForeignAddr')}:{p.get('ForeignPort')}",
        "State": p.get("State"),
    } for p in rows]


def parse_amcache_json(raw: str) -> list[dict[str, Any]] | None:
    """AmcacheParser line-delimited or array JSON -> execution records."""
    records: list[dict[str, Any]] = []
    raw = raw.strip()
    try:
        data = json.loads(raw)
        rows = data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        rows = []
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("{"):
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    for r in rows:
        records.append({
            "name": r.get("ApplicationName") or r.get("Name") or r.get("FileName"),
            "path": r.get("FullPath") or r.get("Path"),
            "sha1": r.get("SHA1"),
            "last_modified": r.get("FileKeyLastWriteTimestamp") or r.get("LastModified"),
            "executed": True,
        })
    return records or None
