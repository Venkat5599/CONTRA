# CONTRA — Demo Video Script (5 min)

> Submission deliverable #2. Screencast of live terminal + console, audio narration.
> Must show the agent working on real case data **and at least one self-correction**.

## 0:00–0:30 — The problem
> "An AI attacker goes from access to domain control in under 8 minutes. The defender is
> still opening their toolkit. And every defender's agent has the same flaw — it runs a
> forensic tool and believes the output. But an attacker's last act is to lie to those
> tools. Meet CONTRA: it assumes the evidence is lying."

Show the landing page hero. Click **Launch console**.

## 0:30–1:30 — The thesis, on screen
Scroll the console's trust hierarchy. Narrate:
> "Every artifact is weighted by how hard it is to forge. Memory: 0.95 — can't be faked.
> `$STANDARD_INFORMATION` timestamp: 0.30 — trivial. When two sources disagree, CONTRA
> believes the expensive one and treats the cheap one as the crime scene."

## 1:30–3:00 — The money shot: real timestomp, real tools, self-correction
Terminal, live on the SIFT VPS:
```bash
python -m contra.run_real --planner offline
```
Narrate as it runs:
> "The agent is running real MFTECmd on a real `$MFT` we extracted with Sleuthkit. Watch
> iteration one — it reads the file. `$STANDARD_INFORMATION` modified time is 2019. But
> created is 2026. That ordering is physically impossible. The agent self-corrects: the
> 2019 date is forged. Timestomp. T1070.006."

Point at the output: `[R1] ... — manipulated timestamps`, and the `sha=` provenance.

## 3:00–4:00 — Why it's safe (architectural guardrail)
```bash
python -c "from contra.remote_exec import *; ..."   # the bypass test
```
> "Can the agent destroy evidence? We tried — `dd`, `rm`, a `--write` flag, a shell escape.
> Every one refused at the architecture, before it crosses the wire. Not a prompt asking
> nicely — the destructive function doesn't exist. A prompt injection has nowhere to land."

Show the four `[REFUSED]` lines and the one `[OK]` read-only call.

## 4:00–4:40 — Accuracy + audit trail
```bash
python -m contra.eval.run_evals --pass-k 3
```
> "Across attack and benign cases: precision 1.0, recall 1.0, zero false positives, stable
> over three runs. And every finding traces back to the exact command and evidence hash."

Click a finding in the console → show the provenance table.

## 4:40–5:00 — Close
> "CONTRA isn't a bigger model. It's a better way for the agent to doubt — deterministic
> trust math under an LLM's judgment. Autonomy you can stand behind in court. Open source,
> MIT, runs on the SIFT Workstation today."

Show the GitHub repo + console URL.
