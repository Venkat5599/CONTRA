"""
Accuracy regression gate — every fixture case must match its ground truth.
Backs eval-driven development: pass^1 here, run_evals --pass-k 3 for stability.
"""

import pytest

from contra.eval.grader import grade_case
from contra.eval.run_evals import discover_cases


@pytest.mark.parametrize("case", discover_cases(), ids=lambda p: p.name)
def test_case_matches_ground_truth(case):
    score = grade_case(case)
    assert score.false_positives == 0, f"{case.name} spurious: {score.spurious}"
    assert score.false_negatives == 0, f"{case.name} missed: {score.missed}"
    assert score.precision == 1.0 and score.recall == 1.0
