def compute_final_score(ml_score: float, task_score: float) -> float:
    """
    Combine ML and task scores with equal weighting.
    """
    return round((ml_score + task_score) / 2, 2)


def interpret_final_result(score: float, cutoff: float) -> str:
    """
    Return diagnosis based on score and doctor-defined cutoff.
    """
    if score >= cutoff:
        return "Unlikely Dyslexic"
    elif score >= cutoff * 0.85:
        return "Borderline"
    else:
        return "Likely Dyslexic"
