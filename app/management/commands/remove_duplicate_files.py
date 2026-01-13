from django.core.management.base import BaseCommand
from app.models import CategorizedFile
from collections import defaultdict

class Command(BaseCommand):
    help = 'Remove duplicate CategorizedFile entries'

    def handle(self, *args, **options):
        print("\n" + "="*60)
        print("🧹 REMOVING DUPLICATE FILES")
        print("="*60)
        
        # Group files by filename
        files_by_name = defaultdict(list)
        
        for file in CategorizedFile.objects.all().order_by('uploaded_at'):
            files_by_name[file.original_filename].append(file)
        
        total_duplicates = 0
        
        for filename, file_list in files_by_name.items():
            if len(file_list) > 1:
                print(f"\n📂 {filename}: {len(file_list)} copies found")
                
                # Keep the FIRST one (oldest), delete the rest
                files_to_keep = file_list[0]
                files_to_delete = file_list[1:]
                
                print(f"   ✓ Keeping ID {files_to_keep.id} (uploaded {files_to_keep.uploaded_at})")
                
                for dup in files_to_delete:
                    print(f"   ✗ Deleting ID {dup.id} (uploaded {dup.uploaded_at})")
                    dup.delete()
                    total_duplicates += 1
        
        print(f"\n{'='*60}")
        print(f"✅ CLEANUP COMPLETE")
        print(f"   Total duplicates removed: {total_duplicates}")
        print(f"{'='*60}\n")