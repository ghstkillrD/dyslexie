from django.contrib import admin
from .models import User, Student, StudentUserLink

admin.site.register(User)
admin.site.register(Student)
admin.site.register(StudentUserLink)

