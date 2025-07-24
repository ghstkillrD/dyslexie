def evaluate_tasks(tasks):
    total_max = 0
    total_obtained = 0
    underperforming = []

    for task in tasks:
        max_score = task.max_score
        obtained = task.score_obtained

        total_max += max_score
        total_obtained += obtained

        if obtained / max_score < 0.5:
            underperforming.append(task.name)

    normalized_score = round((total_obtained / total_max) * 100, 2) if total_max > 0 else 0

    return {
        "normalized_score": normalized_score,
        "underperforming_tasks": underperforming
    }
