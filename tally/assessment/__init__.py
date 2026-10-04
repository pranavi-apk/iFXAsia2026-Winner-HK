"""The review pipeline. See pipeline.py for how the pieces fit together."""
from tally.assessment.pack import read_pdf
from tally.assessment.pipeline import assess
from tally.assessment.scoring import apply_risk, apply_score

__all__ = ["apply_risk", "apply_score", "assess", "read_pdf"]
