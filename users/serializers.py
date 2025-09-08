from rest_framework import serializers
from .models import User, Student, StudentUserLink, StageProgress, HandwritingSample, StudentTask, AssessmentSummary, ActivityAssignment, ActivityProgress, FinalEvaluation, StakeholderRecommendation
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
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = HandwritingSample
        fields = '__all__'
        read_only_fields = ['uploaded_at']
    
    def get_image(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove username field and add email field
        self.fields['email'] = serializers.EmailField()
        del self.fields['username']

    def validate(self, attrs):
        # Get email and password from the request
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Find user by email
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(email=email)
            attrs['username'] = user.username  # Set username for parent validation
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password')
        
        # Call parent validation with username
        return super().validate(attrs)

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
            'description', 'instructions', 'difficulty', 'frequency', 'duration_minutes',
            'target_audience', 'expected_outcomes', 'success_criteria',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'student', 'doctor', 'created_at', 'updated_at']


class ActivityProgressSerializer(serializers.ModelSerializer):
    activity_assignment = ActivityAssignmentSerializer(read_only=True)
    
    class Meta:
        model = ActivityProgress
        fields = [
            'id', 'activity_assignment', 'recorder', 'session_date', 'status',
            'performer', 'duration_actual', 'completion_percentage', 'score', 'notes',
            'challenges', 'improvements', 'student_engagement', 'difficulty_level',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'recorder', 'created_at', 'updated_at']


class ActivityProgressCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityProgress
        fields = [
            'activity_assignment', 'session_date', 'status', 'performer',
            'duration_actual', 'completion_percentage', 'score', 'notes', 'challenges',
            'improvements', 'student_engagement', 'difficulty_level'
        ]


class FinalEvaluationSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    
    class Meta:
        model = FinalEvaluation
        fields = [
            'id', 'student', 'doctor', 'doctor_name', 'student_name',
            'therapy_session_number', 'therapy_decision', 'therapy_termination_reason',
            'handwriting_analysis_summary', 'task_performance_summary', 
            'activity_progress_summary', 'final_diagnosis', 'diagnosis_confidence',
            'supporting_evidence', 'intervention_priority', 'short_term_goals',
            'long_term_goals', 'recommended_interventions', 'follow_up_timeline',
            'monitoring_indicators', 'clinical_notes', 'referrals_needed', 
            'case_completed', 'completion_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'doctor', 'completion_date', 'created_at', 'updated_at']


class FinalEvaluationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalEvaluation
        fields = [
            'therapy_session_number', 'therapy_decision', 'therapy_termination_reason',
            'handwriting_analysis_summary', 'task_performance_summary', 
            'activity_progress_summary', 'final_diagnosis', 'diagnosis_confidence',
            'supporting_evidence', 'intervention_priority', 'short_term_goals',
            'long_term_goals', 'recommended_interventions', 'follow_up_timeline',
            'monitoring_indicators', 'clinical_notes', 'referrals_needed'
        ]


class StakeholderRecommendationSerializer(serializers.ModelSerializer):
    stakeholder_name = serializers.CharField(source='stakeholder.username', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    
    class Meta:
        model = StakeholderRecommendation
        fields = [
            'id', 'student', 'stakeholder', 'stakeholder_type', 'stakeholder_name', 'student_name',
            'observations', 'recommendations', 'concerns', 'positive_changes', 'support_needed',
            'therapy_session_number', 'submitted_at', 'updated_at'
        ]
        read_only_fields = ['id', 'stakeholder', 'stakeholder_type', 'submitted_at', 'updated_at']


class StakeholderRecommendationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StakeholderRecommendation
        fields = [
            'observations', 'recommendations', 'concerns', 'positive_changes', 'support_needed'
        ]

