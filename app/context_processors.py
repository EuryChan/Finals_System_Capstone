# app/context_processors.py

def user_role(request):
    """
    Context processor to add user role and permissions to all templates
    """
    context = {
        'user_role': None,
        'user_barangay': None,
        'user_permissions': {
            'can_approve_requests': False,
            'can_view_all_barangays': False,
            'can_manage_users': False,
        },
        'is_dilg_staff': False,
        'is_municipal_officer': False,
        'is_barangay_official': False,
    }
    
    if request.user.is_authenticated:
        try:
            # Try to get UserProfile - handle case where it doesn't exist
            if hasattr(request.user, 'userprofile'):
                profile = request.user.userprofile
                context['user_role'] = profile.role
                context['user_barangay'] = profile.barangay
                
                # Set role-specific flags
                if profile.role == 'dilg staff':
                    context['is_dilg_staff'] = True
                    context['user_permissions']['can_approve_requests'] = True
                    context['user_permissions']['can_view_all_barangays'] = True
                    context['user_permissions']['can_manage_users'] = True
                    
                elif profile.role == 'municipal officer':
                    context['is_municipal_officer'] = True
                    context['user_permissions']['can_approve_requests'] = True
                    context['user_permissions']['can_view_all_barangays'] = True
                    
                elif profile.role == 'barangay official':
                    context['is_barangay_official'] = True
                    # Barangay officials can only see their own barangay
                    context['user_permissions']['can_approve_requests'] = False
                    context['user_permissions']['can_view_all_barangays'] = False
            else:
                # If no UserProfile exists, create one with default role
                from .models import UserProfile
                profile = UserProfile.objects.create(
                    user=request.user,
                    role='barangay official',  # Default role
                    is_approved=False
                )
                context['user_role'] = 'barangay official'
                context['is_barangay_official'] = True
                
        except Exception as e:
            # Log the error but don't break the app
            print(f"⚠️ Error in context processor: {e}")
            
    return context


# app/context_processors.py

def notification_counts(request):
    """
    Add notification counts to all templates for sidebar badges
    """
    from django.contrib.auth.models import User
    from .models import EligibilityRequest, Notification
    
    counts = {
        'pending_users_count': 0,
        'pending_applications_count': 0,
        'unread_notifications_count': 0,
        'user_approvals_count': 0,  # Total needing approval
    }
    
    if request.user.is_authenticated:
        try:
            # Count pending user approvals (users waiting for admin approval)
            counts['pending_users_count'] = User.objects.filter(
                userprofile__is_approved=False
            ).count()
            
            # Count pending applications (non-archived)
            counts['pending_applications_count'] = EligibilityRequest.objects.filter(
                status='pending',
                archived=False
            ).count()
            
            # Count unread notifications for current user
            counts['unread_notifications_count'] = Notification.objects.filter(
                user=request.user,
                is_read=False
            ).count()
            
            # Total items needing approval (for User Approvals page)
            counts['user_approvals_count'] = counts['pending_users_count']
            
        except Exception as e:
            print(f"⚠️ Error calculating notification counts: {e}")
    
    return counts