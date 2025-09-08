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

print("Copying missing file and checking media URLs...")
print("=" * 50)

# Let's use one of the existing files as a replacement for the missing 9.jpg
import shutil

source_file = "media/handwriting_samples/7.jpg"
target_file = "media/handwriting_samples/9.jpg"

if os.path.exists(source_file) and not os.path.exists(target_file):
    shutil.copy2(source_file, target_file)
    print(f"Copied {source_file} to {target_file}")

# Now check all samples again
samples = HandwritingSample.objects.all()
print(f"\nChecking all {samples.count()} samples:")

for sample in samples:
    if sample.image:
        file_path = sample.image.path
        exists = os.path.exists(file_path)
        url = sample.image.url
        print(f"Sample {sample.id} ({sample.student.name}): {url} - {'✓' if exists else '✗'}")