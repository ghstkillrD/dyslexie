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