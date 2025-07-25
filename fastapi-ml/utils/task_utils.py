from fastapi import HTTPException

def evaluate_tasks(tasks):
    if not tasks:
        raise HTTPException(status_code=400, detail="Task list cannot be empty")
    
    total_max = 0
    total_obtained = 0
    underperforming = []

    for task in tasks:
        max_score = task.max_score
        obtained = task.score_obtained

        if obtained > max_score:
            raise HTTPException(
                status_code=400,
                detail=f"Task '{task.name}' score cannot exceed max_score"
            )

        total_max += max_score
        total_obtained += obtained

        if obtained / max_score < 0.5:
            underperforming.append(task.name)

    normalized_score = round((total_obtained / total_max) * 100, 2) if total_max > 0 else 0

    return {
        "normalized_score": normalized_score,
        "underperforming_tasks": underperforming
    }
