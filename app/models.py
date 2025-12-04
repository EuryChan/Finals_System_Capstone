from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models.signals import post_save
import json
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_delete, post_delete
import threading, traceback
from django.core.mail import send_mail
from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
import os


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance, role='')


class AuditLog(models.Model):
    """Track all database changes"""
    ACTION_CHOICES = [
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Generic foreign key to track any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Store the changes as JSON
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    
    # Additional context
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.user} {self.action} {self.content_object} at {self.timestamp}"


class Employee(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
        ('terminated', 'Terminated'),
    ]
    
    DEPARTMENT_CHOICES = [
        ('admin', 'Administration'),
        ('hr', 'Human Resources'),
        ('finance', 'Finance'),
        ('operations', 'Operations'),
        ('it', 'Information Technology'),
    ]
    
    name = models.CharField(max_length=100)
    id_no = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    
    # Enhanced fields
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    task = models.CharField(max_length=100, blank=True, null=True, default='Unassigned')
    archived = models.BooleanField(default=False)  # Add this field
    
    # Dates
    hire_date = models.DateField(null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Supervisor relationship
    supervisor = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, 
        related_name='subordinates'
    )
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['id_no']),
            models.Index(fields=['department', 'status']),
            models.Index(fields=['supervisor']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.id_no}"
    
    def clean(self):
        """Custom validation"""
        super().clean()
        
        # Validate ID format (example: must start with EMP)
        if self.id_no and not self.id_no.startswith('EMP'):
            raise ValidationError({'id_no': 'Employee ID must start with "EMP"'})
        
        # Validate email domain if provided
        if self.email and not (self.email.endswith('.gov') or self.email.endswith('.ph')):
            raise ValidationError({'email': 'Email must be a government domain (.gov or .ph)'})
    
    @property
    def years_of_service(self):
        """Calculate years of service"""
        if self.hire_date:
            from datetime import date
            today = date.today()
            return today.year - self.hire_date.year - ((today.month, today.day) < (self.hire_date.month, self.hire_date.day))
        return 0
    
    @property
    def subordinate_count(self):
        """Count direct subordinates"""
        return self.subordinates.count()
    
    def get_all_subordinates(self):
        """Get all subordinates recursively"""
        subordinates = []
        for subordinate in self.subordinates.all():
            subordinates.append(subordinate)
            subordinates.extend(subordinate.get_all_subordinates())
        return subordinates
    
    @classmethod
    def get_by_department(cls, department):
        """Get employees by department"""
        return cls.objects.filter(department=department, status='active')
    
    @classmethod
    def get_statistics(cls):
        """Get employee statistics"""
        from django.db.models import Count
        return {
            'total': cls.objects.count(),
            'active': cls.objects.filter(status='active').count(),
            'by_department': cls.objects.values('department').annotate(count=Count('id')),
            'by_status': cls.objects.values('status').annotate(count=Count('id')),
        }


# Signal handlers for audit logging
@receiver(post_save, sender=Employee)
def employee_post_save(sender, instance, created, **kwargs):
    """Log employee creation/updates"""
    action = 'CREATE' if created else 'UPDATE'
    
    # Get old values if updating
    old_values = None
    if not created and hasattr(instance, '_old_values'):
        old_values = instance._old_values
    
    # Get new values
    new_values = {
        'name': instance.name,
        'id_no': instance.id_no,
        'department': instance.department,
        'position': instance.position,
        'status': instance.status,
        'task': instance.task,
    }
    
    AuditLog.objects.create(
        action=action,
        content_object=instance,
        old_values=old_values,
        new_values=new_values,
        description=f"Employee {instance.name} was {'created' if created else 'updated'}"
    )


@receiver(pre_delete, sender=Employee)
def employee_pre_delete(sender, instance, **kwargs):
    """Store values before deletion"""
    instance._pre_delete_values = {
        'name': instance.name,
        'id_no': instance.id_no,
        'department': instance.department,
        'position': instance.position,
        'status': instance.status,
        'task': instance.task,
    }


