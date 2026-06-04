# CONTRA — Try It Out

> Step-by-step for judges. Submission deliverable #7.

## Fastest path (offline, no SIFT, ~1 minute)

The full pipeline runs locally on committed fixtures — no VPS, no API key.

```bash
git clone <repo-url> && cd contra
python -m venv .venv && . .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
pip install pytest

# 1. run the whole test suite (guardrail + accuracy + real-parser)
pytest -q                       # 16 passing

# 2. run the autonomous agent on a planted case (no LLM needed)
python -m contra.demo_offline   # finds R1 timestomp, R2 fileless, R3 cleared-logs

# 3. score accuracy vs ground truth
python -m contra.eval.run_evals --pass-k 3   # precision 1.00, recall 1.00, 0 FP

# 4. generate an incident report with full provenance
python -m contra.report --case contra/fixtures/case_blackcat
```

## Genuine autonomy (LLM planner)

Uses an OpenAI-compatible endpoint. Set a key (any provider) and run:

```bash
export CONTRA_LLM_KEY=...                       # or use OpenCode auth.json
export CONTRA_LLM_MODEL=deepseek-v4-flash-free  # free model works
python -m contra.run_llm --case contra/fixtures/case_blackcat
# the LLM chooses each tool; the deterministic engine catches the contradictions
```

## Real SIFT tools end-to-end (on a Linux host)

```bash
# provision volatility3 + Eric Zimmerman tools (Ubuntu, installs .NET 9)
export CONTRA_VPS_HOST=... CONTRA_VPS_USER=root CONTRA_VPS_PASS=...
python tools/vps.py --script tools/vps_scripts/install_eztools.sh
python tools/vps.py --script tools/vps_scripts/build_evidence.sh   # real $MFT + MFTECmd

# autonomous agent runs LIVE MFTECmd on the host, over the read-only boundary
python -m contra.run_real --planner offline
```

## The evidence console (web)

```bash
cd web
bun install                       # or npm install
python -m contra.export_web       # regenerate data bundle from the engine
bun dev                           # open http://localhost:5173
```

The landing explains the thesis; **Launch console** opens the dark dashboard with the
findings, contradiction graph, self-correction timeline, and clickable audit trail.

## Verify the spoliation guard yourself

```bash
pytest tests/test_guardrail.py -v   # 6 destructive commands, all refused at the architecture
```
