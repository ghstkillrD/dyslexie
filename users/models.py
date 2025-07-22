from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

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

    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    def __str__(self):
        return f"{self.role} - {self.user.username} for {self.student.name}"