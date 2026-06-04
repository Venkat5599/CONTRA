export interface Finding {
  rule_id: string;
  technique: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  summary: string;
  trusted_source: string;
  distrusted_source: string;
  confidence: number;
  pivot_hint: string;
  evidence_refs: (string | number)[];
}

export interface Artifact {
  artifact_type: string;
  source_tool: string;
  trust: number;
  forge_cost: string;
  raw_cmd: (string | number)[];
  evidence_sha256: string;
  parse_ok: boolean;
}

export interface Correction {
  iteration: number;
  rule: string;
  technique: string;
  trusted: string;
  distrusted: string;
  pivot: string;
  confidence: number;
}

export interface TimelineStep {
  iteration: number | null;
  event: "plan" | "observe" | "CORRECT";
  tool?: string;
  artifact_type?: string;
  trust?: number;
  technique?: string;
}

export interface Score {
  case: string;
  expected: number;
  detected: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
}

export interface Case {
  name: string;
  verdict: string;
  iterations: number;
  findings: Finding[];
  artifacts: Artifact[];
  corrections: Correction[];
  timeline: TimelineStep[];
  score: Score;
  report_md: string;
}

export interface Bundle {
  generated_by: string;
  thesis: string;
  cases: Case[];
  aggregate: {
    cases: number;
    findings: number;
    false_positives: number;
    false_negatives: number;
  };
}