@receiver(post_delete, sender=Employee)
def employee_post_delete(sender, instance, **kwargs):
    """Log employee deletion"""
    AuditLog.objects.create(
        action='DELETE',
        old_values=getattr(instance, '_pre_delete_values', {}),
        description=f"Employee {instance.name} was deleted"
    )


def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# app/models.py

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('dilg staff', 'DILG Staff'),  # This is the admin role
        ('municipal officer', 'Municipal Officer'),
        ('barangay official', 'Barangay Official'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    
    # Link user to their barangay
    barangay = models.ForeignKey(
        'Barangay', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='officials',
        help_text='Assigned barangay (for Barangay Officials only)'
    )

    # Extra profile fields
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    is_profile_complete = models.BooleanField(default=False)

    # Approval fields
    is_approved = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_profiles')

    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    deadline_reminders = models.BooleanField(default=True)
    announcements = models.BooleanField(default=True)
    
    # Display preferences
    compact_view = models.BooleanField(default=False)

    def __str__(self):
        barangay_name = f" - {self.barangay.name}" if self.barangay else ""
        return f"{self.user.username} - {self.role.title()}{barangay_name}"

    def update_login_info(self, ip_address):
        """Update login info after each login"""
        self.last_login_ip = ip_address
        self.login_count += 1
        self.save()

    def has_permission(self, permission):
        """Check if user has specific permission based on role"""
        permissions = {
            'dilg staff': [
                # DILG Staff has ALL permissions (they are the admin)
                'view_dashboard',
                'manage_users', 
                'approve_requests', 
                'reject_requests',
                'view_all_requests',
                'view_reports', 
                'manage_settings',
                'manage_requirements',
                'view_all_barangays',
                'manage_announcements',
                'delete_requests',
                'archive_requests',
                'manage_roles',
                'view_audit_logs',
            ],
            'municipal officer': [
                # Municipal officers can view and monitor, but not manage system
                'view_dashboard',
                'view_all_requests',
                'view_reports',
                'view_all_barangays',
                'view_requirements',
            ],
            'barangay official': [
                # Barangay officials can only submit and view their own data
                'submit_requirements',
                'view_own_barangay',
                'view_own_submissions',
                'upload_attachments',
            ],
        }
        
        user_permissions = permissions.get(self.role, [])
        return permission in user_permissions

    def can_access_barangay(self, barangay):
        """Check if user has permission to access this barangay's data"""
        normalized_role = self.role.strip().lower()
        
        # DILG staff (admin) can see EVERYTHING
        if normalized_role == 'dilg staff':
            return True
        
        # Municipal officers can see all barangays (read-only monitoring)
        if normalized_role == 'municipal officer':
            return True
        
        # Barangay officials only see their assigned barangay
        if normalized_role == 'barangay official':
            return self.barangay == barangay if self.barangay else False
        
        return False

    def can_approve_requests(self):
        """Check if user can approve eligibility requests"""
        return self.has_permission('approve_requests')

    def can_manage_users(self):
        """Check if user can manage other users"""
        return self.has_permission('manage_users')

    def can_view_all_barangays(self):
        """Check if user can view all barangays"""
        return self.has_permission('view_all_barangays')
    
    def is_admin(self):
        """Check if user is admin (DILG Staff)"""
        return self.role.strip().lower() == 'dilg staff'

    def get_redirect_url(self):
        """Determine where to redirect user after login based on role"""
        normalized_role = self.role.strip().lower()
        
        # DILG staff (admin) goes to main landing menu with full access
        if normalized_role == 'dilg staff':
            redirect_url = 'landing_menu'
        
        # Municipal officer goes to requirements monitoring (read-only view)
        elif normalized_role == 'municipal officer':
            redirect_url = 'requirements_monitoring'
        
        # Barangay official
        elif normalized_role == 'barangay official':
            if self.barangay:
                # Has assigned barangay → Go to requirements submission page
                redirect_url = 'requirements_monitoring'
            else:
                # No assigned barangay → Go to public certification form
                redirect_url = 'civil_service_certification'
        
        # Default fallback
        else:
            redirect_url = 'civil_service_certification'
        
        return redirect_url

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

class EligibilityRequest(models.Model):
    CERTIFIER_CHOICES = [
        ('punong_barangay', 'Punong Barangay'),
        ('dilg_municipality', 'DILG - Municipality'),
        ('dilg_provincial', 'DILG - Provincial'),
        ('dilg_regional', 'DILG - Regional'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('processing', 'Processing'),
    ]
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_initial = models.CharField(max_length=5, blank=True, null=True)
    email = models.EmailField(max_length=254, blank=True, null=True)
    barangay = models.CharField(max_length=100)  # ADD THIS LINE
    archived = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejection")
    
    position_type = models.CharField(max_length=20, choices=[
        ('appointive', 'Appointive'),
        ('elective', 'Elective')
    ])

    rejection_reason = models.TextField(
        blank=True, 
        null=True, 
        help_text="Reason for rejection (shown to applicant)"
    )

    # ========================================
    # APPOINTIVE OFFICIAL FIELDS
    # ========================================
    appointing_authority = models.CharField(max_length=200, blank=True, null=True)
    appointment_from = models.DateField(blank=True, null=True)
    appointment_to = models.DateField(blank=True, null=True)
    years_in_service = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)

    # Appointing Punong Barangay Info
    appointing_punong_barangay = models.CharField(max_length=200, blank=True, null=True)
    pb_date_elected = models.DateField(blank=True, null=True)
    pb_years_service = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)

    # ========================================
    # ELECTIVE OFFICIAL FIELDS
    # ========================================
    position_held = models.CharField(max_length=200, blank=True, null=True)
    election_from = models.DateField(blank=True, null=True)
    election_to = models.DateField(blank=True, null=True)
    term_office = models.CharField(max_length=50, blank=True, null=True)
    completed_term = models.CharField(max_length=50, blank=True, null=True)
    incomplete_reason = models.TextField(blank=True, null=True)
    days_not_served = models.IntegerField(default=0)
    
    # This is the field Django is looking for
    certifier = models.CharField(max_length=50, choices=CERTIFIER_CHOICES)
    
    # File uploads
    id_front = models.ImageField(upload_to='eligibility/ids/', null=True, blank=True)
    id_back = models.ImageField(upload_to='eligibility/ids/', null=True, blank=True)
    # In your EligibilityRequest model (models.py)
    signature = models.FileField(upload_to='certification_files/signatures/%Y/%m/')
    
    # Status and dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    date_submitted = models.DateTimeField(default=timezone.now)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_requests'
    )
    date_processed = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date_submitted']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.status}"
    
    @property
    def full_name(self):
        if self.middle_initial:
            return f"{self.first_name} {self.middle_initial} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    



