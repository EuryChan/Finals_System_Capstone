from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from app.models import UserProfile, Barangay
import re

class Command(BaseCommand):
    help = 'Automatically assign barangays to punong barangay users'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Starting barangay assignment...'))
        
        assigned_count = 0
        skipped_count = 0
        
        # Get all barangay officials
        officials = UserProfile.objects.filter(role='barangay official')
        
        for profile in officials:
            username = profile.user.username
            
            # Skip if already assigned
            if profile.barangay:
                self.stdout.write(f'  ⏭️  {username} - Already assigned to {profile.barangay.name}')
                skipped_count += 1
                continue
            
            # Try to extract barangay name from username
            # Pattern: punong_barangay_<barangay_name>
            if username.startswith('punong_barangay_'):
                barangay_slug = username.replace('punong_barangay_', '')
                
                # Try to find matching barangay
                # Method 1: Direct code match
                barangay = Barangay.objects.filter(code__iexact=barangay_slug).first()
                
                # Method 2: Name match (replace underscores/hyphens with spaces)
                if not barangay:
                    barangay_name = barangay_slug.replace('_', ' ').replace('-', ' ').title()
                    barangay = Barangay.objects.filter(name__iexact=barangay_name).first()
                
                # Method 3: Partial name match
                if not barangay:
                    barangay = Barangay.objects.filter(
                        name__icontains=barangay_slug.replace('_', ' ')
                    ).first()
                
                if barangay:
                    profile.barangay = barangay
                    profile.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✅ {username} → {barangay.name}')
                    )
                    assigned_count += 1
                else:
                    self.stdout.write(
                        self.style.ERROR(f'  ❌ {username} - No matching barangay found for "{barangay_slug}"')
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  {username} - Cannot extract barangay from username')
                )
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Assignment complete!'))
        self.stdout.write(f'   Assigned: {assigned_count}')
        self.stdout.write(f'   Skipped: {skipped_count}')