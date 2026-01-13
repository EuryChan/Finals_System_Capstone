from django.db import migrations

def merge_roles(apps, schema_editor):
    UserProfile = apps.get_model('app', 'UserProfile')
    
    # Convert both 'municipal officer' and 'barangay official' to 'barangay user'
    UserProfile.objects.filter(
        role__in=['municipal officer', 'barangay official']
    ).update(role='barangay user')
    
    print(f"✅ Updated {UserProfile.objects.filter(role='barangay user').count()} user profiles")

def reverse_merge(apps, schema_editor):
    # Optional: reverse migration
    pass

class Migration(migrations.Migration):
    dependencies = [
    ('app', '0033_auto_20251224_1322'),
]

    operations = [
        migrations.RunPython(merge_roles, reverse_merge),
    ]