def send_certificate_notification_async(eligibility_request,status, rejection_reason=None,):
    """Send email notification in background thread"""
    
    def send_email_task():
        """
    Send email notification when application status changes
    Now includes rejection reason
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        print(f"📧 Processing notification for request #{eligibility_request.id}")
        print(f"   Status: {status}")
        print(f"   Applicant email: {eligibility_request.email}")
        
        applicant_email = eligibility_request.email
        
        if not applicant_email:
            print(f"   ⚠️ No email address found for request #{eligibility_request.id}")
            return
        
        # Email content based on status
        if status == 'approved':
            subject = "✅ Certificate Application - Approved"
            message = f"""Hello,

Great news! Your certificate application has been approved.

APPLICATION DETAILS
==========================================
Reference Number: EC-{eligibility_request.date_submitted.year}-{eligibility_request.id:05d}
Applicant: {eligibility_request.full_name}
Certifier: {eligibility_request.get_certifier_display()}
Date Submitted: {eligibility_request.date_submitted.strftime('%B %d, %Y at %I:%M %p')}
Current Status: APPROVED

You can now collect your certificate at the DILG office.

Thank you for using the DILG Certification System.

---
DILG Lucena - Certification System
This is an automated message. Please do not reply to this email.
"""
        
        elif status == 'rejected':
            subject = "❌ Certificate Application - Status Update"
            
            # ✅ Include rejection reason in the email
            message = f"""Hello,

Your certificate application has been reviewed. Unfortunately, it could not be approved at this time.

