from django.urls import path
from . import views
from django.contrib.auth import views as auth_views


urlpatterns = [
    # ============================================
    # PUBLIC PAGES
    # ============================================
    path('', views.landing_page, name='landing_page'),
    path('login/', views.login_page, name='login_page'),
    path('signup/', views.signup_page, name='signup_page'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/pending/', views.signup_pending, name='signup_pending'),
    path('user-approvals/', views.pending_users, name='pending_users'),
    path('user-approvals/approve/<int:user_id>/', views.approve_user, name='approve_user'),
    path('user-approvals/reject/<int:user_id>/', views.reject_user, name='reject_user'),
    path('signup/message/', views.signup_message, name='signup_message'),  # For users

    # ============================================
    # BARANGAY OFFICIAL - SUBMISSION PAGES
    # ============================================
    path('requirements_monitoring/', views.requirements_monitoring, name='requirements_monitoring'),
    path('civil_service_certification/', views.civil_service_certification, name='civil_service_certification'),
    path('submit_eligibility_request/', views.submit_eligibility_request, name='submit_eligibility_request_legacy'),
    
    # ============================================
    # DILG ADMIN - REVIEW PAGES (Changed path!)
    # ============================================
    #  Changed from /admin/submissions/ to /dilg/submissions/
    path('api/eligibility-request/<int:request_id>/', views.api_get_eligibility_request, name='api_get_eligibility_request'),
    path('api/admin/calendar/', views.admin_calendar_view, name='admin_calendar'),
    path('dilg/submissions/', views.admin_submissions_page, name='admin_submissions_page'),
    path('dilg/application-requests/', views.application_request, name='application_request'),

    # Requirements Management APIs
    #path('api/admin/requirements/list/', views.api_requirements_list, name='api_requirements_list'),
    path('api/admin/requirements/<int:requirement_id>/', views.api_requirement_detail, name='api_requirement_detail'),
    path('api/admin/requirements/<int:requirement_id>/update/', views.api_update_requirement, name='api_update_requirement'),
    path('api/admin/requirements/<int:requirement_id>/archive/', views.api_archive_requirement, name='api_archive_requirement'),
    path('api/admin/requirements/<int:requirement_id>/restore/', views.api_restore_requirement, name='api_restore_requirement'),
    
    # ============================================
    # DILG STAFF DASHBOARD
    # ============================================
    path('api/applications/archive/<int:application_id>/', views.archive_application),
    path('api/applications/restore/<int:application_id>/', views.restore_application),

    path('api/analytics/refresh/', views.refresh_analytics, name='refresh_analytics'),
    path('api/analytics/certifications/', views.certifications_data, name='certifications_data'),
    path('api/analytics/barangays/', views.barangays_data, name='barangays_data'),
    path('landing-menu/', views.landing_menu, name='landing_menu'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('employees/', views.employees_profile, name='employees_profile'),
    path('api/analytics/refresh/', views.refresh_analytics, name='refresh_analytics'),
    
    # ============================================
    # API ENDPOINTS - REQUIREMENTS MONITORING
    # ============================================
    path('logout/', auth_views.LogoutView.as_view(next_page='login_page'), name='logout'),
    path('api/user/session/', views.api_user_session, name='api_user_session'),
    path('api/requirements/list/', views.api_requirements_list, name='api_requirements_list'),
    path('api/requirements/submission/<int:submission_id>/', views.api_submission_detail, name='api_submission_detail'),
    path('api/requirements/submission/<int:submission_id>/upload/', views.api_attachment_upload, name='api_attachment_upload'),
    path('api/requirements/submission/<int:submission_id>/submit/', views.api_submission_submit, name='api_submission_submit'),
    path('api/requirements/submission/<int:submission_id>/delete/', views.api_submission_delete, name='api_submission_delete'),
    path('api/requirements/attachment/<int:attachment_id>/delete/', views.api_attachment_delete, name='api_attachment_delete'),
    path('api/barangay/<int:barangay_id>/status/', views.get_barangay_status, name='barangay_status'),
    
    # ============================================
    # API ENDPOINTS - DILG ADMIN REVIEW
    # ============================================
    path('api/admin/submissions/', views.api_admin_submissions_list, name='api_admin_submissions_list'),
    path('api/admin/review/<int:submission_id>/', views.api_admin_review_submission, name='api_admin_review_submission'),
    
    # ============================================
    # API ENDPOINTS - ELIGIBILITY REQUESTS
    # ============================================
    path('api/eligibility/submit/', views.submit_eligibility_request, name='submit_eligibility_request'),
    path('api/eligibility/update-status/', views.update_application_status, name='update_application_status'),
    
    # ============================================
    # API ENDPOINTS - EMPLOYEES
    # ============================================
    path('api/employees/archive/<int:employee_id>/', views.archive_employee, name='archive_employee'),
    path('api/employees/restore/<int:employee_id>/', views.restore_employee, name='restore_employee'),
    path('api/employees/edit/<int:employee_id>/', views.edit_employee, name='edit_employee'),
    path('api/employees/delete/<int:employee_id>/', views.delete_employee, name='delete_employee'),
    path('api/employees/export/', views.export_employees, name='export_employees'),
    path('api/employees/search/', views.employee_search_api, name='employee_search_api'),
    path('api/employees/bulk/', views.bulk_employee_operations, name='bulk_employee_operations'),
    
    
    # ============================================
    # OTHER PAGES
    # ============================================
    path('settings/', views.settings, name='settings'),
    path('application-letter/', views.application_letter, name='application_letter'),
    path('monitoring-files/', views.monitoring_filess, name='monitoring_filess'),
    path('certification-files/', views.certification_filess, name='certification_filess'),

    # ============================================
    # API ENDPOINTS - DILG ADMIN REVIEW (FIXED PATH!)
    # ============================================
    path('api/test-endpoint/<int:submission_id>/', views.test_endpoint, name='test_endpoint'),
    path('api/test-notification/', views.test_create_notification, name='test_notification'),
    path('api/admin/requirements/create/', views.api_create_requirement, name='api_create_requirement'),
    path('api/admin/submissions/', views.api_admin_submissions_list, name='api_admin_submissions_list'),
    path('api/admin/review/<int:submission_id>/', views.api_admin_review_submission, name='api_admin_review_submission'),
    
    # ============================================
    # API ENDPOINTS - DILG REQUIREMENT MANAGEMENT
    # ============================================
    path('api/admin/requirements/list/', 
         views.requirements_list_api, 
         name='requirements_list_api'),

     path('api/eligibility-certifications-data/', views.eligibility_certifications_chart_data, name='eligibility_certifications_chart_data'),

    path('api/debug-requirement-issue/', views.debug_requirement_issue, name='debug_requirement_issue'),

    path('api/debug/requirements/', 
         views.debug_requirements_count, 
         name='debug_requirements_count'),
    
    path('api/admin/requirements/<int:requirement_id>/', 
         views.requirement_detail_api, 
         name='requirement_detail_api'),
    path('api/user/settings/', views.user_settings_api, name='user_settings_api'),
    path('api/user/profile/', views.user_profile_api, name='user_profile_api'),
    path('api/requirements/create/', views.api_create_requirement, name='api_create_requirement'),
    path('api/requirements/<int:requirement_id>/edit/', views.api_edit_requirement, name='api_edit_requirement'),
    path('api/requirements/<int:requirement_id>/delete/', views.api_delete_requirement, name='api_delete_requirement'),
    path('api/requirements/all/', views.api_all_requirements, name='api_all_requirements'),

    # Notification endpoints
    path('api/notifications/debug/', views.debug_notifications, name='debug_notifications'),
    path('api/notifications/', views.get_notifications, name='get_notifications'),
    path('api/notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('api/notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_read'),
    
    # Enhanced submission endpoints with notifications
    path('api/announcements/<int:announcement_id>/update/', views.update_announcement, name='update_announcement'),
    path('api/announcements/create/', views.create_announcement, name='create_announcement'),
    path('api/requirements/submission/<int:submission_id>/submit/',views.api_submit_requirement, name='api_submit_requirement'),
    path('api/requirements/submission/<int:submission_id>/approve/', views.approve_submission_with_notification, name='approve_submission'),
    path('api/requirements/submission/<int:submission_id>/reject/', views.reject_submission_with_notification, name='reject_submission'),
    path('api/notifications/', views.get_notifications, name='get_notifications'),
    path('api/notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
    path('api/notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('api/notifications/unread-count/', views.get_unread_count, name='unread_count'),
    path('api/announcements/create/', views.create_announcement, name='create_announcement'),

    # Announcement APIs
    path('api/announcements/', views.get_announcements, name='get_announcements'),
    path('api/announcements/create/', views.create_announcement, name='create_announcement'),
    path('api/announcements/<int:announcement_id>/update/', views.update_announcement, name='update_announcement'),
    path('api/announcements/<int:announcement_id>/delete/', views.delete_announcement, name='delete_announcement'),

    path('certification_filess/', views.certification_filess, name='certification_filess'),
    path('monitoring_filess/', views.monitoring_filess, name='monitoring_filess'),

    path('api/files/category/<str:category>/', views.get_files_by_category_simple, name='get_files_by_category'),
    path('api/files/upload/', views.api_upload_file, name='api_upload_file'),
    path('api/files/<int:file_id>/delete/', views.api_delete_monitoring_file, name='api_delete_file'),
    path('api/files/<int:file_id>/archive/', views.api_archive_file, name='api_archive_file'),
    path('api/files/<int:file_id>/move/', views.api_move_file, name='api_move_file'),
    path('api/files/statistics/', views.api_file_statistics, name='api_file_statistics'),

    # File Operations
    path('logout/', auth_views.LogoutView.as_view(next_page='login'), name='logout'),
    path('folder/', views.folder_view, name='folder'),  # Make sure this matches your function name
    
    path('debug/certificate-categories/', views.debug_certificate_categories, name='debug_certificate_categories'),
     path('api/certificate-files/<int:file_id>/delete/', 
     views.api_delete_monitoring_file,  # Use the existing function
     name='delete_certificate_file'),
     path('api/certificate-files/category/<str:category>/', views.get_certificate_files_by_category, name='get_certificate_files_by_category'),
     path('setup-certificate-folders/', views.setup_certificate_folders, name='setup_certificate_folders'),
     path('debug-certificate-files/', views.debug_certificate_files, name='debug_certificate_files'),
     path('test-certificate-setup/', views.test_certificate_setup, name='test_certificate_setup'),
     path('api/files/<int:file_id>/delete/', views.api_delete_file, name='api_delete_file'),
     path('api/files/upload/', views.api_upload_file, name='api_upload_file'),


    # API endpoints for settings
    # Settings API endpoints
    path('api/update-profile/', views.update_profile, name='update_profile'),
    path('api/update-account/', views.update_account, name='update_account'),
    path('api/change-password/', views.change_password, name='change_password'),
    path('api/get-notification-preferences/', views.get_notification_preferences, name='get_notifications'),
    path('api/update-notifications/', views.update_notifications, name='update_notifications'),
    path('api/toggle-2fa/', views.toggle_2fa, name='toggle_2fa'),
    path('api/delete-account/', views.delete_account, name='delete_account'),
    path('api/get-user-stats/', views.get_user_stats, name='get_user_stats'),

    # ===== BARANGAY OFFICIALS PROFILE API ENDPOINTS =====
    path('api/officials/list/', views.list_officials, name='list_officials'),
    path('api/officials/create/', views.create_official, name='create_official'),
    path('api/officials/update/<int:official_id>/', views.update_official, name='update_official'),
    path('api/officials/delete/<int:official_id>/', views.delete_official, name='delete_official'),
    path('api/officials/<int:official_id>/', views.get_official, name='get_official'),
    path('api/officials/bulk-create/', views.bulk_create_officials, name='bulk_create_officials'),
    path('api/officials/<int:official_id>/generate-certificate/', views.generate_official_certificate, name='generate_official_certificate'),

    # ============================================
    # MISCELLANEOUS
     path('barangay/dashboard/', views.barangay_dashboard, name='barangay_dashboard'),
     path('test-email/', views.send_test_email, name='test_email'),
     path('debug/user-barangay/', views.debug_user_barangay),
     path('api/requirements/radar-chart/', views.requirements_radar_chart_data, name='requirements_radar_chart'),
     path('api/eligibility/analytics/', views.api_eligibility_analytics, name='api_eligibility_analytics'),
     path('api/requirements/trend/', views.api_requirements_trend_data, name='api_requirements_trend_data'),

    path('profile/update/', views.update_profiles, name='update_profile'),
    path('profile/change-password/', views.change_passwords, name='change_password'),
    path('api/profile/stats/', views.profile_stats, name='profile_stats'),

    path('terms_conditions/', views.terms_conditions, name='terms_conditions'),
    path('api/accept-terms/', views.accept_terms, name='accept_terms'),
    path('api/check-terms/', views.check_terms_acceptance, name='check_terms'),

    # Notification API
    path('api/notifications/', views.api_notifications, name='api_notifications'),
    path('api/notifications/<int:notification_id>/read/', views.api_notification_mark_read, name='api_notification_mark_read'),
    path('api/notifications/mark-all-read/', views.api_notifications_mark_all_read, name='api_notifications_mark_all_read'),


  

]
