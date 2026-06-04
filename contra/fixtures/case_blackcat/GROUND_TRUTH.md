# Ground truth — case_blackcat (synthetic)

Planted anti-forensic scenario for offline pipeline validation + accuracy scoring.
The agent should reach all three findings without being told they exist.

| # | Planted fact | Expected detection | Rule | MITRE |
|---|--------------|--------------------|------|-------|
| 1 | `evil.exe` $SI created 2019 but $FN created 2026-06-01 | timestomping; 2019 is forged | R1 | T1070.006 |
| 2 | `evil.exe` PID 3344 resident in memory, no backing file on disk | fileless / hollowing | R2 | T1055 |
| 3 | SRUM shows network activity, event log empty | event logs cleared | R3 | T1070.001 |

Corroboration the agent should pivot to after R1 fires:
- prefetch: EVIL.EXE run_count 4, last run 2026-06-01 → confirms real exec, refutes 2019.
- netscan: PID 3344 → 185.220.101.44:443 ESTABLISHED → live C2.

Expected false positives: 0. Expected missed: 0.