APPLICATION DETAILS
==========================================
Reference Number: EC-{eligibility_request.date_submitted.year}-{eligibility_request.id:05d}
Applicant: {eligibility_request.full_name}
Certifier: {eligibility_request.get_certifier_display()}
Date Submitted: {eligibility_request.date_submitted.strftime('%B %d, %Y at %I:%M %p')}
Current Status: REJECTED

"""
            # ✅ Add rejection reason if provided
            if rejection_reason:
                message += f"""REASON FOR REJECTION
==========================================
!!{rejection_reason}!!

"""
            
            message += """Please address the issue(s) mentioned above and resubmit your application, or contact DILG for more information.

Thank you for using the DILG Certification System.

---
DILG Lucena - Certification System
This is an automated message. Please do not reply to this email.
"""
        
        elif status == 'processing':
            subject = "⏳ Certificate Application - Processing"
            message = f"""Hello,

Your certificate application is now being processed.

APPLICATION DETAILS
==========================================
Reference Number: EC-{eligibility_request.date_submitted.year}-{eligibility_request.id:05d}
Applicant: {eligibility_request.full_name}
Certifier: {eligibility_request.get_certifier_display()}
Date Submitted: {eligibility_request.date_submitted.strftime('%B %d, %Y at %I:%M %p')}
Current Status: PROCESSING

We will notify you once the review is complete.

Thank you for using the DILG Certification System.

---
DILG Lucena - Certification System
This is an automated message. Please do not reply to this email.
"""
        
        else:
            print(f"   ⚠️ Unknown status: {status}")
            return
        
        # Send email
        print(f"   → Sending to applicant: {applicant_email}")
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[applicant_email],
            fail_silently=False,
        )
        
        print(f"✅ Email sent successfully to {applicant_email} for request #{eligibility_request.id}")
        print(f"   Subject: {subject}")
        
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise
    
    # Start background thread
    email_thread = threading.Thread(target=send_email_task)
    email_thread.daemon = True
    email_thread.start()


@receiver(pre_save, sender=EligibilityRequest)
def track_status_change(sender, instance, **kwargs):
    """Track the old status before saving"""
    if instance.pk:  # Only for updates
        try:
            old_instance = EligibilityRequest.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except EligibilityRequest.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=EligibilityRequest)
def notify_eligibility_status_change(sender, instance, created, **kwargs):
    """Signal to send email when status changes"""
    if not created:  # Only for updates, not new records
        if instance.status in ['approved', 'rejected', 'processing']:
            # ✅ Pass all required arguments
            send_certificate_notification_async(
                instance, 
                instance.status,
                rejection_reason=instance.rejection_reason if instance.status == 'rejected' else None
            )




#REQUIREMENTS MONITORING
class Barangay(models.Model):
    """Model for Barangay information"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    municipality = models.CharField(max_length=100, default='Lucena')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Barangay'
        verbose_name_plural = 'Barangays'
    
    def __str__(self):
        return self.name


