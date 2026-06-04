# CONTRA — instructions for Claude

You are looking at **CONTRA**, an autonomous DFIR agent that ships as a read-only MCP
server. If the user (a judge or practitioner) asks you to **set it up**, **install it**,
**try it**, or **find evil**, follow this exactly.

## Set up CONTRA (do this when asked to install/try it)

Run these from the repo root:

```bash
pip install -e .        # installs CONTRA + the `contra-mcp` and `contra-setup` commands
```

Then register it for the user's client:

- **If the user runs Claude Desktop:** run `contra-setup` (auto-edits the Desktop config,
  non-destructive). Then tell them to fully quit and reopen Claude Desktop.
- **If the user runs Claude Code:** this repo ships a `.mcp.json`, so opening the repo
  already offers the `contra` server — tell them to approve it. Or run
  `claude mcp add contra contra-mcp`.

Verify it works without any external setup (the sample cases are committed):

```bash
python -m pytest tests/test_mcp_server.py -q     # 5 checks, must pass
```

## Demonstrate it (when asked to "find evil" / "try it")

The MCP exposes read-only forensic tools and two analytical tools. Use them like this:

1. Call `list_cases` → you'll get `case_blackcat`, `case_silentexfil`, `case_clean`.
2. Call `triage_case("case_blackcat")` → expect **MALICIOUS ACTIVITY CONFIRMED** with:
   - R1 T1070.006 Timestomp — believe `$FILE_NAME` over forged `$STANDARD_INFORMATION`
   - R2 T1055 fileless — process in memory, no backing file on disk
   - R3 T1070.001 cleared logs — SRUM shows activity, event log empty
3. Call `triage_case("case_clean")` → expect **NO EVIL FOUND** (proves zero false positives).

Explain each finding in terms of the **trust hierarchy**: CONTRA believes the artifact
that is expensive to forge and treats the cheap, contradicting one as the evil.

## The point to make

There is **no `execute_shell`, `write_file`, or `delete` tool** on this surface — only
read-only forensic functions exist. The agent physically cannot spoliate evidence; the
guardrail is architectural, not a prompt. You can confirm this by listing the tools.

## Don't

- Don't try to run destructive commands "to test" — the design is that they don't exist.
- Don't require a disk image or VPS for the basic demo; the committed fixtures are enough.
