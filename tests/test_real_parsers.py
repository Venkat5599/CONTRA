"""
Real-tool parser tests — validated against ACTUAL MFTECmd 2026.5 output captured
on the SIFT VPS (contra/fixtures/real_mft/mftecmd_output.json). Proves the parser
reads real forensic-tool JSON and that R1 fires on the genuine timestomp signal.
"""

from pathlib import Path

from contra.parsers import parse_mft_json
from contra import contradiction
from contra.trust import TrustTaggedResult

REAL = Path(__file__).resolve().parent.parent / "contra/fixtures/real_mft/mftecmd_output.json"


def _real_raw() -> str:
    return REAL.read_text(encoding="utf-8")


def test_parser_finds_evil_record_in_real_output():
    rec = parse_mft_json(_real_raw(), "C:\\Windows\\Temp\\evil.exe")
    assert rec is not None
    assert rec["si_timestamps"]["created"] is not None
    # the planted timestomp: $SI modified (2019) precedes $SI created (2026)
    assert rec["si_timestamps"]["modified"].startswith("2019")


def test_r1_fires_on_real_timestomp():
    rec = parse_mft_json(_real_raw(), "evil.exe")
    art = TrustTaggedResult(
        value=rec, artifact_type="mft_fn_timestamp", source_tool="MFTECmd",
        raw_cmd=["MFTECmd", "-f", "$MFT", "--json", "-"], parse_ok=True,
    ).to_dict()
    events = contradiction.check({"mft_fn_timestamp": art})
    assert any(e.rule_id == "R1" for e in events), "R1 must fire on real timestomp"


def test_parser_handles_clean_file():
    rec = parse_mft_json(_real_raw(), "report.txt")
    assert rec is not None
    art = TrustTaggedResult(value=rec, artifact_type="mft_fn_timestamp",
                            source_tool="MFTECmd", raw_cmd=[], parse_ok=True).to_dict()
    events = contradiction.check({"mft_fn_timestamp": art})
    assert not any(e.rule_id == "R1" for e in events), "clean file must not trip R1"
