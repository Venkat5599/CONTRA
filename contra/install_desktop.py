"""
CONTRA one-command Claude Desktop installer.

Removes all the manual config friction. After `pip install`, a judge runs:

    contra-setup

…and CONTRA is registered in Claude Desktop (config located + merged automatically,
using the absolute path to this exact contra-mcp so there are no PATH issues). They just
restart Claude Desktop. No JSON editing, no absolute paths to copy.

    contra-setup            # add CONTRA to Claude Desktop
    contra-setup --remove   # remove it
    contra-setup --print    # just print the config snippet, change nothing
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path


def desktop_config_path() -> Path:
    """Locate claude_desktop_config.json across platforms."""
    if sys.platform == "darwin":
        return Path.home() / "Library/Application Support/Claude/claude_desktop_config.json"
    if sys.platform.startswith("win"):
        return Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming")) / "Claude/claude_desktop_config.json"
    return Path.home() / ".config/Claude/claude_desktop_config.json"


def server_command() -> tuple[str, list[str]]:
    """Prefer the installed contra-mcp launcher; fall back to `python -m`."""
    exe = shutil.which("contra-mcp")
    if exe:
        return exe, []
    return sys.executable, ["-m", "contra.mcp_server"]


def contra_entry() -> dict:
    cmd, args = server_command()
    return {"command": cmd, "args": args}


def load(cfg: Path) -> dict:
    if cfg.exists():
        try:
            return json.loads(cfg.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"! existing config is not valid JSON: {cfg}\n  fix or move it, then rerun.")
            sys.exit(1)
    return {}


def save(cfg: Path, data: dict) -> None:
    cfg.parent.mkdir(parents=True, exist_ok=True)
    cfg.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description="Register CONTRA MCP in Claude Desktop")
    ap.add_argument("--remove", action="store_true")
    ap.add_argument("--print", dest="show", action="store_true")
    args = ap.parse_args()

    if args.show:
        print(json.dumps({"mcpServers": {"contra": contra_entry()}}, indent=2))
        return

    cfg = desktop_config_path()
    data = load(cfg)
    data.setdefault("mcpServers", {})

    def out(s: str) -> None:
        sys.stdout.buffer.write((s + "\n").encode("utf-8", "replace"))

    if args.remove:
        if data["mcpServers"].pop("contra", None) is not None:
            save(cfg, data)
            out(f"[ok] removed CONTRA from {cfg}")
        else:
            out("CONTRA was not registered - nothing to remove.")
        return

    entry = contra_entry()
    data["mcpServers"]["contra"] = entry
    save(cfg, data)
    out(f"[ok] CONTRA registered in Claude Desktop\n  config:  {cfg}\n  command: {entry['command']} {' '.join(entry['args'])}".rstrip())
    out("\n-> Now QUIT Claude Desktop completely (tray -> Quit) and reopen it.")
    out("   Then click the tools icon - you'll see 'contra' with 11 tools.")
    out('   Try: "List the cases, then triage case_blackcat and explain the evil."')


if __name__ == "__main__":
    main()
