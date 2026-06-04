"""
CONTRA contradiction engine — deterministic anti-forensic detector.

This is the "recognize when something doesn't add up" faculty, implemented as
deterministic rules over trust-tagged artifacts — NOT left to the LLM. The LLM
later *names* and *explains* the technique; the detection itself is reproducible.

Each rule compares two sources. When the lower-trust source disagrees with the
higher-trust one, the disagreement IS evidence of tampering => a finding.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable


@dataclass
class ContradictionEvent:
    rule_id: str
    technique: str            # MITRE ATT&CK id + name
    summary: str
    trusted_source: str       # source_tool we believe
    distrusted_source: str    # source_tool we flag as forged
    trusted_value: Any
    distrusted_value: Any
    confidence: float         # trust delta-derived
    pivot_hint: str           # what the agent should check next
    evidence_refs: list[str] = field(default_factory=list)  # raw_cmd / sha256

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__


def _parse_ts(v: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(v, fmt)
        except (ValueError, TypeError):
            continue
    return None


# ── Rule R1: timestomping — $SI created far earlier than $FN ─────────────────
def rule_timestomp(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    out: list[ContradictionEvent] = []
    mft = artifacts.get("mft_fn_timestamp")
    if not mft or not mft.get("parse_ok"):
        return out
    val = mft["value"]
    si = (val.get("si_timestamps") or {}).get("created")
    fn = (val.get("fn_timestamps") or {}).get("created")
    si_dt, fn_dt = _parse_ts(si or ""), _parse_ts(fn or "")
    if si_dt and fn_dt and si_dt < fn_dt:
        # SI predates FN => SI was rolled back. FN (trust 0.90) wins.
        delta_days = (fn_dt - si_dt).days
        if delta_days >= 1:
            out.append(ContradictionEvent(
                rule_id="R1",
                technique="T1070.006 Indicator Removal: Timestomp",
                summary=(f"$SI created {si} predates $FN created {fn} by "
                         f"{delta_days}d — $SI timestamp was forged."),
                trusted_source="MFTECmd:$FILE_NAME",
                distrusted_source="MFTECmd:$STANDARD_INFORMATION",
                trusted_value=fn, distrusted_value=si,
                confidence=0.90 - 0.30,
                pivot_hint="confirm real execution time via get_prefetch / get_amcache",
                evidence_refs=mft.get("raw_cmd", []),
            ))
    return out


# ── Rule R2: fileless — process in RAM, binary absent on disk ────────────────
def rule_fileless(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    out: list[ContradictionEvent] = []
    procs = artifacts.get("memory_proc")
    mft = artifacts.get("mft_fn_timestamp")
    if not procs or not procs.get("parse_ok"):
        return out
    on_disk_paths = set()
    if mft and mft.get("parse_ok"):
        on_disk_paths.add((mft["value"].get("path") or "").lower())
    for p in (procs.get("value") or []):
        img = (p.get("ImageFileName") or p.get("path") or "").lower()
        if img and img not in on_disk_paths and p.get("backing_file_missing"):
            out.append(ContradictionEvent(
                rule_id="R2",
                technique="T1055 Process Injection / fileless execution",
                summary=f"process {img} resident in memory but no backing file on disk.",
                trusted_source="volatility3.pslist",
                distrusted_source="filesystem",
                trusted_value=img, distrusted_value="absent on disk",
                confidence=0.95 - 0.50,
                pivot_hint="dump process with memory tools; check netscan for C2 socket",
                evidence_refs=procs.get("raw_cmd", []),
            ))
    return out


# ── Rule R3: cleared logs — eventlog silent but SRUM shows activity ──────────
def rule_log_cleared(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    out: list[ContradictionEvent] = []
    ev = artifacts.get("eventlog")
    srum = artifacts.get("srum")
    if not srum or not srum.get("parse_ok"):
        return out
    srum_has_net = bool(srum.get("value"))
    ev_empty = ev is not None and ev.get("parse_ok") and not ev.get("value")
    if srum_has_net and ev_empty:
        out.append(ContradictionEvent(
            rule_id="R3",
            technique="T1070.001 Indicator Removal: Clear Windows Event Logs",
            summary="SRUM shows network/app activity but event log is empty — logs cleared.",
            trusted_source="SrumECmd",
            distrusted_source="eventlog",
            trusted_value="network activity present", distrusted_value="no events",
            confidence=0.78 - 0.40,
            pivot_hint="check $UsnJrnl for evtx deletion; correlate SRUM timeframe",
            evidence_refs=srum.get("raw_cmd", []),
        ))
    return out


# ── Rule R4: wipe — $UsnJrnl shows create+delete and the file is gone ────────
def rule_usnjrnl_wipe(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    out: list[ContradictionEvent] = []
    usn = artifacts.get("usnjrnl")
    if not usn or not usn.get("parse_ok"):
        return out
    for entry in (usn.get("value") or []):
        reasons = {r.upper() for r in entry.get("reasons", [])}
        gone = entry.get("present_now") is False
        if {"FILE_CREATE", "FILE_DELETE"} <= reasons and gone:
            fname = entry.get("file", "<unknown>")
            out.append(ContradictionEvent(
                rule_id="R4",
                technique="T1485 Data Destruction (anti-forensic wipe)",
                summary=(f"$UsnJrnl records FILE_CREATE+FILE_DELETE for {fname} and the "
                         f"file is absent now — deliberate wipe after use."),
                trusted_source="MFTECmd.usn ($UsnJrnl)",
                distrusted_source="filesystem (file absent)",
                trusted_value=f"{fname}: create+delete logged",
                distrusted_value="file no longer present",
                confidence=0.85 - 0.20,
                pivot_hint="carve slack/unallocated for the deleted binary; check amcache for exec",
                evidence_refs=usn.get("raw_cmd", []),
            ))
    return out


# ── Rule R5: prefetch deleted — amcache proves exec, but no prefetch exists ───
def rule_prefetch_deleted(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    out: list[ContradictionEvent] = []
    am = artifacts.get("amcache")
    pf = artifacts.get("prefetch")
    if not am or not am.get("parse_ok"):
        return out
    executed = [e for e in (am.get("value") or []) if e.get("executed")]
    if not executed:
        return out
    # prefetch artifact collected but empty => prefetch files removed
    pf_empty = pf is not None and pf.get("parse_ok") and not pf.get("value")
    if pf_empty:
        names = ", ".join(e.get("name", "?") for e in executed[:3])
        out.append(ContradictionEvent(
            rule_id="R5",
            technique="T1070.004 Indicator Removal: File Deletion (prefetch wiped)",
            summary=(f"Amcache proves execution of {names} but no prefetch exists — "
                     f"prefetch artifacts were deleted to hide execution."),
            trusted_source="AmcacheParser",
            distrusted_source="prefetch (absent)",
            trusted_value=names, distrusted_value="no prefetch records",
            confidence=0.80 - 0.20,
            pivot_hint="confirm via SRUM/ShimCache; check $UsnJrnl for prefetch deletes",
            evidence_refs=am.get("raw_cmd", []),
        ))
    return out


# Rule registry. Add R6+ (registry persistence absence, shadow-copy deletion) later.
RULES: list[Callable[[dict[str, Any]], list[ContradictionEvent]]] = [
    rule_timestomp,
    rule_fileless,
    rule_log_cleared,
    rule_usnjrnl_wipe,
    rule_prefetch_deleted,
]


def check(artifacts: dict[str, Any]) -> list[ContradictionEvent]:
    """
    Run all rules over the collected artifact map.
    `artifacts` keyed by artifact_type -> TrustTaggedResult dict.
    Returns every contradiction found. Deterministic, side-effect free.
    """
    events: list[ContradictionEvent] = []
    for rule in RULES:
        events.extend(rule(artifacts))
    return events
