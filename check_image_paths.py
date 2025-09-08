#!/usr/bin/env python
import os
import django
import sys

# Add the project directory to the Python path
sys.path.append('.')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import HandwritingSample

print("Current HandwritingSample records:")
print("=" * 50)

samples = HandwritingSample.objects.all()
for sample in samples:
    print(f"ID: {sample.id}")
    print(f"Student: {sample.student.name}")
    print(f"Image path: {sample.image}")
    print(f"Image url: {sample.image.url if sample.image else 'No image'}")
    print(f"Uploaded at: {sample.uploaded_at}")
    print("-" * 30)

print(f"\nTotal samples: {samples.count()}")

# Check if image files exist in the expected locations
print("\nChecking file existence:")
print("=" * 50)

for sample in samples:
    if sample.image:
        file_path = sample.image.path
        exists = os.path.exists(file_path)
        print(f"Sample {sample.id}: {file_path} - {'EXISTS' if exists else 'NOT FOUND'}")