class Requirement(models.Model):
    """Model for Requirements that need to be monitored"""
    PERIOD_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('semestral', 'Semestral'),
        ('annually', 'Annually'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    due_date = models.DateField(null=True, blank=True) # ← Make sure this exists

    priority = models.CharField(
        max_length=20,
        choices=[
            ('normal', 'Normal'),
            ('important', 'Important'),
            ('urgent', 'Urgent'),
        ],
        default='normal'
    )
    
    # Applicable to which barangays (if None, applies to all)
    applicable_barangays = models.ManyToManyField(Barangay, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_requirements')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['period', 'title']
        indexes = [
            models.Index(fields=['period', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_period_display()})"


class RequirementSubmission(models.Model):
    """Model for tracking requirement submissions by barangays"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('accomplished', 'Accomplished'),
        ('rejected', 'Rejected'),
    ]
    
    requirement = models.ForeignKey(Requirement, on_delete=models.CASCADE, related_name='submissions')
    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE, related_name='submissions')
    
    # Submission details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField()
    
    # For weekly submissions - track which week
    week_number = models.PositiveIntegerField(null=True, blank=True)
    year = models.PositiveIntegerField(default=timezone.now().year)
    
    # Content
    update_text = models.TextField(blank=True)
    
    # Tracking
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submitted_requirements')
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_requirements')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['barangay', 'status']),
            models.Index(fields=['requirement', 'due_date']),
            models.Index(fields=['week_number', 'year']),
        ]
        unique_together = [['requirement', 'barangay', 'week_number', 'year']]
    
    def __str__(self):
        return f"{self.requirement.title} - {self.barangay.name} - Week {self.week_number}"
    
    @property
    def is_overdue(self):
        """Check if submission is overdue"""
        if self.status in ['accomplished', 'rejected']:
            return False
        return timezone.now().date() > self.due_date
    
    def submit(self, user):
        """Mark as submitted"""
        self.status = 'in_progress'
        self.submitted_by = user
        self.submitted_at = timezone.now()
        self.save()
        
        # Log the submission
        AuditLog.objects.create(
            user=user,
            action='CREATE',
            content_object=self,
            description=f"Submitted requirement: {self.requirement.title} for {self.barangay.name}"
        )


class RequirementAttachment(models.Model):
    """Model for file attachments (images/documents) for requirements"""
    submission = models.ForeignKey(RequirementSubmission, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='requirements/%Y/%m/')
    file_type = models.CharField(max_length=50)  # image/jpeg, application/pdf, etc.
    file_size = models.PositiveIntegerField()  # in bytes
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"Attachment for {self.submission}"
    
    @property
    def file_size_kb(self):
        """Return file size in KB"""
        try:
            if self.file_size:
                return round(self.file_size / 1024, 2)
            return 0
        except (TypeError, AttributeError):
            return 0
    
    def delete(self, *args, **kwargs):
        """Delete file when model is deleted"""
        if self.file:
            self.file.delete(save=False)
        super().delete(*args, **kwargs)


@receiver(pre_save, sender=RequirementSubmission)
def track_submission_status_change(sender, instance, **kwargs):
    """Track the old status before saving"""
    if instance.pk:
        try:
            old_instance = RequirementSubmission.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except RequirementSubmission.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=RequirementSubmission)
def log_submission_status_change(sender, instance, created, **kwargs):
    """Log status changes"""
    if created:
        AuditLog.objects.create(
            action='CREATE',
            content_object=instance,
            description=f"New requirement submission: {instance.requirement.title} for {instance.barangay.name}"
        )
    elif hasattr(instance, '_old_status') and instance._old_status != instance.status:
        AuditLog.objects.create(
            action='UPDATE',
            content_object=instance,
            old_values={'status': instance._old_status},
            new_values={'status': instance.status},
            description=f"Status changed: {instance.requirement.title} - {instance._old_status} → {instance.status}"
        )



class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('overdue', 'Overdue'),
        ('upcoming', 'Upcoming'),
        ('completed', 'Completed'),
        ('reminder', 'Reminder'),
        ('info', 'Information'),
        ('new_requirement', 'New Requirement'),
        ('new_submission', 'New Submission'),
        ('announcement', 'Announcement'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)


    # Optional: Link to related objects
    submission = models.ForeignKey(
        'RequirementSubmission', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='notifications'
    )
    announcement = models.ForeignKey(
        'Announcement',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    barangay = models.ForeignKey(
        'Barangay',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def time_ago(self):
        """Return human-readable time difference"""
        from django.utils.timesince import timesince
        return f"{timesince(self.created_at, timezone.now())} ago"


class Announcement(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    date = models.DateField(default=timezone.now)  # ADD THIS LINE
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    posted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcements')
    posted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    views = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-posted_at']
    
    def __str__(self):
        return self.title
    
    def increment_views(self):
        self.views += 1
        self.save(update_fields=['views'])


#--------categorization--------
class FileCategory(models.Model):
    """Model for file categories"""
    CATEGORY_CHOICES = [
        ('certificates', 'Certificates'),
        ('ids', 'Identification Documents'),
        ('signatures', 'Signatures'),
        ('weekly', 'Weekly Reports'),
        ('monthly', 'Monthly Reports'),
        ('quarterly', 'Quarterly Reports'),
        ('semestral', 'Semestral Reports'),
        ('annually', 'Annual Reports'),
        ('general', 'General Documents'),
    ]
    
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    folder_path = models.CharField(max_length=200)  # e.g., 'certificates/approved/'
    icon = models.CharField(max_length=50, default='fa-folder')
    file_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'File Category'
        verbose_name_plural = 'File Categories'
    
    def __str__(self):
        return self.display_name
    
    def update_file_count(self):
        """Update the file count for this category"""
        self.file_count = CategorizedFile.objects.filter(category=self).count()
        self.save()


class CategorizedFile(models.Model):
    """Model for categorized files with metadata"""
    FILE_SOURCE_CHOICES = [
        ('eligibility', 'Eligibility Request'),
        ('requirement', 'Requirement Submission'),
        ('manual', 'Manual Upload'),
    ]
    
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('pdf', 'PDF Document'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]
    
    # File information
    file = models.FileField(upload_to='categorized/%Y/%m/')
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    file_size = models.BigIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    
    # Categorization
    category = models.ForeignKey(FileCategory, on_delete=models.CASCADE, related_name='files')
    source = models.CharField(max_length=20, choices=FILE_SOURCE_CHOICES)
    
    # Auto-detected metadata
    detected_content = models.CharField(max_length=100, blank=True)  # e.g., 'ID Front', 'Signature'
    barangay = models.ForeignKey(Barangay, on_delete=models.SET_NULL, null=True, blank=True)
    period = models.CharField(max_length=20, blank=True)  # weekly, monthly, etc.
    
    # Relations to source objects
    eligibility_request = models.ForeignKey(
        EligibilityRequest, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='categorized_files'
    )
    requirement_submission = models.ForeignKey(
        RequirementSubmission, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='categorized_files'
    )
    requirement_attachment = models.OneToOneField(
        RequirementAttachment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='categorized_file'
    )
    
    # User tracking
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(default=timezone.now)
    
    # Tags for searching
    tags = models.CharField(max_length=500, blank=True)  # comma-separated tags
    
    # Status
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['category', 'uploaded_at']),
            models.Index(fields=['barangay', 'period']),
            models.Index(fields=['source', 'file_type']),
        ]
    
    def __str__(self):
        return f"{self.original_filename} - {self.category.display_name}"
    
    @property
    def file_size_kb(self):
        return round(self.file_size / 1024, 2)
    
    @property
    def file_size_mb(self):
        return round(self.file_size / (1024 * 1024), 2)
    
    def get_thumbnail_url(self):
        """Return thumbnail URL for images"""
        if self.file_type == 'image':
            return self.file.url
        return None
    
    def add_tag(self, tag):
        """Add a tag to the file"""
        tags_list = [t.strip() for t in self.tags.split(',') if t.strip()]
        if tag not in tags_list:
            tags_list.append(tag)
            self.tags = ', '.join(tags_list)
            self.save()
    
    def archive(self):
        """Archive this file"""
        self.is_archived = True
        self.archived_at = timezone.now()
        self.save()


# Signal to auto-categorize files when EligibilityRequest is saved
@receiver(post_save, sender=EligibilityRequest)
def categorize_eligibility_files(sender, instance, created, **kwargs):
    """Auto-categorize files from eligibility requests"""
    if created:
        # Categorize ID Front
        if instance.id_front:
            category = FileCategory.objects.get_or_create(
                name='ids',
                defaults={
                    'display_name': 'Identification Documents',
                    'folder_path': 'ids/',
                    'description': 'Government-issued IDs and identification documents'
                }
            )[0]
            
            CategorizedFile.objects.create(
                file=instance.id_front,
                original_filename=os.path.basename(instance.id_front.name),
                file_type='image',
                file_size=instance.id_front.size,
                mime_type='image/jpeg',
                category=category,
                source='eligibility',
                detected_content='ID Front',
                eligibility_request=instance,
                uploaded_by=None,
                tags=f"{instance.first_name} {instance.last_name}, ID Front"
            )
        
        # Categorize ID Back
        if instance.id_back:
            category = FileCategory.objects.get_or_create(
                name='ids',
                defaults={
                    'display_name': 'Identification Documents',
                    'folder_path': 'ids/',
                }
            )[0]
            
            CategorizedFile.objects.create(
                file=instance.id_back,
                original_filename=os.path.basename(instance.id_back.name),
                file_type='image',
                file_size=instance.id_back.size,
                mime_type='image/jpeg',
                category=category,
                source='eligibility',
                detected_content='ID Back',
                eligibility_request=instance,
                uploaded_by=None,
                tags=f"{instance.first_name} {instance.last_name}, ID Back"
            )
        
        # Categorize Signature
        if instance.signature:
            category = FileCategory.objects.get_or_create(
                name='signatures',
                defaults={
                    'display_name': 'Signatures',
                    'folder_path': 'signatures/',
                    'description': 'Digital signatures and sign-offs'
                }
            )[0]
            
            CategorizedFile.objects.create(
                file=instance.signature,
                original_filename=os.path.basename(instance.signature.name),
                file_type='image',
                file_size=instance.signature.size,
                mime_type='image/png',
                category=category,
                source='eligibility',
                detected_content='Signature',
                eligibility_request=instance,
                uploaded_by=None,
                tags=f"{instance.first_name} {instance.last_name}, Signature"
            )
        
        # When approved, categorize certificate
        if instance.status == 'approved':
            category = FileCategory.objects.get_or_create(
                name='certificates',
                defaults={
                    'display_name': 'Certificates',
                    'folder_path': 'certificates/approved/',
                    'description': 'Approved eligibility certificates'
                }
            )[0]


# Signal to auto-categorize requirement attachments
@receiver(post_save, sender=RequirementAttachment)
def categorize_requirement_files(sender, instance, created, **kwargs):
    """Auto-categorize files from requirement submissions with error handling"""
    if not created:
        return
    
    try:
        submission = instance.submission
        period = submission.requirement.period
        
        # Get or create category based on period
        category_name = period  # 'weekly', 'monthly', etc.
        display_names = {
            'weekly': 'Weekly Reports',
            'monthly': 'Monthly Reports',
            'quarterly': 'Quarterly Reports',
            'semestral': 'Semestral Reports',
            'annually': 'Annual Reports',
        }
        
        category, created_cat = FileCategory.objects.get_or_create(
            name=category_name,
            defaults={
                'display_name': display_names.get(category_name, category_name.title()),
                'folder_path': f'requirements/{category_name}/',
                'description': f'{display_names.get(category_name)} from barangays'
            }
        )
        
        # Determine file type safely
        file_type = 'other'
        if instance.file_type:
            if '/' in instance.file_type:
                file_type = instance.file_type.split('/')[0]
            elif instance.file_type.startswith('image'):
                file_type = 'image'
        
        # Get file size safely
        file_size = instance.file_size if instance.file_size else 0
        
        # Create categorized file
        CategorizedFile.objects.create(
            file=instance.file,
            original_filename=os.path.basename(instance.file.name) if instance.file else 'unknown',
            file_type=file_type,
            file_size=file_size,
            mime_type=instance.file_type or 'application/octet-stream',
            category=category,
            source='requirement',
            detected_content=submission.requirement.title[:100],  # Limit length
            barangay=submission.barangay,
            period=period,
            requirement_submission=submission,
            requirement_attachment=instance,
            uploaded_by=instance.uploaded_by,
            tags=f"{submission.barangay.name}, {submission.requirement.title}, {period}"
        )
        
        # Update category file count
        category.update_file_count()
        
        print(f"✓ Categorized file: {instance.file.name} into {category.display_name}")
        
    except Exception as e:
        # Log error but don't prevent attachment from being saved
        print(f"⚠️ Error in categorize_requirement_files signal: {e}")
        print(f"Traceback:\n{traceback.format_exc()}")
        # Don't raise - allow the attachment to be saved even if categorization fails


class MonitoringFile(models.Model):
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='monitoring_files/')
    category = models.CharField(max_length=50)  # weekly, monthly, etc.
    barangay = models.ForeignKey('Barangay', on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)