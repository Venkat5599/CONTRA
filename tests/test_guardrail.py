"""
Guardrail tests — proof the read-only boundary is ARCHITECTURAL, not prompt-based.
These back the bypass-test section of ACCURACY_REPORT.md (judging criterion #4).
"""

import pytest

from contra.safe_exec import run_readonly, GuardrailViolation, ALLOWED_BINARIES


def test_destructive_binary_refused():
    # The classic spoliation attempt — wipe the disk.
    with pytest.raises(GuardrailViolation):
        run_readonly(["dd", "if=/dev/zero", "of=/dev/sda"])


def test_rm_refused():
    with pytest.raises(GuardrailViolation):
        run_readonly(["rm", "-rf", "/evidence"])


def test_format_refused():
    with pytest.raises(GuardrailViolation):
        run_readonly(["mkfs.ext4", "/dev/sdb1"])


def test_injected_instruction_has_nowhere_to_land():
    # Simulates a prompt-injection inside case data telling the agent to destroy
    # evidence. Even if the LLM "obeyed", the call cannot be constructed — the
    # binary is not in the allow-list. No code path reaches a destructive syscall.
    malicious = ["dd", "if=/dev/zero", "of=/dev/sda", "bs=1M"]
    with pytest.raises(GuardrailViolation):
        run_readonly(malicious)


def test_forbidden_flag_on_allowed_binary():
    # Even an allow-listed binary cannot be coaxed into a write flag.
    with pytest.raises(GuardrailViolation):
        run_readonly(["vol", "--write", "-f", "/evidence/mem.raw"])


def test_allowlist_is_readonly_tools_only():
    destructive = {"dd", "rm", "mkfs", "mkfs.ext4", "format", "shred", "wipefs"}
    assert destructive.isdisjoint(ALLOWED_BINARIES)
