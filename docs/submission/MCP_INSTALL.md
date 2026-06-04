# CONTRA MCP — Install & Try It (for judges)

> CONTRA ships as a **real MCP server** (SANS approach #2). Add it to any MCP client
> and ask your agent to find evil. **Zero setup** — it serves committed sample cases,
> so you need no disk image, no VPS, no extra tooling.

## 1. Install + register — two commands, no JSON editing

```bash
pip install "git+https://github.com/Venkat5599/CONTRA.git"
contra-setup        # auto-configures Claude Desktop (finds the config, merges in CONTRA)
```

Then **fully quit and reopen Claude Desktop**. That's it — `contra` appears in the tools
list with 11 tools. `contra-setup` is non-destructive (keeps your other MCP servers) and
uses the absolute path to the server, so there are no PATH issues.

- Remove it later: `contra-setup --remove`
- Just see the config snippet: `contra-setup --print`

## 2. Other clients (manual)

### Claude Code (CLI)
```bash
claude mcp add contra contra-mcp
```
Or open this repo in Claude Code — it auto-detects the committed `.mcp.json`.

### Any MCP client / manual Desktop config
```json
{
  "mcpServers": {
    "contra": { "command": "contra-mcp", "args": [] }
  }
}
```

## 3. Try it — ask your agent

Once registered, just talk to your agent:

> **"List the forensic cases, then triage case_blackcat and tell me what evil you find."**

The agent will call CONTRA's read-only tools and get back trust-tagged evidence +
named findings. Expected result on `case_blackcat`:

```
verdict: MALICIOUS ACTIVITY CONFIRMED
  R1  T1070.006  Timestomp      — believe $FILE_NAME  > $STANDARD_INFORMATION (forged)
  R2  T1055      fileless        — believe volatility3.pslist > filesystem
  R3  T1070.001  cleared logs    — believe SrumECmd > eventlog
```

Try the others too: `case_silentexfil` (wipe + prefetch-delete) and `case_clean`
(benign — proves zero false positives).

## 4. The tool surface (read-only by construction)

| Tool | Returns | Trust |
|------|---------|-------|
| `list_cases` | available case images | — |
| `get_mft_record` | $SI vs $FN timestamps | 0.30 / 0.90 |
| `list_memory_procs` | processes in memory | 0.95 |
| `list_memory_netconns` | live network connections | 0.95 |
| `get_amcache` | execution records | 0.80 |
| `get_prefetch` | run-count + last-run | 0.80 |
| `get_usnjrnl` | NTFS change journal | 0.85 |
| `get_srum` | network/app usage | 0.78 |
| `get_eventlog` | Windows events | 0.40 |
| `check_contradictions` | run the engine, list findings | — |
| `triage_case` | full autonomous report + provenance | — |

**There is no `execute_shell`, no `write_file`, no `dd`/`rm`.** Those functions do not
exist on this server — a prompt injection in the case data cannot construct a
destructive call. That is the architectural guardrail (judging criterion #4), and you
can verify it: the destructive tools simply aren't in the list above.

## 5. Run it against real evidence (optional)

The same tool contract runs against live SIFT tools. Provision a host
(`tools/vps_scripts/install_eztools.sh`) and set `CONTRA_SOURCE=real` plus the VPS env;
the tools then invoke real MFTECmd / volatility3 over the read-only boundary.
