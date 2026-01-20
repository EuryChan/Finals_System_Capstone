from datetime import datetime, timedelta
from django.utils import timezone
from .models import RequirementSubmission, Notification

def check_overdue_requirements():
    """
    Check for overdue requirements and create notifications
    Run this daily via cron job or Celery
    """
    overdue_submissions = RequirementSubmission.objects.filter(
        status__in=['pending', 'in_progress'],
        due_date__lt=timezone.now().date()
    )
    
    notifications_created = 0
    
    for submission in overdue_submissions:
        if submission.barangay.submitter:
            # Check if we already notified about this today
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            existing = Notification.objects.filter(
                user=submission.barangay.submitter,
                submission=submission,
                type='overdue',
                created_at__gte=today_start
            ).exists()
            
            if not existing:
                Notification.objects.create(
                    user=submission.barangay.submitter,
                    type='overdue',
                    title='Overdue Requirement',
                    message=f'{submission.requirement.title} for {submission.barangay.name} is overdue!',
                    submission=submission,
                    barangay=submission.barangay
                )
                notifications_created += 1
    
    return notifications_created


def check_upcoming_requirements():
    """
    Check for requirements due in the next 3 days
    Run this daily via cron job or Celery
    """
    today = timezone.now().date()
    three_days = today + timedelta(days=3)
    
    upcoming_submissions = RequirementSubmission.objects.filter(
        status__in=['pending', 'in_progress'],
        due_date__gte=today,
        due_date__lte=three_days
    )
    
    notifications_created = 0
    
    for submission in upcoming_submissions:
        if submission.barangay.submitter:
            # Check if we already notified about this
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            existing = Notification.objects.filter(
                user=submission.barangay.submitter,
                submission=submission,
                type='upcoming',
                created_at__gte=today_start
            ).exists()
            
            if not existing:
                days_until_due = (submission.due_date - today).days
                Notification.objects.create(
                    user=submission.barangay.submitter,
                    type='upcoming',
                    title='Upcoming Deadline',
                    message=f'{submission.requirement.title} is due in {days_until_due} day(s)',
                    submission=submission,
                    barangay=submission.barangay
                )
                notifications_created += 1
    
    return notifications_created

def send_email_task(eligibility_request, status, rejection_reason=None):
    """Send email notification to applicant"""
    from django.core.mail import send_mail
    from django.conf import settings
    
    subject = f'Application Status Update - {status.capitalize()}'
    
    if status == 'approved':
        message = f"""
Dear {eligibility_request.full_name},

Your eligibility request has been APPROVED.

Request ID: {eligibility_request.id}
Status: Approved

Thank you for your application.

Best regards,
DILG Team
        """
    elif status == 'rejected':
        message = f"""
Dear {eligibility_request.full_name},

Your eligibility request has been REJECTED.

Request ID: {eligibility_request.id}
Status: Rejected
Reason: {rejection_reason or 'Not specified'}

Thank you for your application.

Best regards,
DILG Team
        """
    else:
        return
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[eligibility_request.email],
            fail_silently=False,
        )
        print(f"✅ Email sent to {eligibility_request.email}")
    except Exception as e:
        print(f"❌ Email failed: {str(e)}")