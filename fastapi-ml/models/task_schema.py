from pydantic import BaseModel, Field
from typing import List

class TaskScore(BaseModel):
    name: str = Field(..., example="Letter Reversal")
    max_score: float = Field(..., gt=0, example=10)
    score_obtained: float = Field(..., ge=0, example=6)

class TaskEvaluationRequest(BaseModel):
    tasks: List[TaskScore]
