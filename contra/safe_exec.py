"""
CONTRA safe execution layer — the architectural guardrail in code.

Rules enforced here (NOT in a prompt):
  1. Only binaries on ALLOWED_BINARIES may run.
  2. shell=False always — argv is a list, never a string. No shell metachars.
  3. No write/delete/format primitive exists anywhere in this module.
  4. Evidence images are opened read-only; we hash regions for provenance.

If the LLM (or an injected instruction inside case data) asks to run anything
destructive, there is simply no code path that reaches a destructive syscall.
"""

from __future__ import annotations

import hashlib
import subprocess
from pathlib import Path

# ── Binary allow-list ───────────────────────────────────────────────────────
# Read-only forensic tools only. Adding a binary here is a deliberate,
# auditable act. dd / mkfs / rm / dcfldd-write etc. are intentionally absent.
ALLOWED_BINARIES: frozenset[str] = frozenset({
    "vol",            # volatility3
    "MFTECmd",
    "PECmd",
    "AmcacheParser",
    "SrumECmd",
    "RECmd",
    "analyzeMFT.py",
    "usn",            # usnjrnl parser
})

# Flags we refuse to pass through even to allowed binaries (defense in depth).
FORBIDDEN_FLAG_SUBSTRINGS: tuple[str, ...] = (
    "--write", "-w ", "out=/dev", "of=/dev", "--format", "--wipe",
)

EXEC_TIMEOUT_SEC = 300


class GuardrailViolation(Exception):
    """Raised when a call attempts to leave the read-only boundary."""


def _assert_allowed(argv: list[str]) -> None:
    if not argv:
        raise GuardrailViolation("empty argv")
    binary = Path(argv[0]).name
    if binary not in ALLOWED_BINARIES:
        raise GuardrailViolation(
            f"binary {binary!r} not in read-only allow-list — refused at architecture"
        )
    joined = " ".join(argv)
    for bad in FORBIDDEN_FLAG_SUBSTRINGS:
        if bad in joined:
            raise GuardrailViolation(f"forbidden flag pattern {bad!r} in argv — refused")


def sha256_file(path: str | Path, max_bytes: int | None = None) -> str:
    """Hash a file (or first max_bytes) for evidence provenance. Read-only."""
    h = hashlib.sha256()
    read = 0
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1 << 20)
            if not chunk:
                break
            if max_bytes is not None and read + len(chunk) > max_bytes:
                h.update(chunk[: max_bytes - read])
                break
            h.update(chunk)
            read += len(chunk)
    return h.hexdigest()


def run_readonly(argv: list[str]) -> tuple[str, str, int]:
    """
    Execute an allow-listed read-only forensic binary.

    Returns (stdout, stderr, returncode). Never uses a shell. Never writes.
    Raises GuardrailViolation before spawning if the call is out of bounds.
    """
    _assert_allowed(argv)
    proc = subprocess.run(
        argv,
        shell=False,                 # CRITICAL: no shell interpolation, ever
        capture_output=True,
        text=True,
        timeout=EXEC_TIMEOUT_SEC,
        check=False,
    )
    return proc.stdout, proc.stderr, proc.returncode
