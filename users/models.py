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


class FinalEvaluation(models.Model):
    DIAGNOSIS_CHOICES = (
        ('no_dyslexia', 'No Dyslexia Indicated'),
        ('mild_dyslexia', 'Mild Dyslexia'),
        ('moderate_dyslexia', 'Moderate Dyslexia'),
        ('severe_dyslexia', 'Severe Dyslexia'),
        ('requires_further_assessment', 'Requires Further Assessment'),
    )

    INTERVENTION_PRIORITY_CHOICES = (
        ('low', 'Low Priority'),
        ('medium', 'Medium Priority'),
        ('high', 'High Priority'),
        ('urgent', 'Urgent'),
    )

    THERAPY_DECISION_CHOICES = (
        ('terminate', 'Terminate Therapy (Student Cured)'),
        ('continue', 'Continue Therapy (Re-assign Activities)'),
        ('pending', 'Decision Pending'),
    )

    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='final_evaluation')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='final_evaluations')
    
    # Therapy session information
    therapy_session_number = models.PositiveIntegerField(default=1, help_text="Current therapy session number")
    therapy_decision = models.CharField(max_length=10, choices=THERAPY_DECISION_CHOICES, default='pending')
    therapy_termination_reason = models.TextField(blank=True, help_text="Reason for terminating therapy if applicable")
    
    # Comprehensive analysis summary
    handwriting_analysis_summary = models.TextField(help_text="Summary of handwriting analysis results")
    task_performance_summary = models.TextField(help_text="Summary of task performance and scores")
    activity_progress_summary = models.TextField(help_text="Summary of therapeutic activity progress")
    
    # Final diagnosis
    final_diagnosis = models.CharField(max_length=30, choices=DIAGNOSIS_CHOICES)
    diagnosis_confidence = models.IntegerField(default=1, help_text="Confidence level (1-10)")
    supporting_evidence = models.TextField(help_text="Key evidence supporting the diagnosis")
    
    # Intervention recommendations
    intervention_priority = models.CharField(max_length=10, choices=INTERVENTION_PRIORITY_CHOICES)
    short_term_goals = models.TextField(help_text="Goals for the next 3-6 months")
    long_term_goals = models.TextField(help_text="Goals for the next 1-2 years")
    recommended_interventions = models.TextField(help_text="Specific intervention strategies")
    
    # Follow-up and monitoring
    follow_up_timeline = models.CharField(max_length=255, help_text="Recommended follow-up schedule")
    monitoring_indicators = models.TextField(help_text="Key indicators to monitor progress")
    
    # Professional notes
    clinical_notes = models.TextField(blank=True, help_text="Additional clinical observations")
    referrals_needed = models.TextField(blank=True, help_text="Referrals to other specialists if needed")
    
    # Case completion
    case_completed = models.BooleanField(default=False)
    completion_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Final Evaluation for {self.student.name} - Session {self.therapy_session_number} - {self.final_diagnosis}"

    def mark_case_complete(self):
        from django.utils import timezone
        self.case_completed = True
        self.completion_date = timezone.now()
        self.save()

    def terminate_therapy(self, reason):
        """Mark therapy as terminated (student cured)"""
        self.therapy_decision = 'terminate'
        self.therapy_termination_reason = reason
        self.mark_case_complete()

    def restart_therapy_from_stage5(self):
        """Restart therapy by resetting to Stage 5"""
        from django.utils import timezone
        self.therapy_decision = 'continue'
        self.case_completed = False
        self.completion_date = None
        self.save()
        
        # Update student's stage progress to restart from Stage 5
        stage_progress = self.student.stage_progress
        stage_progress.current_stage = 5
        stage_progress.completed_stages = [1, 2, 3, 4]  # Keep stages 1-4 completed
        stage_progress.save()
        
        return stage_progress

    class Meta:
        ordering = ['-created_at']


