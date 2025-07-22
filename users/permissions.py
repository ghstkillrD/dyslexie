from rest_framework import permissions
from .models import StudentUserLink

class IsTeacherOrReadOnly(permissions.BasePermission):
    """
    Custom permission:
    - Teachers can do anything (create/update/delete/view)
    - Others (Doctors/Parents) can only view students assigned to them
    """

    def has_permission(self, request, view):
        # Teachers: Full access
        if request.user.role == 'teacher':
            return True

        # Others: Only GET (view)
        return request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        # Teachers: Full access to their own students
        if request.user.role == 'teacher' and obj.teacher == request.user:
            return True

        # Others: Only view assigned students
        if request.method in permissions.SAFE_METHODS:
            return obj.student_links.filter(user=request.user).exists()

        return False

class IsLinkedDoctorOrParentReadOnly(permissions.BasePermission):
    """
    Allow doctors and parents to only view students assigned to them.
    Prevent them from editing/deleting.
    """

    def has_permission(self, request, view):
        # Allow safe methods for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated and request.user.role in ['doctor', 'parent']
        return False  # Block non-safe methods for doctor/parent

    def has_object_permission(self, request, view, obj):
        # Check if user is linked to the student
        if request.method in permissions.SAFE_METHODS:
            return StudentUserLink.objects.filter(user=request.user, student=obj).exists()
        return False
