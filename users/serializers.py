from rest_framework import serializers
from .models import User, Student, StudentUserLink, StageProgress, HandwritingSample, StudentTask, AssessmentSummary, ActivityAssignment
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    class Meta:
        model = User
        fields = ['username', 'email', 'phone', 'password', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            phone=validated_data.get('phone', ''),
            role=validated_data['role'],
            password=validated_data['password']
        )
        return user

class StageProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StageProgress
        fields = ['current_stage', 'completed_stages']

class StudentSerializer(serializers.ModelSerializer):
    # List of emails to assign
    doctor_emails = serializers.ListField(
        child=serializers.EmailField(), write_only=True, required=False
    )
    parent_emails = serializers.ListField(
        child=serializers.EmailField(), write_only=True, required=False
    )
    stage_progress = StageProgressSerializer(read_only=True)

    class Meta:
        model = Student
        fields = [
            'student_id', 'name', 'birthday', 'school', 'grade', 'gender',
            'doctor_emails', 'parent_emails', 'stage_progress'
        ]
    
    def create(self, validated_data):
        doctor_emails = validated_data.pop('doctor_emails', [])
        parent_emails = validated_data.pop('parent_emails', [])
        teacher = self.context['request'].user

        # Prevent duplicate 'teacher' kwarg
        validated_data.pop('teacher', None)

        # Create student
        student = Student.objects.create(teacher=teacher, **validated_data)

        # Link teacher
        StudentUserLink.objects.create(student=student, user=teacher)

        # Link doctors
        doctor_users = User.objects.filter(email__in=doctor_emails, role='doctor')
        for doctor in doctor_users:
            StudentUserLink.objects.create(student=student, user=doctor, role='doctor')

        # Link parents
        parent_users = User.objects.filter(email__in=parent_emails, role='parent')
        for parent in parent_users:
            StudentUserLink.objects.create(student=student, user=parent, role='parent')

        return student

    def update(self, instance, validated_data):
        doctor_emails = validated_data.pop('doctor_emails', [])
        parent_emails = validated_data.pop('parent_emails', [])

        # Update basic student fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Unlink existing non-teacher users
        StudentUserLink.objects.filter(student=instance).exclude(user=instance.teacher).delete()

        # Re-link doctors
        doctor_users = User.objects.filter(email__in=doctor_emails, role='doctor')
        for doctor in doctor_users:
            StudentUserLink.objects.create(student=instance, user=doctor, role='doctor')

        # Re-link parents
        parent_users = User.objects.filter(email__in=parent_emails, role='parent')
        for parent in parent_users:
            StudentUserLink.objects.create(student=instance, user=parent, role='parent')

        return instance

class StudentUserLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentUserLink
        fields = ['id', 'student', 'user', 'role']

class LinkedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class HandwritingSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandwritingSample
        fields = '__all__'
        read_only_fields = ['uploaded_at']

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        return token

class StudentTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentTask
        fields = ['id', 'student', 'task_name', 'max_score', 'score_obtained']
        read_only_fields = ['id', 'student', 'score_obtained']

class AssessmentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentSummary
        fields = [
            'id', 'student', 'doctor', 'cutoff_percentage', 'total_score', 
            'total_max_score', 'percentage_score', 'risk_level', 
            'dyslexia_indication', 'summary_notes', 'recommendations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'doctor', 'created_at', 'updated_at']

class ActivityAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityAssignment
        fields = [
            'id', 'student', 'doctor', 'activity_name', 'activity_type', 
            'description', 'instructions', 'frequency', 'duration_minutes',
            'target_audience', 'expected_outcomes', 'success_criteria',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'doctor', 'created_at', 'updated_at']

