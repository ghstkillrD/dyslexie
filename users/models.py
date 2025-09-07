from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField

class User(AbstractUser):
    ROLE_CHOICES = (
        ('doctor', 'Doctor'),
        ('teacher', 'Teacher'),
        ('parent', 'Parent'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=15, blank=True)

class Student(models.Model):
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    )

    student_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    birthday = models.DateField()
    school = models.CharField(max_length=100)
    grade = models.CharField(max_length=20)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)

    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='students')

    def __str__(self):
        return self.name

class StudentUserLink(models.Model):
    ROLE_CHOICES = (
        ('doctor', 'Doctor'),
        ('parent', 'Parent'),
    )

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="student_links")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.role} - {self.user.username} for {self.student.name}"

class HandwritingSample(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='handwriting_samples')
    image = models.ImageField(upload_to='handwriting_samples/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Prediction results from FastAPI
    dyslexia_score = models.FloatField(null=True, blank=True)
    interpretation = models.CharField(max_length=50, null=True, blank=True)
    letter_counts = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Sample for {self.student.name} on {self.uploaded_at.date()}"

class StageProgress(models.Model):
    student = models.OneToOneField('Student', on_delete=models.CASCADE, related_name='stage_progress')
    current_stage = models.IntegerField(default=1)
    completed_stages = ArrayField(models.IntegerField(), default=list, blank=True)

    def mark_stage_complete(self, stage):
        if stage not in self.completed_stages:
            self.completed_stages.append(stage)
        self.current_stage = stage + 1
        self.save()

    def __str__(self):
        return f"{self.student.name} - Stage {self.current_stage}"

class StudentTask(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="tasks")
    task_name = models.CharField(max_length=255)
    max_score = models.IntegerField()
    score_obtained = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task_name} ({self.student.name})"

class AssessmentSummary(models.Model):
    RISK_LEVEL_CHOICES = (
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
    )

    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='assessment_summary')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assessments')
    
    # Cutoff settings
    cutoff_percentage = models.FloatField(help_text="Percentage cutoff for dyslexia indication")
    
    # Assessment results
    total_score = models.FloatField()
    total_max_score = models.FloatField()
    percentage_score = models.FloatField()
    
    # Analysis
    risk_level = models.CharField(max_length=10, choices=RISK_LEVEL_CHOICES)
    dyslexia_indication = models.BooleanField(default=False)
    
    # Summary and recommendations
    summary_notes = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Assessment for {self.student.name} - {self.risk_level} risk"

class ActivityAssignment(models.Model):
    ACTIVITY_TYPE_CHOICES = (
        ('reading', 'Reading Exercise'),
        ('writing', 'Writing Practice'),
        ('phonics', 'Phonics Training'),
        ('memory', 'Memory Enhancement'),
        ('coordination', 'Hand-Eye Coordination'),
        ('visual', 'Visual Processing'),
        ('auditory', 'Auditory Processing'),
        ('cognitive', 'Cognitive Training'),
    )

    FREQUENCY_CHOICES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('bi-weekly', 'Twice a Week'),
        ('monthly', 'Monthly'),
    )

    TARGET_AUDIENCE_CHOICES = (
        ('teacher', 'Teacher Implementation'),
        ('parent', 'Parent Implementation'),
        ('both', 'Both Teacher and Parent'),
    )

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='activity_assignments')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assigned_activities')
    
    # Activity details
    activity_name = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPE_CHOICES)
    description = models.TextField(help_text="Detailed description of the activity")
    instructions = models.TextField(help_text="Step-by-step instructions for implementation")
    
    # Scheduling and targets
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    duration_minutes = models.IntegerField(help_text="Duration of each session in minutes")
    target_audience = models.CharField(max_length=10, choices=TARGET_AUDIENCE_CHOICES)
    
    # Goals and expectations
    expected_outcomes = models.TextField(help_text="Expected outcomes and improvements")
    success_criteria = models.TextField(help_text="How to measure success", blank=True)
    
    # Tracking
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.activity_name} for {self.student.name}"

    class Meta:
        ordering = ['-created_at']


class ActivityProgress(models.Model):
    STATUS_CHOICES = (
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('missed', 'Missed Session'),
        ('paused', 'Paused'),
    )

    PERFORMER_CHOICES = (
        ('teacher', 'Teacher'),
        ('parent', 'Parent'),
    )

    activity_assignment = models.ForeignKey(ActivityAssignment, on_delete=models.CASCADE, related_name='progress_records')
    recorder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recorded_progress')
    
    # Session details
    session_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    performer = models.CharField(max_length=10, choices=PERFORMER_CHOICES)
    duration_actual = models.IntegerField(help_text="Actual duration in minutes", null=True, blank=True)
    
    # Progress tracking
    completion_percentage = models.IntegerField(default=0, help_text="Completion percentage (0-100)")
    notes = models.TextField(blank=True, help_text="Session notes and observations")
    challenges = models.TextField(blank=True, help_text="Any challenges encountered")
    improvements = models.TextField(blank=True, help_text="Observed improvements")
    
    # Quality assessment
    student_engagement = models.IntegerField(default=5, help_text="Student engagement level (1-10)")
    difficulty_level = models.IntegerField(default=5, help_text="Perceived difficulty for student (1-10)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.activity_assignment.activity_name} - {self.session_date} ({self.status})"

    class Meta:
        ordering = ['-session_date']
        unique_together = ['activity_assignment', 'session_date', 'performer']
