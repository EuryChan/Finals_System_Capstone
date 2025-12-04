from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from app.models import Barangay, UserProfile  # Replace 'your_app' with actual app name

class Command(BaseCommand):
    help = 'Creates user accounts for all barangays'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            default='Barangay2024!',
            help='Default password for all barangay users'
        )

    def handle(self, *args, **options):
        default_password = options['password']
        
        # Get or create Barangay Official group
        barangay_group, _ = Group.objects.get_or_create(name='barangay official')
        
        # Get all barangays
        barangays = Barangay.objects.all().order_by('id')
        
        created_count = 0
        skipped_count = 0
        
        self.stdout.write(self.style.SUCCESS('\n🏛️  Creating Barangay User Accounts\n'))
        self.stdout.write('=' * 60)
        
        for barangay in barangays:
            # Create username based on barangay name
            # Example: "Barangay I" -> "punong_barangay_i"
            # Example: "Barra" -> "punong_barangay_barra"
            
            barangay_name_clean = barangay.name.replace(' ', '_').lower()
            username = f"punong_barangay_{barangay_name_clean}"
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'⏭️  Skipped: {username} (already exists)')
                )
                skipped_count += 1
                continue
            
            try:
                # Create user
                user = User.objects.create_user(
                    username=username,
                    password=default_password,
                    email=f'{username}@lipa.gov.ph',
                    first_name=f'Punong Barangay',
                    last_name=barangay.name
                )
                
                # Add to barangay official group
                user.groups.add(barangay_group)
                
                # Create or update user profile
                user_profile, created = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'role': 'barangay official',
                        'barangay': barangay
                    }
                )
                
                if not created:
                    user_profile.role = 'barangay official'
                    user_profile.barangay = barangay
                    user_profile.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Created: {username} | Password: {default_password} | Barangay: {barangay.name}'
                    )
                )
                created_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error creating {username}: {str(e)}')
                )
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Summary:\n'
                f'   Created: {created_count} users\n'
                f'   Skipped: {skipped_count} users\n'
                f'   Default Password: {default_password}\n'
            )
        )
        
        # Print login instructions
        self.stdout.write(
            self.style.WARNING(
                f'\n📋 Login Instructions:\n'
                f'   Username format: punong_barangay_[barangay_name]\n'
                f'   Examples:\n'
                f'     - punong_barangay_i\n'
                f'     - punong_barangay_barra\n'
                f'     - punong_barangay_mayao_castillo\n'
                f'\n⚠️  IMPORTANT: Users should change their passwords after first login!\n'
            )
        )


# Alternative: Script to generate SQL for user creation
class Command2(BaseCommand):
    """Alternative command that generates SQL statements"""
    help = 'Generates SQL statements to create barangay users'

    def handle(self, *args, **options):
        barangays = Barangay.objects.all().order_by('id')
        
        self.stdout.write(
            self.style.SUCCESS('\n-- SQL Statements to Create Barangay Users\n')
        )
        
        for barangay in barangays:
            barangay_name_clean = barangay.name.replace(' ', '_').lower()
            username = f"punong_barangay_{barangay_name_clean}"
            
            self.stdout.write(
                f"-- {barangay.name}\n"
                f"INSERT INTO auth_user (username, password, email, first_name, last_name, is_staff, is_active, date_joined)\n"
                f"VALUES ('{username}', 'pbkdf2_sha256$...', '{username}@lipa.gov.ph', 'Punong Barangay', '{barangay.name}', 0, 1, NOW());\n"
                f"\n"
            )