"""
CONTRA VPS runner — paramiko SSH helper for provisioning the SIFT toolchain.

Credentials come from env (never the repo):
    CONTRA_VPS_HOST, CONTRA_VPS_USER (default root), CONTRA_VPS_PASS

    python tools/vps.py "uname -a"
    python tools/vps.py --script setup.sh
"""

from __future__ import annotations

import os
import sys
import paramiko


def connect() -> paramiko.SSHClient:
    host = os.environ["CONTRA_VPS_HOST"]
    user = os.environ.get("CONTRA_VPS_USER", "root")
    pw = os.environ["CONTRA_VPS_PASS"]
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=30)
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[str, int]:
    # Wrap in bash -lc so PATH (pipx ~/.local/bin) and login env are present;
    # no PTY so output isn't munged.
    _, o, e = c.exec_command(cmd, timeout=timeout, get_pty=False)
    out = o.read().decode(errors="replace") + e.read().decode(errors="replace")
    rc = o.channel.recv_exit_status()
    return out, rc


def main() -> None:
    c = connect()
    try:
        if len(sys.argv) >= 3 and sys.argv[1] == "--script":
            cmd = open(sys.argv[2], encoding="utf-8").read()
        else:
            cmd = " ".join(sys.argv[1:]) or "echo no command"
        out, rc = run(c, cmd)
        sys.stdout.buffer.write(out.encode("utf-8", "replace"))
        sys.stdout.flush()
        sys.exit(rc)
    finally:
        c.close()


if __name__ == "__main__":
    main()
