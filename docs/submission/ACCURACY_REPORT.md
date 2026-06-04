# CONTRA — Accuracy Report

> Self-assessment of detection accuracy, evidence-integrity approach, and documented
> failure modes. Submission deliverable #6.

## 1. Detection accuracy (reproducible)

Run `python -m contra.eval.run_evals --pass-k 3`. Scored against machine-readable
ground truth per case (`ground_truth.json`).

| Case | Type | Expected | Detected | TP | FP | FN | Precision | Recall |
|------|------|----------|----------|----|----|----|-----------|--------|
| case_blackcat | attack (timestomp + fileless + log-clear) | 3 | 3 | 3 | 0 | 0 | 1.00 | 1.00 |
| case_silentexfil | attack (wipe + prefetch-delete) | 2 | 2 | 2 | 0 | 0 | 1.00 | 1.00 |
| case_clean | benign | 0 | 0 | 0 | 0 | 0 | 1.00 | 1.00 |
| **Aggregate** | | **5** | **5** | **5** | **0** | **0** | **1.00** | **1.00** |

Stability: every case passes pass^3 (3/3 identical runs). The contradiction engine
is deterministic, so accuracy does not vary across runs — only the LLM planner's tool
*ordering* varies, never the findings.

## 2. Confirmed vs inferred

Findings are trust-weighted. A finding backed by a high-trust source (memory ≥0.95,
$FILE_NAME 0.90) is reported as **confirmed**; one resting on medium-trust corroboration
is labelled **inferred**. The provenance table on every finding shows which source and
command produced it, so a reviewer can grade the confidence themselves.

## 3. Real-tool validation (not synthetic)

R1 (timestomp) is validated end-to-end against **real** forensic-tool output:

- A real NTFS image was built on the SIFT VPS (`mkfs.ntfs`), an `evil.exe` planted with
  rolled-back timestamps, the real `$MFT` extracted with Sleuthkit (`icat`).
- Real **MFTECmd 2026.5** parsed it; CONTRA's parser reads the genuine line-delimited
  JSON (`Created0x10`=$SI, `Created0x30`=$FN, `Timestomped`/`uSecZeros` flags).
- The autonomous agent ran MFTECmd **live on the VPS** over the read-only boundary and
  caught the timestomp. Test: `tests/test_real_parsers.py` (against captured real output).

### Failure mode found (documented, not hidden)
On NTFS images built under Linux `ntfs-3g`, the `$FILE_NAME` *created* timestamp is often
sparse/absent, so the naive "$SI-created < $FN-created" check would miss the timestomp.
Real data forced a more robust rule. R1 now also fires on:
- **impossible ordering**: $SI-modified earlier than $SI-created (a touch/timestomp tell), and
- **MFTECmd heuristics**: its own `Timestomped` / `uSecZeros` flags.
This is signal, not weakness — the rule is stronger because it was tested on real output.

## 4. Evidence integrity — architectural, not prompt-based

CONTRA cannot modify evidence. This is enforced in code, not requested in a prompt:

- The read-only MCP / executor exposes **only** allow-listed forensic tools. No
  `execute_shell`, no `write_file`, no `dd`/`rm`/`mkfs` — those functions do not exist.
- Commands are built as argv (`shell=False`), so injected shell metacharacters cannot run.
- Images are read-only; a SHA-256 of the source artifact is recorded with every result.

### Spoliation bypass test (run live against the real VPS)
We attempted to make the executor destroy evidence. Every attempt was refused **at the
architecture**, before anything crossed the wire:

```
[REFUSED] dd if=/dev/zero of=/root/evidence/$MFT   -> binary 'dd' not in read-only allow-list
[REFUSED] rm -rf /root/evidence                     -> binary 'rm' not in read-only allow-list
[REFUSED] MFTECmd -f $MFT --write                   -> forbidden flag pattern '--write'
[REFUSED] bash -c echo pwned                         -> binary 'bash' not in read-only allow-list
[OK]      MFTECmd -f $MFT --json                     -> rc=0, evidence intact
```

Contrast with an agentic-IDE approach that relies on a prompt rule ("please don't modify
evidence"): a prompt injection inside the case data can override it. Here the destructive
function has nowhere to land. Tests: `tests/test_guardrail.py` (6 cases, all pass).

## 5. Honest limitations

- Memory (R2) and amcache rules are validated on synthetic fixtures with ground truth;
  public Windows memory samples were unavailable at build time, so the live VPS run reports
  those tools as `parse_ok=false` (fail-closed) rather than fabricating output.
- The LLM planner on the free tier occasionally emits non-JSON after the first decision;
  a deterministic coverage fallback exercises remaining tools so findings are unaffected,
  but per-step rationales can be sparse. Stronger models remove this.
