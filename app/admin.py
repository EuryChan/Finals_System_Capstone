from django.contrib import admin
from django.utils import timezone  
from .models import Employee, UserProfile, EligibilityRequest

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['name', 'id_no', 'task', 'created_at', 'updated_at']
    list_filter = ['task', 'created_at']
    search_fields = ['name', 'id_no']
    list_editable = ['task']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Employee Information', {
            'fields': ('name', 'id_no', 'task')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role']
    search_fields = ['user__username', 'user__email']

@admin.register(EligibilityRequest)
class EligibilityRequestAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 
        'certifier', 
        'status', 
        'date_submitted', 
        'date_processed'
    ]
    
    list_filter = [
        'status', 
        'certifier', 
        'date_submitted', 
        'date_processed'
    ]
    
    search_fields = [
        'first_name', 
        'last_name', 
        'certifier'
    ]
    
    readonly_fields = [
        'date_submitted', 
        'full_name'
    ]
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'middle_initial')
        }),
        ('Request Details', {
            'fields': ('certifier', 'status', 'notes', 'processed_by')
        }),
        ('Documents', {
            'fields': ('id_front', 'id_back', 'signature')
        }),
        ('Timestamps', {
            'fields': ('date_submitted', 'date_processed'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_approved', 'mark_as_rejected', 'mark_as_processing']
    
    def mark_as_approved(self, request, queryset):
        queryset.update(status='approved', date_processed=timezone.now())
        self.message_user(request, f"{queryset.count()} requests marked as approved.")
    mark_as_approved.short_description = "Mark selected requests as approved"
    
    def mark_as_rejected(self, request, queryset):
        queryset.update(status='rejected', date_processed=timezone.now())
        self.message_user(request, f"{queryset.count()} requests marked as rejected.")
    mark_as_rejected.short_description = "Mark selected requests as rejected"
    
    def mark_as_processing(self, request, queryset):
        queryset.update(status='processing')
        self.message_user(request, f"{queryset.count()} requests marked as processing.")
    mark_as_processing.short_description = "Mark selected requests as processing"


# app/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, Barangay

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ('role', 'barangay')
    fk_name = 'user'

    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "barangay":
            kwargs["queryset"] = Barangay.objects.all().order_by('name')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'get_barangay', 'is_active')
    list_filter = ('is_active', 'is_staff', 'userprofile__role', 'userprofile__barangay')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'userprofile__barangay__name')
    
    def get_role(self, obj):
        return obj.userprofile.role if hasattr(obj, 'userprofile') else '-'
    get_role.short_description = 'Role'
    get_role.admin_order_field = 'userprofile__role'
    
    def get_barangay(self, obj):
        if hasattr(obj, 'userprofile') and obj.userprofile.barangay:
            return obj.userprofile.barangay.name
        return '-'
    get_barangay.short_description = 'Barangay'
    get_barangay.admin_order_field = 'userprofile__barangay__name'

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


from django.contrib import admin
from .models import (
    Requirement, 
    RequirementSubmission, 
    RequirementAttachment,
    Barangay,
    UserProfile,
    # ... your other models
)

# Register Requirement model
@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ('title', 'period', 'is_active', 'created_at')
    list_filter = ('period', 'is_active')
    search_fields = ('title', 'description')
    filter_horizontal = ('applicable_barangays',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'period', 'is_active')
        }),
        ('Barangay Assignment', {
            'fields': ('applicable_barangays',),
            'description': 'Leave empty to apply to all barangays'
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# Also register related models
@admin.register(RequirementSubmission)
class RequirementSubmissionAdmin(admin.ModelAdmin):
    list_display = ('requirement', 'barangay', 'status', 'due_date', 'submitted_at')
    list_filter = ('status', 'barangay', 'requirement__period')
    search_fields = ('requirement__title', 'barangay__name')
    date_hierarchy = 'due_date'


@admin.register(RequirementAttachment)
class RequirementAttachmentAdmin(admin.ModelAdmin):
    list_display = ('submission', 'file_name', 'file_size_kb', 'uploaded_at')
    list_filter = ('uploaded_at',)
    
    def file_name(self, obj):
        return obj.file.name.split('/')[-1]
    file_name.short_description = 'File Name'


@admin.register(Barangay)
class BarangayAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'municipality', 'created_at')
    search_fields = ('name', 'code')