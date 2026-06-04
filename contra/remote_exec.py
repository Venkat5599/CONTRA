"""
CONTRA remote executor — run allow-listed read-only forensic tools on the SIFT VPS.

Same architectural guardrail as safe_exec, enforced before anything crosses the wire:
only ALLOWED_BINARIES, argv-built command, no shell metacharacters injected by the
agent. Credentials come from env (CONTRA_VPS_HOST/USER/PASS), never the repo.

The agent never holds an SSH shell — it can only invoke these specific tool commands.
A destructive command cannot be constructed: the binary is not on the list.
"""

from __future__ import annotations

import os
import shlex

import paramiko

from .safe_exec import ALLOWED_BINARIES, FORBIDDEN_FLAG_SUBSTRINGS, GuardrailViolation


def _assert_allowed(argv: list[str]) -> None:
    if not argv:
        raise GuardrailViolation("empty argv")
    binary = argv[0].split("/")[-1]
    if binary not in ALLOWED_BINARIES:
        raise GuardrailViolation(f"binary {binary!r} not in read-only allow-list — refused")
    joined = " ".join(argv)
    for bad in FORBIDDEN_FLAG_SUBSTRINGS:
        if bad in joined:
            raise GuardrailViolation(f"forbidden flag pattern {bad!r} — refused")


class RemoteExecutor:
    def __init__(self, host: str | None = None, user: str | None = None,
                 password: str | None = None):
        self.host = host or os.environ["CONTRA_VPS_HOST"]
        self.user = user or os.environ.get("CONTRA_VPS_USER", "root")
        self.password = password or os.environ["CONTRA_VPS_PASS"]
        self._client: paramiko.SSHClient | None = None

    def _conn(self) -> paramiko.SSHClient:
        if self._client is None:
            c = paramiko.SSHClient()
            c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            c.connect(self.host, username=self.user, password=self.password, timeout=30)
            self._client = c
        return self._client

    def run(self, argv: list[str], timeout: int = 180) -> tuple[str, str, int]:
        """Execute an allow-listed read-only tool remotely. Returns (stdout, stderr, rc)."""
        _assert_allowed(argv)
        # build a safe shell string (each arg quoted) — PATH includes EZ shims + pipx
        cmd = "export PATH=$PATH:/root/.local/bin:/usr/local/bin; " + \
              " ".join(shlex.quote(a) for a in argv)
        c = self._conn()
        _, o, e = c.exec_command(cmd, timeout=timeout, get_pty=False)
        out = o.read().decode(errors="replace")
        err = e.read().decode(errors="replace")
        rc = o.channel.recv_exit_status()
        return out, err, rc

    def read_file(self, remote_path: str, max_bytes: int = 4_000_000) -> str:
        c = self._conn()
        sftp = c.open_sftp()
        try:
            with sftp.open(remote_path, "r") as f:
                return f.read(max_bytes).decode(errors="replace")
        finally:
            sftp.close()

    def sha256(self, remote_path: str) -> str:
        c = self._conn()
        _, o, _ = c.exec_command(f"sha256sum {shlex.quote(remote_path)}", timeout=60)
        out = o.read().decode(errors="replace").strip()
        return out.split()[0] if out else ""

    def close(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
