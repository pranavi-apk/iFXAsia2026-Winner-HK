#!/usr/bin/env python3
"""
Database Manager Utility
View and manage the JSON database
"""
import json
import sys
from pathlib import Path
from datetime import datetime

DATA_DIR = Path(__file__).parent / "data"
CASES_FILE = DATA_DIR / "cases.json"
DOCS_FILE = DATA_DIR / "documents.json"


def load_json(filepath):
    """Load JSON file"""
    if not filepath.exists():
        return []
    with open(filepath, 'r') as f:
        return json.load(f)


def save_json(filepath, data):
    """Save JSON file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)


def list_cases(limit=10):
    """List recent cases"""
    cases = load_json(CASES_FILE)
    cases.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    print(f"\n{'='*80}")
    print(f"CASES (Total: {len(cases)}, Showing: {min(limit, len(cases))})")
    print(f"{'='*80}\n")

    for i, case in enumerate(cases[:limit], 1):
        print(f"{i}. {case.get('id')}")
        print(f"   Name: {case.get('investor_name')}")
        print(f"   Status: {case.get('status')}")
        print(f"   Risk: {case.get('risk_level', 'N/A')}")
        print(f"   Created: {case.get('created_at')}")
        print(f"   Updated: {case.get('updated_at')}")
        print()


def list_documents(case_id=None, limit=10):
    """List documents"""
    docs = load_json(DOCS_FILE)

    if case_id:
        docs = [d for d in docs if d.get('case_id') == case_id]
        print(f"\n{'='*80}")
        print(f"DOCUMENTS FOR CASE {case_id} (Total: {len(docs)})")
        print(f"{'='*80}\n")
    else:
        docs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        print(f"\n{'='*80}")
        print(f"DOCUMENTS (Total: {len(docs)}, Showing: {min(limit, len(docs))})")
        print(f"{'='*80}\n")

    for i, doc in enumerate(docs[:limit] if not case_id else docs, 1):
        print(f"{i}. {doc.get('id')}")
        print(f"   File: {doc.get('filename')}")
        print(f"   Case: {doc.get('case_id')}")
        print(f"   Type: {doc.get('document_type', 'Unknown')}")
        print(f"   Confidence: {doc.get('confidence', 0)}%")
        print(f"   Status: {doc.get('status')}")
        print(f"   Created: {doc.get('created_at')}")
        print()


def get_case(case_id):
    """Get specific case details"""
    cases = load_json(CASES_FILE)
    case = next((c for c in cases if c.get('id') == case_id), None)

    if not case:
        print(f"\n❌ Case {case_id} not found!")
        return

    print(f"\n{'='*80}")
    print(f"CASE DETAILS: {case_id}")
    print(f"{'='*80}\n")

    for key, value in case.items():
        if key not in ['custom_fields']:  # Skip complex nested objects
            print(f"{key}: {value}")

    # Show associated documents
    print(f"\n{'='*40}")
    print("ASSOCIATED DOCUMENTS")
    print(f"{'='*40}\n")
    list_documents(case_id=case_id)


def stats():
    """Show database statistics"""
    cases = load_json(CASES_FILE)
    docs = load_json(DOCS_FILE)

    print(f"\n{'='*80}")
    print("DATABASE STATISTICS")
    print(f"{'='*80}\n")

    print(f"Total Cases: {len(cases)}")
    print(f"Total Documents: {len(docs)}")

    # Count by status
    status_counts = {}
    for case in cases:
        status = case.get('status', 'Unknown')
        status_counts[status] = status_counts.get(status, 0) + 1

    print(f"\nCases by Status:")
    for status, count in sorted(status_counts.items()):
        print(f"  - {status}: {count}")

    # Count doc types
    type_counts = {}
    for doc in docs:
        doc_type = doc.get('document_type', 'Unknown')
        type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

    print(f"\nDocuments by Type:")
    for doc_type, count in sorted(type_counts.items()):
        print(f"  - {doc_type}: {count}")

    print()


def clean_orphaned_docs():
    """Remove documents not associated with any case"""
    cases = load_json(CASES_FILE)
    docs = load_json(DOCS_FILE)

    case_ids = {c.get('id') for c in cases}
    orphaned = [d for d in docs if d.get('case_id') not in case_ids]

    if not orphaned:
        print("\n✅ No orphaned documents found!")
        return

    print(f"\n⚠️  Found {len(orphaned)} orphaned documents:")
    for doc in orphaned:
        print(f"  - {doc.get('id')}: {doc.get('filename')} (Case: {doc.get('case_id')})")

    confirm = input("\nDelete these documents? (yes/no): ")
    if confirm.lower() == 'yes':
        cleaned_docs = [d for d in docs if d.get('case_id') in case_ids]
        save_json(DOCS_FILE, cleaned_docs)
        print(f"\n✅ Deleted {len(orphaned)} orphaned documents!")
    else:
        print("\n❌ Cancelled")


def backup_database():
    """Create a backup of the database"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = DATA_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)

    cases_backup = backup_dir / f"cases_{timestamp}.json"
    docs_backup = backup_dir / f"documents_{timestamp}.json"

    import shutil
    shutil.copy(CASES_FILE, cases_backup)
    shutil.copy(DOCS_FILE, docs_backup)

    print(f"\n✅ Backup created:")
    print(f"  - {cases_backup}")
    print(f"  - {docs_backup}")


def main():
    """Main CLI interface"""
    if len(sys.argv) < 2:
        print("""
Database Manager - Usage:

  python3 db_manager.py list-cases [limit]       - List recent cases
  python3 db_manager.py list-docs [limit]        - List recent documents
  python3 db_manager.py get-case <case_id>       - Get case details
  python3 db_manager.py stats                    - Show statistics
  python3 db_manager.py clean-orphaned           - Remove orphaned documents
  python3 db_manager.py backup                   - Create database backup

Examples:
  python3 db_manager.py list-cases 20
  python3 db_manager.py get-case CASE-2026-3759
  python3 db_manager.py stats
        """)
        return

    command = sys.argv[1]

    if command == "list-cases":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        list_cases(limit)

    elif command == "list-docs":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        list_documents(limit=limit)

    elif command == "get-case":
        if len(sys.argv) < 3:
            print("❌ Please provide a case ID")
            return
        get_case(sys.argv[2])

    elif command == "stats":
        stats()

    elif command == "clean-orphaned":
        clean_orphaned_docs()

    elif command == "backup":
        backup_database()

    else:
        print(f"❌ Unknown command: {command}")


if __name__ == "__main__":
    main()
