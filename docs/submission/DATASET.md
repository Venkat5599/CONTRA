# CONTRA — Dataset Documentation

> What CONTRA was tested against, where it came from, and what it found.
> Submission deliverable #5. Reproducibility starts here.

## A. Real evidence (built + parsed on the SIFT VPS)

| Item | How produced | What it proves |
|------|--------------|----------------|
| `case.ntfs` | 64 MB NTFS image, `mkfs.ntfs` on Ubuntu 24.04 | a real filesystem to parse |
| `evil.exe` | planted in `\Windows\Temp`, timestamps rolled back via `touch -t 201903120814` | a real timestomp to catch |
| `$MFT` | extracted from the image with Sleuthkit `icat case.ntfs 0` | a real Master File Table |
| `mftecmd_output.json` | real **MFTECmd 2026.5** `--json` over the `$MFT` | genuine forensic-tool output |

Build is fully scripted: `tools/vps_scripts/build_evidence.sh`. The captured real output
is committed at `contra/fixtures/real_mft/mftecmd_output.json` and drives
`tests/test_real_parsers.py`.

**What CONTRA found:** `evil.exe` — `$STANDARD_INFORMATION` modified (2019-03-12) precedes
its created time (2026-06-04): an impossible ordering. MFTECmd's own `uSecZeros` flag set.
→ R1 Timestomp (T1070.006). The benign `report.txt` in the same image: no finding.

## B. Synthetic ground-truth cases (engine validation)

Three cases with machine-readable ground truth (`ground_truth.json`) for scored accuracy.
Each artifact JSON mirrors the real tool's schema so rules transfer to real output.

| Case | Planted scenario | Expected findings (ground truth) |
|------|------------------|----------------------------------|
| `case_blackcat` | timestomped fileless implant, cleared logs | R1 T1070.006, R2 T1055, R3 T1070.001 |
| `case_silentexfil` | staged exfil, binary wiped, prefetch deleted | R4 T1485, R5 T1070.004 |
| `case_clean` | benign host, consistent artifacts | (none — proves 0 false positives) |

Ground truth and expected-FP counts live beside each case; the grader
(`contra/eval/grader.py`) scores precision/recall/FP/FN automatically.

## C. SIFT toolchain (the real tools, on the VPS)

Ubuntu 24.04 · .NET 9 · provisioned by `tools/vps_scripts/install_eztools.sh`:

- **volatility3** (pipx) — `windows.pslist`, `windows.netscan`
- **Eric Zimmerman tools** (net9) — MFTECmd, PECmd, AmcacheParser, SrumECmd, RECmd
- read-only shims in `/usr/local/bin`; Sleuthkit + ntfs-3g for image handling

## D. Reproduce

```bash
# 1. provision the toolchain on a fresh Ubuntu host
python tools/vps.py --script tools/vps_scripts/install_eztools.sh
# 2. build real evidence + capture real MFTECmd output
python tools/vps.py --script tools/vps_scripts/build_evidence.sh
# 3. run the autonomous agent against the live evidence
python -m contra.run_real --planner offline
# 4. score the engine against ground truth
python -m contra.eval.run_evals --pass-k 3
```
