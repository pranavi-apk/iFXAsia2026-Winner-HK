from fastapi import HTTPException

from tally.store import load


def load_case(case_id: str) -> dict:
    try:
        return load(case_id)
    except FileNotFoundError:
        if case_id == "silver-oak":
            from tally.api.cases import sample_case
            return sample_case()
        raise HTTPException(status_code=404, detail="Case not found") from None
