import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from typing import List

transform = transforms.Compose([
    transforms.Resize((29, 29)),
    transforms.Grayscale(),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

def segment_letters(image_path: str) -> List[Image.Image]:
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    _, thresh = cv2.threshold(image, 128, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    letters = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 5 and h > 5:
            roi = thresh[y:y+h, x:x+w]
            roi_resized = cv2.resize(roi, (29, 29))
            letters.append(Image.fromarray(roi_resized))
    return letters

def predict_letters(model, letter_images: List[Image.Image]):
    counts = {'Corrected': 0, 'Normal': 0, 'Reversal': 0}
    for img in letter_images:
        input_tensor = transform(img).unsqueeze(0)
        output = model(input_tensor)
        pred = output.argmax(dim=1).item()
        if pred == 0:
            counts['Corrected'] += 1
        elif pred == 1:
            counts['Normal'] += 1
        elif pred == 2:
            counts['Reversal'] += 1
    return counts

def calculate_dyslexia_score(counts):
    total = sum(counts.values())
    if total == 0:
        return 0, "Insufficient data"
    score = (counts['Reversal'] * 1.0 + counts['Corrected'] * 0.5) / total
    percentage = round(score * 100, 2)
    if percentage > 60:
        label = "High likelihood of dyslexia"
    elif percentage > 30:
        label = "Moderate likelihood"
    else:
        label = "Low likelihood"
    return percentage, label
