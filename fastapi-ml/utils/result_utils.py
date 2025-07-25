from fastapi import HTTPException

def compute_final_score(ml_score: float, task_score: float) -> float:
    """
    Combine ML and task scores with equal weighting.
    """
    return round((ml_score + task_score) / 2, 2)


def interpret_final_result(score: float, cutoff: float) -> str:
    """
    Return diagnosis based on score and doctor-defined cutoff.
    """
    if cutoff < 0 or cutoff > 100:
        raise HTTPException(status_code=400, detail="Cutoff must be between 0 and 100")
    
    if score >= cutoff:
        return "Unlikely Dyslexic"
    elif score >= cutoff * 0.85:
        return "Borderline"
    else:
        return "Likely Dyslexic"
