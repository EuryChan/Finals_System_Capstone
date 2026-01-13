"""
Quick script to add sample data to a SPECIFIC barangay
Run this in Django shell: python manage.py shell

Usage:
    exec(open('add_barangay_data.py').read())
"""

from app.models import (
    Barangay, Requirement, RequirementSubmission, 
    EligibilityRequest, User
)
from django.utils import timezone
from datetime import timedelta
import random
from decimal import Decimal

# ============================================
# CONFIGURATION - CHANGE THIS
# ============================================
BARANGAY_NAME = "Barangay V"  # Change to your barangay name
DAYS_OF_DATA = 90
# ============================================

print(f"\n{'='*60}")
print(f"ADDING SAMPLE DATA TO: {BARANGAY_NAME}")
print(f"{'='*60}\n")

# Get the barangay
try:
    barangay = Barangay.objects.get(name=BARANGAY_NAME)
    print(f"✓ Found barangay: {barangay.name}")
except Barangay.DoesNotExist:
    print(f"❌ Barangay '{BARANGAY_NAME}' not found!")
    print(f"\nAvailable barangays:")
    for b in Barangay.objects.all()[:10]:
        print(f"  - {b.name}")
    exit()

# Get admin user
try:
    admin_user = User.objects.get(username='admin')
except User.DoesNotExist:
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        print("❌ No admin user found!")
        exit()

print(f"✓ Using user: {admin_user.username}\n")

# Get all active requirements
requirements = list(Requirement.objects.filter(is_active=True))
if not requirements:
    print("❌ No requirements found! Create some requirements first.")
    exit()

print(f"✓ Found {len(requirements)} requirements\n")

# ============================================
# GENERATE REQUIREMENT SUBMISSIONS
# ============================================
print("Generating requirement submissions...")

today = timezone.now()
created_count = 0

for day_offset in range(DAYS_OF_DATA):
    date = today - timedelta(days=DAYS_OF_DATA - day_offset - 1)
    week_number = date.isocalendar()[1]
    year = date.year
    
    # More on weekdays, less on weekends
    is_weekend = date.weekday() >= 5
    
    if is_weekend:
        completed_today = random.randint(1, 3)
        pending_today = random.randint(0, 2)
    else:
        completed_today = random.randint(3, 8)
        pending_today = random.randint(1, 5)
    
    # Create completed submissions
    for _ in range(completed_today):
        requirement = random.choice(requirements)
        
        if requirement.period == 'weekly':
            due_date = date + timedelta(days=7)
        elif requirement.period == 'monthly':
            due_date = date + timedelta(days=30)
        elif requirement.period == 'quarterly':
            due_date = date + timedelta(days=90)
        elif requirement.period == 'semestral':
            due_date = date + timedelta(days=180)
        else:
            due_date = date + timedelta(days=365)
        
        try:
            submission, created = RequirementSubmission.objects.get_or_create(
                requirement=requirement,
                barangay=barangay,
                week_number=week_number + random.randint(0, 2),
                year=year,
                defaults={
                    'status': 'accomplished',
                    'due_date': due_date,
                    'update_text': f'Completed {requirement.title} for week {week_number}',
                    'submitted_by': admin_user,
                    'submitted_at': date,
                    'reviewed_by': admin_user,
                    'reviewed_at': date + timedelta(hours=random.randint(1, 48)),
                    'review_notes': 'Approved'
                }
            )
            if created:
                created_count += 1
        except:
            pass
    
    # Create pending submissions
    for _ in range(pending_today):
        requirement = random.choice(requirements)
        
        if requirement.period == 'weekly':
            due_date = date + timedelta(days=random.randint(1, 7))
        else:
            due_date = date + timedelta(days=random.randint(7, 30))
        
        try:
            submission, created = RequirementSubmission.objects.get_or_create(
                requirement=requirement,
                barangay=barangay,
                week_number=week_number + random.randint(3, 10),
                year=year,
                defaults={
                    'status': random.choice(['pending', 'in_progress']),
                    'due_date': due_date,
                    'update_text': f'In progress: {requirement.title}',
                    'submitted_by': admin_user,
                    'submitted_at': date,
                }
            )
            if created:
                created_count += 1
        except:
            pass
    
    if (day_offset + 1) % 10 == 0:
        print(f"  Progress: {day_offset + 1}/{DAYS_OF_DATA} days...")

print(f"\n✓ Created {created_count} requirement submissions for {barangay.name}\n")

# ============================================
# GENERATE ELIGIBILITY CERTIFICATIONS
# ============================================
print("Generating eligibility certifications...")

first_names = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Ramon', 'Elena', 'Carlos']
last_names = ['Cruz', 'Santos', 'Reyes', 'Garcia', 'Lopez', 'Mendoza', 'Ramos', 'Torres']

