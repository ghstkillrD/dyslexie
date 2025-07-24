from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import shutil
import os
from models.cnn_model import load_model
from utils.image_utils import segment_letters, predict_letters, calculate_dyslexia_score
from pydantic import BaseModel
from typing import List
from utils.task_utils import evaluate_tasks

app = FastAPI()
model = load_model()

@app.post("/analyze-handwriting/")
async def analyze_handwriting(image: UploadFile = File(...)):
    # Save uploaded image
    temp_path = f"temp_{image.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    try:
        # Segment letters and predict
        letters = segment_letters(temp_path)
        counts = predict_letters(model, letters)
        percentage, message = calculate_dyslexia_score(counts)

        return JSONResponse({
            "dyslexia_score": percentage,
            "interpretation": message,
            "letter_counts": counts
        })
    finally:
        os.remove(temp_path)

# Define Task schema
class Task(BaseModel):
    name: str
    max_score: int
    score_obtained: int

class TaskEvaluationRequest(BaseModel):
    tasks: List[Task]

@app.post("/evaluate-tasks/")
def evaluate_task_scores(payload: TaskEvaluationRequest):
    result = evaluate_tasks(payload.tasks)
    return result
