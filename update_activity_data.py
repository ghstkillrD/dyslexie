#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from users.models import ActivityAssignment, ActivityProgress
import random

def update_activity_assignments():
    """Update existing ActivityAssignments with difficulty values"""
    difficulties = ['easy', 'medium', 'hard']
    assignments = ActivityAssignment.objects.all()
    
    for assignment in assignments:
        if not assignment.difficulty or assignment.difficulty == 'medium':
            assignment.difficulty = random.choice(difficulties)
            assignment.save()
            print(f"Updated {assignment.activity_name} with difficulty: {assignment.difficulty}")

def update_activity_progress():
    """Update existing ActivityProgress with score values"""
    progress_records = ActivityProgress.objects.all()
    
    for progress in progress_records:
        if progress.score is None:
            # Generate realistic scores based on status
            if progress.status == 'completed':
                progress.score = random.randint(7, 10)
            elif progress.status == 'in_progress':
                progress.score = random.randint(4, 8)
            elif progress.status == 'not_started':
                progress.score = None
            else:
                progress.score = random.randint(1, 6)
            
            progress.save()
            print(f"Updated {progress.activity_assignment.activity_name} on {progress.session_date} with score: {progress.score}")

if __name__ == "__main__":
    print("Updating ActivityAssignment difficulty values...")
    update_activity_assignments()
    
    print("\nUpdating ActivityProgress score values...")
    update_activity_progress()
    
    print("\nUpdate completed!")
