# management/commands/generate_sample_data.py
"""
Django Management Command to Generate Sample Data for Barangay Dashboard

Usage:
    python manage.py generate_sample_data
    python manage.py generate_sample_data --clear
    python manage.py generate_sample_data --days 180

This generates data for:
1. Requirements Trend Chart (time-series)
2. Requirements Type Chart (radar chart) 
3. Eligibility Analytics Chart (polar area)
4. Certifications Issued Chart (monthly line chart) ✅ NEW
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import datetime, timedelta
import random
from decimal import Decimal

# Import your actual models
from app.models import (
    Barangay,
    Requirement,
    RequirementSubmission,
    RequirementAttachment,
    EligibilityRequest,
    BarangayOfficial,
    UserProfile
)


class Command(BaseCommand):
    help = 'Generate sample data for barangay dashboard analytics and charts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days of historical data to generate (default: 90)'
        )
        parser.add_argument(
            '--months',
            type=int,
            default=12,
            help='Number of months of certification chart data (default: 12)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing sample data before generating new data'
        )

    def handle(self, *args, **options):
        days = options['days']
        months = options['months']
        clear_data = options['clear']

        self.stdout.write(self.style.WARNING(f'\n{"="*60}'))
        self.stdout.write(self.style.WARNING(f'GENERATING {days} DAYS OF SAMPLE DATA'))
        self.stdout.write(self.style.WARNING(f'{"="*60}\n'))

        if clear_data:
            self.clear_existing_data()

        # Get or create admin user for submissions
        admin_user = self.get_or_create_admin_user()

        # Generate data
        barangays = self.create_barangays()
        requirements = self.create_requirements(admin_user)
        self.create_requirements_trend_data(barangays, requirements, admin_user, days)
        self.create_eligibility_data(barangays, admin_user)
        
        # ✅ NEW: Generate monthly certification data for chart
        self.create_monthly_certifications(barangays, admin_user, months)
        
        self.create_barangay_officials_data(barangays, admin_user)

        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('✓ SAMPLE DATA GENERATION COMPLETED!'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

    def clear_existing_data(self):
        """Clear existing sample data"""
        self.stdout.write(self.style.WARNING('Clearing existing sample data...'))
        
        # Delete requirement submissions and attachments
        RequirementAttachment.objects.all().delete()
        RequirementSubmission.objects.all().delete()
        
        # Delete eligibility requests (keeping some if needed)
        EligibilityRequest.objects.filter(status='pending').delete()
        
        # Delete barangay officials
        BarangayOfficial.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('✓ Existing data cleared\n'))

    def get_or_create_admin_user(self):
        """Get or create admin user for data generation"""
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@dilg.gov.ph',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            user.set_password('admin123')
            user.save()
            
            # Create user profile
            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'role': 'dilg staff',
                    'is_approved': True,
                    'is_profile_complete': True
                }
            )
        
        return user

    def create_barangays(self):
        """Create or get barangay instances"""
        barangay_data = [
            ('Barangay I (Pob.)', 'BRG-01'),
            ('Barangay II (Pob.)', 'BRG-02'),
            ('Barangay III (Pob.)', 'BRG-03'),
            ('Barra', 'BRG-04'),
            ('Bocohan', 'BRG-05'),
            ('Cotta', 'BRG-06'),
            ('Dalahican', 'BRG-07'),
            ('Domoit', 'BRG-08'),
            ('Gulang-Gulang', 'BRG-09'),
            ('Ibabang Dupay', 'BRG-10'),
        ]
        
        barangays = []
        for name, code in barangay_data:
            barangay, created = Barangay.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'municipality': 'Lucena City'
                }
            )
            barangays.append(barangay)
            if created:
                self.stdout.write(f'  ✓ Created barangay: {name}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(barangays)} barangays ready\n'))
        return barangays

    def create_requirements(self, admin_user):
        """Create requirement templates"""
        requirement_data = [
            ('Weekly Accomplishment Report', 'weekly', 'Weekly progress report on barangay activities'),
            ('Weekly Financial Report', 'weekly', 'Weekly financial transactions and budget utilization'),
            ('Monthly Activity Report', 'monthly', 'Detailed monthly activities and programs'),
            ('Monthly Financial Statement', 'monthly', 'Monthly financial statement and budget status'),
            ('Monthly Population Report', 'monthly', 'Monthly population statistics and demographics'),
            ('Quarterly Accomplishment Report', 'quarterly', 'Quarterly achievements and milestones'),
            ('Quarterly Budget Utilization Report', 'quarterly', 'Quarterly budget performance and utilization'),
            ('Semestral Evaluation Report', 'semestral', 'Semestral performance evaluation'),
            ('Semestral Training Needs Assessment', 'semestral', 'Assessment of training needs for staff'),
            ('Annual Accomplishment Report', 'annually', 'Annual summary of all activities and achievements'),
            ('Annual Financial Report', 'annually', 'Annual financial statement and audit'),
            ('Annual Barangay Profile Update', 'annually', 'Updated barangay demographic and geographic data'),
        ]
        
        requirements = []
        for title, period, description in requirement_data:
            requirement, created = Requirement.objects.get_or_create(
                title=title,
                period=period,
                defaults={
                    'description': description,
                    'is_active': True,
                    'created_by': admin_user,
                    'priority': random.choice(['normal', 'important', 'urgent'])
                }
            )
            requirements.append(requirement)
            if created:
                self.stdout.write(f'  ✓ Created requirement: {title}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ {len(requirements)} requirements created\n'))
        return requirements

    def create_requirements_trend_data(self, barangays, requirements, admin_user, days):
        """Generate time-series data for requirements trend chart"""
        self.stdout.write(self.style.WARNING(f'Generating {days} days of requirements trend data...'))
        
        today = timezone.now()
        created_count = 0
        
        # Get requirements by period
        weekly_reqs = [r for r in requirements if r.period == 'weekly']
        monthly_reqs = [r for r in requirements if r.period == 'monthly']
        quarterly_reqs = [r for r in requirements if r.period == 'quarterly']
        semestral_reqs = [r for r in requirements if r.period == 'semestral']
        annual_reqs = [r for r in requirements if r.period == 'annually']
        
        for day_offset in range(days):
            date = today - timedelta(days=days - day_offset - 1)
            
            # Calculate week number for this date
            week_number = date.isocalendar()[1]
            year = date.year
            
            # Vary submissions per day (more realistic distribution)
            # More submissions on weekdays, fewer on weekends
            is_weekend = date.weekday() >= 5
            
            if is_weekend:
                completed_today = random.randint(2, 8)
                pending_today = random.randint(1, 5)
            else:
                completed_today = random.randint(8, 25)
                pending_today = random.randint(3, 15)
            
            # Create completed submissions
            for _ in range(completed_today):
                barangay = random.choice(barangays)
                requirement = random.choice(requirements)
                
                # Calculate due date based on period
                if requirement.period == 'weekly':
                    due_date = date + timedelta(days=7)
                elif requirement.period == 'monthly':
                    due_date = date + timedelta(days=30)
                elif requirement.period == 'quarterly':
                    due_date = date + timedelta(days=90)
                elif requirement.period == 'semestral':
                    due_date = date + timedelta(days=180)
                else:  # annually
                    due_date = date + timedelta(days=365)
                
                try:
                    submission, created = RequirementSubmission.objects.get_or_create(
                        requirement=requirement,
                        barangay=barangay,
                        week_number=week_number,
                        year=year,
                        defaults={
                            'status': 'accomplished',
                            'due_date': due_date,
                            'update_text': f'Completed {requirement.title} for week {week_number}',
                            'submitted_by': admin_user,
                            'submitted_at': date,
                            'reviewed_by': admin_user,
                            'reviewed_at': date + timedelta(hours=random.randint(1, 48)),
                            'review_notes': 'Approved - requirements met'
                        }
                    )
                    if created:
                        created_count += 1
                except Exception as e:
                    # Skip duplicates
                    pass
            
            # Create pending submissions
            for _ in range(pending_today):
                barangay = random.choice(barangays)
                requirement = random.choice(requirements)
                
                if requirement.period == 'weekly':
                    due_date = date + timedelta(days=random.randint(1, 7))
                elif requirement.period == 'monthly':
                    due_date = date + timedelta(days=random.randint(7, 30))
                else:
                    due_date = date + timedelta(days=random.randint(14, 60))
                
                # Use different week numbers to avoid duplicates
                sub_week = week_number + random.randint(1, 4)
                
                try:
                    submission, created = RequirementSubmission.objects.get_or_create(
                        requirement=requirement,
                        barangay=barangay,
                        week_number=sub_week,
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
                except Exception as e:
                    pass
            
            # Progress indicator
            if (day_offset + 1) % 10 == 0:
                self.stdout.write(f'  Progress: {day_offset + 1}/{days} days processed...')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Created {created_count} requirement submissions\n'))

    def create_eligibility_data(self, barangays, admin_user):
        """Generate eligibility certification data"""
        self.stdout.write(self.style.WARNING('Generating eligibility certification data...'))
        
        first_names = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Ramon', 'Elena', 'Carlos', 
                       'Sofia', 'Miguel', 'Isabel', 'Antonio', 'Carmen', 'Luis', 'Diego']
        last_names = ['Cruz', 'Santos', 'Reyes', 'Garcia', 'Lopez', 'Mendoza', 'Ramos', 
                      'Torres', 'Flores', 'Rivera', 'Alvarez', 'Morales', 'Ortiz', 'Silva', 'Diaz']
        
        appointive_positions = [
            'Barangay Secretary',
            'Barangay Treasurer',
            'Administrative Aide',
            'Utility Worker',
            'Barangay Health Worker',
            'Barangay Tanod',
            'Day Care Worker',
        ]
        
        elective_positions = [
            'Punong Barangay',
            'Barangay Kagawad',
            'SK Chairperson',
            'SK Kagawad',
        ]
        
        today = timezone.now()
        created_count = 0
        
        # Generate APPOINTIVE certifications (40-80 total)
        num_appointive = random.randint(40, 80)
        for i in range(num_appointive):
            barangay = random.choice(barangays)
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            position = random.choice(appointive_positions)
            
            # Random dates within past year
            days_ago = random.randint(30, 365)
            submission_date = today - timedelta(days=days_ago)
            
            # Appointive official data
            years_service = round(random.uniform(1.0, 15.0), 1)
            appointment_start = submission_date - timedelta(days=int(years_service * 365))
            appointment_end = submission_date + timedelta(days=random.randint(365, 1095))
            
            EligibilityRequest.objects.create(
                first_name=first_name,
                last_name=last_name,
                middle_initial=random.choice(['A', 'B', 'C', 'D', 'M', '']),
                email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
                barangay=barangay.name,
                position_type='appointive',
                
                # Appointive fields
                appointing_authority=f'Punong Barangay {random.choice(last_names)}',
                appointment_from=appointment_start.date(),
                appointment_to=appointment_end.date(),
                years_in_service=Decimal(str(years_service)),
                appointing_punong_barangay=f'{random.choice(first_names)} {random.choice(last_names)}',
                pb_date_elected=appointment_start.date() - timedelta(days=random.randint(30, 365)),
                pb_years_service=Decimal(str(round(random.uniform(3.0, 20.0), 1))),
                
                # Status
                certifier=random.choice(['punong_barangay', 'dilg_municipality', 'dilg_provincial']),
                status='approved',
                date_submitted=submission_date,
                approved_by=admin_user,
                date_processed=submission_date + timedelta(days=random.randint(1, 7)),
            )
            created_count += 1
        
        self.stdout.write(f'  ✓ Created {num_appointive} appointive certifications')
        
        # Generate ELECTIVE certifications - COMPLETED (60-120 total)
        num_elective_complete = random.randint(60, 120)
        for i in range(num_elective_complete):
            barangay = random.choice(barangays)
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            position = random.choice(elective_positions)
            
            days_ago = random.randint(30, 365)
            submission_date = today - timedelta(days=days_ago)
            
            # Elective official data - COMPLETED TERM
            term_years = random.choice([3, 6])  # Standard terms
            election_start = submission_date - timedelta(days=term_years * 365)
            election_end = submission_date
            
            EligibilityRequest.objects.create(
                first_name=first_name,
                last_name=last_name,
                middle_initial=random.choice(['A', 'B', 'C', 'D', 'M', '']),
                email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
                barangay=barangay.name,
                position_type='elective',
                
                # Elective fields - COMPLETED
                position_held=position,
                election_from=election_start.date(),
                election_to=election_end.date(),
                term_office=f'{term_years} years',
                completed_term='Yes - Full term served',
                incomplete_reason='',
                days_not_served=0,
                
                # Status
                certifier=random.choice(['punong_barangay', 'dilg_municipality', 'dilg_provincial']),
                status='approved',
                date_submitted=submission_date,
                approved_by=admin_user,
                date_processed=submission_date + timedelta(days=random.randint(1, 7)),
            )
            created_count += 1
        
        self.stdout.write(f'  ✓ Created {num_elective_complete} elective certifications (completed)')
        
        # Generate ELECTIVE certifications - INCOMPLETE (10-30 total)
        num_elective_incomplete = random.randint(10, 30)
        for i in range(num_elective_incomplete):
            barangay = random.choice(barangays)
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            position = random.choice(elective_positions)
            
            days_ago = random.randint(7, 90)
            submission_date = today - timedelta(days=days_ago)
            
            # Elective official data - INCOMPLETE TERM
            intended_years = random.choice([3, 6])
            actual_years = random.uniform(0.5, intended_years - 0.5)
            election_start = submission_date - timedelta(days=int(actual_years * 365))
            election_end = election_start + timedelta(days=intended_years * 365)
            days_not_served = int((intended_years - actual_years) * 365)
            
            reasons = [
                'Resigned due to health reasons',
                'Moved to another location',
                'Appointed to higher position',
                'Personal reasons',
                'Family emergency'
            ]
            
            EligibilityRequest.objects.create(
                first_name=first_name,
                last_name=last_name,
                middle_initial=random.choice(['A', 'B', 'C', 'D', 'M', '']),
                email=f'{first_name.lower()}.{last_name.lower()}@{barangay.code.lower()}.gov.ph',
                barangay=barangay.name,
                position_type='elective',
                
                # Elective fields - INCOMPLETE
                position_held=position,
                election_from=election_start.date(),
                election_to=election_end.date(),
                term_office=f'{intended_years} years (intended)',
                completed_term='No - Incomplete term',
                incomplete_reason=random.choice(reasons),
                days_not_served=days_not_served,
                
                # Status - Mix of pending and approved
                certifier=random.choice(['punong_barangay', 'dilg_municipality']),
                status=random.choice(['pending', 'approved', 'processing']),
                date_submitted=submission_date,
                approved_by=admin_user if random.random() > 0.3 else None,
                date_processed=submission_date + timedelta(days=random.randint(1, 7)) if random.random() > 0.3 else None,
            )
            created_count += 1
        
        self.stdout.write(f'  ✓ Created {num_elective_incomplete} elective certifications (incomplete)')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Total eligibility certifications created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   - Appointive: {num_appointive}'))
        self.stdout.write(self.style.SUCCESS(f'   - Elective Complete: {num_elective_complete}'))
        self.stdout.write(self.style.SUCCESS(f'   - Elective Incomplete: {num_elective_incomplete}\n'))

    def create_monthly_certifications(self, barangays, admin_user, months=12):
        """
        ✅ NEW FUNCTION: Generate monthly certification data for the chart
        Creates realistic distribution of elective and appointive certifications by month
        """
        self.stdout.write(self.style.WARNING(f'\n📜 Generating {months} months of certification data for chart...'))
        
        first_names = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Ramon', 'Elena', 'Carlos', 
                       'Sofia', 'Miguel', 'Isabel', 'Antonio', 'Carmen', 'Luis', 'Diego']
        last_names = ['Cruz', 'Santos', 'Reyes', 'Garcia', 'Lopez', 'Mendoza', 'Ramos', 
                      'Torres', 'Flores', 'Rivera', 'Alvarez', 'Morales']
        
        today = timezone.now()
        current_year = today.year
        current_month = today.month
        
        elective_total = 0
        appointive_total = 0
        
        # Generate data for each month
        for month_offset in range(months):
            # Calculate target month (go backwards from current month)
            target_month = current_month - month_offset
            target_year = current_year
            
            # Handle year rollover
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            # Realistic monthly distribution with variation
            base_elective = 8
            base_appointive = 12
            
            # Seasonal variations (more activity in certain months)
            if target_month in [1, 2]:  # Start of year
                elective_mult = random.uniform(1.3, 1.8)
                appointive_mult = random.uniform(1.4, 1.9)
            elif target_month in [6, 7]:  # Mid-year
                elective_mult = random.uniform(1.8, 2.5)
                appointive_mult = random.uniform(1.2, 1.5)
            elif target_month in [11, 12]:  # Year-end
                elective_mult = random.uniform(1.4, 1.9)
                appointive_mult = random.uniform(1.5, 2.0)
            else:
                elective_mult = random.uniform(0.8, 1.3)
                appointive_mult = random.uniform(0.9, 1.4)
            
            num_elective = int(base_elective * elective_mult)
            num_appointive = int(base_appointive * appointive_mult)
            
            # Generate elective certifications for this month
            for i in range(num_elective):
                barangay = random.choice(barangays)
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)
                
                # Random day within the month (safe day to avoid month-end issues)
                day = random.randint(1, 28)
                submission_date = timezone.datetime(target_year, target_month, day)
                submission_date = timezone.make_aware(submission_date)
                
                # Term details
                term_years = random.choice([3, 6])
                election_start = submission_date - timedelta(days=term_years * 365)
                election_end = submission_date
                
                EligibilityRequest.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    middle_initial=random.choice(['A', 'B', 'C', 'D', 'M', '']),
                    email=f'{first_name.lower()}.{last_name.lower()}@chart.test',
                    barangay=barangay.name,
                    position_type='elective',
                    
                    # Elective fields
                    position_held=random.choice(['Punong Barangay', 'Barangay Kagawad', 'SK Chairperson']),
                    election_from=election_start.date(),
                    election_to=election_end.date(),
                    term_office=f'{term_years} years',
                    completed_term='Yes - Full term served',
                    incomplete_reason='',
                    days_not_served=0,
                    
                    certifier='punong_barangay',
                    status='approved',
                    date_submitted=submission_date,
                    approved_by=admin_user,
                    date_processed=submission_date + timedelta(days=random.randint(1, 3))
                )
                elective_total += 1
            
            # Generate appointive certifications for this month
            for i in range(num_appointive):
                barangay = random.choice(barangays)
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)
                
                day = random.randint(1, 28)
                submission_date = timezone.datetime(target_year, target_month, day)
                submission_date = timezone.make_aware(submission_date)
                
                # Appointive term details
                years_service = round(random.uniform(1.0, 15.0), 1)
                appointment_start = submission_date - timedelta(days=int(years_service * 365))
                appointment_end = submission_date + timedelta(days=random.randint(365, 1095))
                
                EligibilityRequest.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    middle_initial=random.choice(['A', 'B', 'C', 'D', 'M', '']),
                    email=f'{first_name.lower()}.{last_name.lower()}@chart.test',
                    barangay=barangay.name,
                    position_type='appointive',
                    
                    # Appointive fields
                    appointing_authority=f'Punong Barangay {random.choice(last_names)}',
                    appointment_from=appointment_start.date(),
                    appointment_to=appointment_end.date(),
                    years_in_service=Decimal(str(years_service)),
                    appointing_punong_barangay=f'{random.choice(first_names)} {random.choice(last_names)}',
                    pb_date_elected=appointment_start.date() - timedelta(days=random.randint(30, 365)),
                    pb_years_service=Decimal(str(round(random.uniform(3.0, 20.0), 1))),
                    
                    certifier='punong_barangay',
                    status='approved',
                    date_submitted=submission_date,
                    approved_by=admin_user,
                    date_processed=submission_date + timedelta(days=random.randint(1, 3))
                )
                appointive_total += 1
            
            # Show progress for each month
            month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            self.stdout.write(f'  ✓ {target_year}-{target_month:02d} ({month_names[target_month-1]}): {num_elective} elective, {num_appointive} appointive')
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Chart Data Created:'))
        self.stdout.write(self.style.SUCCESS(f'   - Elective: {elective_total}'))
        self.stdout.write(self.style.SUCCESS(f'   - Appointive: {appointive_total}'))
        self.stdout.write(self.style.SUCCESS(f'   - TOTAL: {elective_total + appointive_total}\n'))

    def create_barangay_officials_data(self, barangays, admin_user):
        """Generate barangay officials profile data"""
        self.stdout.write(self.style.WARNING('Generating barangay officials profile data...'))
        
        first_names = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Ramon', 'Elena', 'Carlos', 'Sofia', 'Miguel']
        middle_names = ['Santos', 'Cruz', 'Garcia', 'Reyes', 'Lopez', 'Martinez', 'Ramos', 'Torres']
        last_names = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Lopez', 'Mendoza', 'Ramos', 'Torres', 'Flores', 'Rivera']
        
        positions = [
            ('Punong Barangay', 'elective'),
            ('Barangay Kagawad', 'elective'),
            ('SK Chairperson', 'elective'),
            ('Barangay Secretary', 'appointive'),
            ('Barangay Treasurer', 'appointive'),
        ]
        
        created_count = 0
        today = timezone.now().date()
        
        # Create 3-5 officials per barangay
        for barangay in barangays:
            # Create barangay user for this barangay
            brgy_username = f'secretary_{barangay.code.lower()}'
            brgy_user, created = User.objects.get_or_create(
                username=brgy_username,
                defaults={
                    'email': f'{brgy_username}@dilg.gov.ph',
                    'first_name': f'Secretary',
                    'last_name': barangay.name.split()[0]
                }
            )
            
            if created:
                brgy_user.set_password('password123')
                brgy_user.save()
                
                # Create user profile
                UserProfile.objects.get_or_create(
                    user=brgy_user,
                    defaults={
                        'role': 'barangay user',
                        'barangay': barangay,
                        'is_approved': True,
                        'is_profile_complete': True
                    }
                )
            
            # Create 3-5 officials for this barangay
            num_officials = random.randint(3, 5)
            
            for _ in range(num_officials):
                position, position_type = random.choice(positions)
                
                # Generate term dates
                if position_type == 'elective':
                    # 3-year term
                    term_start = today - timedelta(days=random.randint(0, 1095))  # 0-3 years ago
                    term_end = term_start + timedelta(days=1095)  # 3 years
                else:
                    # Appointive - varying terms
                    term_start = today - timedelta(days=random.randint(30, 730))
                    term_end = term_start + timedelta(days=random.randint(365, 1825))
                
                # Determine if term is ongoing or completed
                if today > term_end:
                    term_status = 'completed'
                else:
                    term_status = 'ongoing'
                
                BarangayOfficial.objects.create(
                    secretary=brgy_user,
                    first_name=random.choice(first_names),
                    middle_name=random.choice(middle_names),
                    last_name=random.choice(last_names),
                    suffix=random.choice(['', '', '', 'Jr.', 'Sr.']),  # Mostly no suffix
                    position=position,
                    position_type=position_type,
                    term_start=term_start,
                    term_end=term_end,
                    term_status=term_status,
                    email=f'{random.choice(first_names).lower()}.{random.choice(last_names).lower()}@{barangay.code.lower()}.gov.ph',
                    phone=f'0{random.randint(900, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                    notes=f'Official record for {position} position'
                )
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Created {created_count} barangay officials\n'))