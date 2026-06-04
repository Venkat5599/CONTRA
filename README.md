# CONTRA — Anti-Forensic Contradiction Engine

> An autonomous DFIR agent that **assumes the evidence is lying**. It finds evil by
> catching the contradictions between artifacts an attacker can forge and artifacts
> they cannot — encoding how a senior analyst actually thinks.
>
> SANS **Find Evil!** submission · Architecture pattern #2 (Custom MCP Server) · MIT.

---

## The one-sentence thesis

Everyone else builds an agent that runs forensic tools and trusts the output. CONTRA
weights every artifact by how expensive it is to forge; when two sources disagree it
believes the harder-to-forge one and raises the tampering itself as the finding.
**Self-correction isn't "I made a mistake" — it's "the disk is gaslighting me."**

## Why it scores

| Judging criterion | CONTRA |
|---|---|
| #1 Autonomous self-correction (tiebreaker) | trust-check VERIFY → re-weight + pivot CORRECT, every step logged |
| #2 IR accuracy | trust-weighted scoring kills the #1 false positive: trusting forged artifacts |
| #3 Breadth/depth | deep on ONE Windows host: disk + memory, full anti-forensic coverage |
| #4 Constraint impl | read-only MCP surface — destructive functions physically absent (see tests) |
| #5 Audit trail | provenance graph; every finding → `raw_cmd` + `evidence_sha256` |
| #6 Usability | clickable "why flagged" → the contradiction + both tool runs |

## Layout

```
contra/
  trust.py           # Evidence Trust Hierarchy + TrustTaggedResult envelope
  safe_exec.py       # architectural guardrail: allow-list, shell=False, hashing
  mcp_server.py      # read-only MCP tool surface (typed forensic functions)
  contradiction.py   # deterministic anti-forensic rule engine (R1 timestomp, ...)
  agent.py           # autonomous loop: PLAN→ACT→OBSERVE→VERIFY→CORRECT, max-iter, JSONL
tests/
  test_guardrail.py  # proves the read-only boundary holds (bypass test)
PRD.md ARCHITECTURE.md
```

## Run (dev)

```bash
pip install -r requirements.txt
pytest tests/                      # guardrail proofs pass with no image
python -m contra.mcp_server        # start read-only MCP server (stdio)
python -m contra.agent --image /evidence --max-iterations 25 --log logs/run.jsonl
```

Set `CONTRA_IMAGE_ROOT` and `CONTRA_MEMORY_IMAGE` to your ro-mounted SIFT case data.

## Status

Skeleton complete: trust model, guardrail, MCP surface, contradiction rules R1–R3,
loop control flow + logging. Next: tool parsers (days 1–4), Claude API wiring in the
loop (days 5–7), flowsint graph (days 8–9), benchmark + accuracy report (day 10).
