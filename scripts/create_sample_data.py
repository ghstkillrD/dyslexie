#!/usr/bin/env python
import os
import sys
import django
from datetime import date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from users.models import ActivityAssignment, ActivityProgress, Student, User
import random

def create_sample_data():
    """Create comprehensive sample data for testing"""
    
    # Get or create a student and doctor
    try:
        student = Student.objects.get(student_id=14)
        doctor = User.objects.filter(role='doctor').first()
        
        if not doctor:
            print("No doctor found in the database")
            return
            
        print(f"Working with student: {student.name}")
        print(f"Working with doctor: {doctor.username}")
        
        # Create sample activity assignments
        activities = [
            {
                'activity_name': 'Daily writing practice',
                'activity_type': 'writing',
                'description': 'Practice letter formation and word writing',
                'difficulty': 'medium',
                'frequency': 'daily',
                'duration_minutes': 15,
                'target_audience': 'both'
            },
            {
                'activity_name': 'Daily reading practice', 
                'activity_type': 'reading',
                'description': 'Read age-appropriate texts with fluency focus',
                'difficulty': 'easy',
                'frequency': 'daily',
                'duration_minutes': 20,
                'target_audience': 'parent'
            },
            {
                'activity_name': 'Phonics training',
                'activity_type': 'phonics', 
                'description': 'Sound-letter correspondence exercises',
                'difficulty': 'hard',
                'frequency': 'bi-weekly',
                'duration_minutes': 30,
                'target_audience': 'teacher'
            }
        ]
        
        created_assignments = []
        
        for activity_data in activities:
            assignment, created = ActivityAssignment.objects.get_or_create(
                student=student,
                doctor=doctor,
                activity_name=activity_data['activity_name'],
                defaults={
                    'activity_type': activity_data['activity_type'],
                    'description': activity_data['description'],
                    'difficulty': activity_data['difficulty'],
                    'frequency': activity_data['frequency'],
                    'duration_minutes': activity_data['duration_minutes'],
                    'target_audience': activity_data['target_audience'],
                    'instructions': f"Step-by-step instructions for {activity_data['activity_name']}",
                    'expected_outcomes': f"Expected improvements from {activity_data['activity_name']}",
                    'success_criteria': 'Improved performance and engagement',
                    'is_active': True
                }
            )
            
            if created:
                print(f"Created assignment: {assignment.activity_name}")
            else:
                # Update existing assignment with new fields
                assignment.difficulty = activity_data['difficulty']
                assignment.save()
                print(f"Updated assignment: {assignment.activity_name}")
                
            created_assignments.append(assignment)
        
        # Create sample progress records for the last 2 weeks
        performers = ['teacher', 'parent']
        statuses = ['completed', 'in_progress', 'completed', 'completed', 'missed']
        
        for assignment in created_assignments:
            # Create 5-10 progress records per assignment
            num_records = random.randint(5, 10)
            
            for i in range(num_records):
                session_date = date.today() - timedelta(days=random.randint(1, 14))
                performer = random.choice(performers)
                status = random.choice(statuses)
                
                # Generate realistic scores and data based on status
                if status == 'completed':
                    score = random.randint(7, 10)
                    completion_percentage = random.randint(85, 100)
                    duration_actual = assignment.duration_minutes + random.randint(-5, 10)
                    notes = "Session completed successfully with good engagement"
                    improvements = "Student showed improvement in focus and technique"
                elif status == 'in_progress':
                    score = random.randint(5, 8)
                    completion_percentage = random.randint(40, 80)
                    duration_actual = assignment.duration_minutes + random.randint(-10, 5)
                    notes = "Session partially completed, student needed breaks"
                    improvements = "Some progress noted, needs more practice"
                else:  # missed
                    score = None
                    completion_percentage = 0
                    duration_actual = 0
                    notes = "Session was missed due to scheduling conflict"
                    improvements = "No progress to report"
                
                progress, created = ActivityProgress.objects.get_or_create(
                    activity_assignment=assignment,
                    session_date=session_date,
                    performer=performer,
                    defaults={
                        'recorder': doctor,
                        'status': status,
                        'completion_percentage': completion_percentage,
                        'score': score,
                        'duration_actual': duration_actual,
                        'notes': notes,
                        'challenges': 'Student had some difficulty with concentration' if status != 'completed' else '',
                        'improvements': improvements,
                        'student_engagement': random.randint(6, 10),
                        'difficulty_level': random.randint(4, 8)
                    }
                )
                
                if created:
                    print(f"Created progress record: {assignment.activity_name} on {session_date} by {performer} - Score: {score}")
        
        print("\nSample data creation completed!")
        
        # Print summary
        total_assignments = ActivityAssignment.objects.filter(student=student).count()
        total_progress = ActivityProgress.objects.filter(activity_assignment__student=student).count()
        
        print(f"\nSummary for Student {student.student_id}:")
        print(f"Total Activity Assignments: {total_assignments}")
        print(f"Total Progress Records: {total_progress}")
        
    except Student.DoesNotExist:
        print("Student with ID 14 not found")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_sample_data()