eligibility_count = 0

# Appointive (5-10)
num_appointive = random.randint(5, 10)
for i in range(num_appointive):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    
    days_ago = random.randint(30, 365)
    submission_date = today - timedelta(days=days_ago)
    years_service = round(random.uniform(1.0, 15.0), 1)
    appointment_start = submission_date - timedelta(days=int(years_service * 365))
    appointment_end = submission_date + timedelta(days=random.randint(365, 1095))
    
    EligibilityRequest.objects.create(
        first_name=first_name,
        last_name=last_name,
        middle_initial=random.choice(['A', 'B', 'C', 'M', '']),
        email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
        barangay=barangay.name,
        position_type='appointive',
        appointing_authority=f'Punong Barangay {random.choice(last_names)}',
        appointment_from=appointment_start.date(),
        appointment_to=appointment_end.date(),
        years_in_service=Decimal(str(years_service)),
        appointing_punong_barangay=f'{random.choice(first_names)} {random.choice(last_names)}',
        pb_date_elected=appointment_start.date() - timedelta(days=random.randint(30, 365)),
        pb_years_service=Decimal(str(round(random.uniform(3.0, 20.0), 1))),
        certifier=random.choice(['punong_barangay', 'dilg_municipality']),
        status='approved',
        date_submitted=submission_date,
        approved_by=admin_user,
        date_processed=submission_date + timedelta(days=random.randint(1, 7)),
    )
    eligibility_count += 1

print(f"  ✓ Created {num_appointive} appointive certifications")

# Elective - Completed (10-20)
num_elective_complete = random.randint(10, 20)
for i in range(num_elective_complete):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    
    days_ago = random.randint(30, 365)
    submission_date = today - timedelta(days=days_ago)
    term_years = random.choice([3, 6])
    election_start = submission_date - timedelta(days=term_years * 365)
    election_end = submission_date
    
    EligibilityRequest.objects.create(
        first_name=first_name,
        last_name=last_name,
        middle_initial=random.choice(['A', 'B', 'C', 'M', '']),
        email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
        barangay=barangay.name,
        position_type='elective',
        position_held=random.choice(['Punong Barangay', 'Kagawad', 'SK Chairperson']),
        election_from=election_start.date(),
        election_to=election_end.date(),
        term_office=f'{term_years} years',
        completed_term='Yes - Full term served',
        incomplete_reason='',
        days_not_served=0,
        certifier=random.choice(['punong_barangay', 'dilg_municipality']),
        status='approved',
        date_submitted=submission_date,
        approved_by=admin_user,
        date_processed=submission_date + timedelta(days=random.randint(1, 7)),
    )
    eligibility_count += 1

print(f"  ✓ Created {num_elective_complete} elective-completed certifications")

# Elective - Incomplete (2-5)
num_elective_incomplete = random.randint(2, 5)
for i in range(num_elective_incomplete):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    
    days_ago = random.randint(7, 90)
    submission_date = today - timedelta(days=days_ago)
    intended_years = random.choice([3, 6])
    actual_years = random.uniform(0.5, intended_years - 0.5)
    election_start = submission_date - timedelta(days=int(actual_years * 365))
    election_end = election_start + timedelta(days=intended_years * 365)
    days_not_served = int((intended_years - actual_years) * 365)
    
    EligibilityRequest.objects.create(
        first_name=first_name,
        last_name=last_name,
        middle_initial=random.choice(['A', 'B', 'C', 'M', '']),
        email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
        barangay=barangay.name,
        position_type='elective',
        position_held=random.choice(['Punong Barangay', 'Kagawad']),
        election_from=election_start.date(),
        election_to=election_end.date(),
        term_office=f'{intended_years} years (intended)',
        completed_term='No - Incomplete term',
        incomplete_reason=random.choice(['Resigned', 'Moved', 'Health reasons']),
        days_not_served=days_not_served,
        certifier='punong_barangay',
        status=random.choice(['pending', 'approved', 'processing']),
        date_submitted=submission_date,
        approved_by=admin_user if random.random() > 0.3 else None,
        date_processed=submission_date + timedelta(days=random.randint(1, 7)) if random.random() > 0.3 else None,
    )
    eligibility_count += 1

print(f"  ✓ Created {num_elective_incomplete} elective-incomplete certifications")

print(f"\n{'='*60}")
print(f"✓ COMPLETED!")
print(f"{'='*60}")
print(f"Barangay: {barangay.name}")
print(f"Requirement Submissions: {created_count}")
print(f"Eligibility Certifications: {eligibility_count}")
print(f"  - Appointive: {num_appointive}")
print(f"  - Elective Complete: {num_elective_complete}")
print(f"  - Elective Incomplete: {num_elective_incomplete}")
print(f"{'='*60}\n")