class TherapySessionReport(models.Model):
    """
    Historical record of each therapy session for a student.
    This preserves all therapy data even when sessions are restarted.
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='therapy_reports')
    session_number = models.PositiveIntegerField()
    
    # Stage 5 data snapshot
    activity_assignments_data = models.JSONField(help_text="Snapshot of assigned activities")
    
    # Stage 6 data snapshot  
    activity_progress_data = models.JSONField(help_text="Snapshot of activity progress records")
    
    # Stage 7 data snapshot
    final_evaluation_data = models.JSONField(help_text="Snapshot of final evaluation")
    
    # Session metadata
    session_start_date = models.DateTimeField(help_text="When this therapy session started")
    session_end_date = models.DateTimeField(help_text="When this therapy session ended")
    session_outcome = models.CharField(max_length=20, choices=[
        ('terminated', 'Therapy Terminated (Cured)'),
        ('continued', 'Therapy Continued (Restarted)'),
        ('ongoing', 'Session Ongoing')
    ], default='ongoing')
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Therapy Session {self.session_number} - {self.student.name}"
    
    @classmethod
    def create_report_from_current_data(cls, student):
        """Create a therapy session report from current student data"""
        from django.utils import timezone
        import json
        
        # Get current session number
        last_report = cls.objects.filter(student=student).order_by('-session_number').first()
        session_number = (last_report.session_number + 1) if last_report else 1
        
        # Collect Stage 5 data (Activity Assignments)
        activity_assignments = []
        for assignment in student.activity_assignments.all():
            activity_assignments.append({
                'activity_name': assignment.activity_name,
                'activity_type': assignment.activity_type,
                'description': assignment.description,
                'frequency': assignment.frequency,
                'duration_minutes': assignment.duration_minutes,
                'target_audience': assignment.target_audience,
                'instructions': assignment.instructions,
                'expected_outcomes': assignment.expected_outcomes,
                'success_criteria': assignment.success_criteria,
                'created_at': assignment.created_at.isoformat(),
                'is_active': assignment.is_active,
            })
        
        # Collect Stage 6 data (Activity Progress)
        activity_progress = []
        for progress in ActivityProgress.objects.filter(activity_assignment__student=student):
            activity_progress.append({
                'activity_name': progress.activity_assignment.activity_name,
                'session_date': progress.session_date.isoformat(),
                'performer': progress.performer,
                'status': progress.status,
                'completion_percentage': progress.completion_percentage,
                'duration_actual': progress.duration_actual,
                'notes': progress.notes,
                'challenges': progress.challenges,
                'improvements': progress.improvements,
                'student_engagement': progress.student_engagement,
                'difficulty_level': progress.difficulty_level,
                'created_at': progress.created_at.isoformat(),
            })
        
        # Collect Stage 7 data (Final Evaluation)
        final_evaluation_data = {}
        if hasattr(student, 'final_evaluation'):
            evaluation = student.final_evaluation
            final_evaluation_data = {
                'therapy_session_number': evaluation.therapy_session_number,
                'therapy_decision': evaluation.therapy_decision,
                'therapy_termination_reason': evaluation.therapy_termination_reason,
                'handwriting_analysis_summary': evaluation.handwriting_analysis_summary,
                'task_performance_summary': evaluation.task_performance_summary,
                'activity_progress_summary': evaluation.activity_progress_summary,
                'final_diagnosis': evaluation.final_diagnosis,
                'diagnosis_confidence': evaluation.diagnosis_confidence,
                'supporting_evidence': evaluation.supporting_evidence,
                'intervention_priority': evaluation.intervention_priority,
                'short_term_goals': evaluation.short_term_goals,
                'long_term_goals': evaluation.long_term_goals,
                'recommended_interventions': evaluation.recommended_interventions,
                'follow_up_timeline': evaluation.follow_up_timeline,
                'monitoring_indicators': evaluation.monitoring_indicators,
                'clinical_notes': evaluation.clinical_notes,
                'referrals_needed': evaluation.referrals_needed,
                'case_completed': evaluation.case_completed,
                'completion_date': evaluation.completion_date.isoformat() if evaluation.completion_date else None,
                'created_at': evaluation.created_at.isoformat(),
            }
        
        # Determine session dates
        session_start_date = timezone.now()
        session_end_date = timezone.now()
        
        # Try to get actual session dates from activity assignments
        if student.activity_assignments.exists():
            first_assignment = student.activity_assignments.order_by('created_at').first()
            session_start_date = first_assignment.created_at
        
        return cls.objects.create(
            student=student,
            session_number=session_number,
            activity_assignments_data=activity_assignments,
            activity_progress_data=activity_progress,
            final_evaluation_data=final_evaluation_data,
            session_start_date=session_start_date,
            session_end_date=session_end_date,
            session_outcome='ongoing'
        )
    
    class Meta:
        ordering = ['-session_number']
        unique_together = ['student', 'session_number']


class StakeholderRecommendation(models.Model):
    """
    Recommendations provided by teachers and parents for Stage 7 final evaluation
    """
    STAKEHOLDER_TYPES = (
        ('teacher', 'Teacher'),
        ('parent', 'Parent'),
    )
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='stakeholder_recommendations')
    stakeholder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stakeholder_type = models.CharField(max_length=10, choices=STAKEHOLDER_TYPES)
    
    # Recommendation content
    observations = models.TextField(help_text="Observations about the student's progress")
    recommendations = models.TextField(help_text="Specific recommendations for continued support")
    concerns = models.TextField(blank=True, help_text="Any concerns or areas needing attention")
    positive_changes = models.TextField(blank=True, help_text="Positive changes observed")
    support_needed = models.TextField(blank=True, help_text="Additional support needed")
    
    # Metadata
    therapy_session_number = models.PositiveIntegerField(default=1, help_text="Related therapy session")
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.stakeholder_type.title()} recommendation for {self.student.name} - Session {self.therapy_session_number}"
    
    class Meta:
        ordering = ['-therapy_session_number', 'stakeholder_type']
        unique_together = ['student', 'stakeholder', 'therapy_session_number']
