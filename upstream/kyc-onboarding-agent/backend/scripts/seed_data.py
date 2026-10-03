"""
Seed data script to initialize JSON files with sample data.
"""
import json
import os
from pathlib import Path
from datetime import datetime, timedelta


def create_seed_data():
    """Create initial seed data for development."""

    # Ensure data directory exists
    data_dir = Path("./data")
    data_dir.mkdir(exist_ok=True)

    # Sample cases data
    cases_data = [
        {
            "id": "CASE-2024-0847",
            "investor_name": "Northwind Capital Partners Ltd",
            "investor_type": "Regulated Investment Fund",
            "jurisdiction": "Cayman Islands",
            "status": "In Review",
            "risk_rating": "Medium",
            "priority": "Medium",
            "assigned_to": "Sarah Chen",
            "completeness": 87,
            "stage": "Stage 6/7",
            "is_new": False,
            "created_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completeness_score": 87.0,
            "verification_status": "in_progress",
            "screening_status": "completed",
            "hitl_status": "pending",
            "tags": ["high-value", "regulated-fund"],
            "custom_fields": {}
        },
        {
            "id": "CASE-2024-0848",
            "investor_name": "Nordic Sovereign Wealth Fund",
            "investor_type": "Sovereign Wealth Fund",
            "jurisdiction": "Norway",
            "status": "Pending Docs",
            "risk_rating": "Low",
            "priority": "Medium",
            "assigned_to": "Mike Johnson",
            "completeness": 45,
            "stage": "Stage 2/7",
            "is_new": False,
            "created_at": (datetime.utcnow() - timedelta(days=8)).isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "completeness_score": 45.0,
            "verification_status": "pending",
            "screening_status": "pending",
            "hitl_status": "not_started",
            "tags": ["sovereign-wealth"],
            "custom_fields": {}
        },
        {
            "id": "CASE-2024-0849",
            "investor_name": "Sakura Pension Trust",
            "investor_type": "Pension Fund",
            "jurisdiction": "Japan",
            "status": "Approved",
            "risk_rating": "Low",
            "priority": "Low",
            "assigned_to": "Sarah Chen",
            "completeness": 100,
            "stage": "Stage 7/7",
            "is_new": False,
            "created_at": (datetime.utcnow() - timedelta(days=25)).isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "approved_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
            "completeness_score": 100.0,
            "verification_status": "completed",
            "screening_status": "completed",
            "hitl_status": "approved",
            "tags": ["pension-fund", "low-risk"],
            "custom_fields": {}
        }
    ]

    # Write cases data
    cases_file = data_dir / "cases.json"
    with open(cases_file, 'w', encoding='utf-8') as f:
        json.dump(cases_data, f, indent=2)
    print(f"✅ Created {cases_file} with {len(cases_data)} cases")

    # Sample documents data (empty initially)
    documents_data = []

    # Write documents data
    documents_file = data_dir / "documents.json"
    with open(documents_file, 'w', encoding='utf-8') as f:
        json.dump(documents_data, f, indent=2)
    print(f"✅ Created {documents_file}")

    print("\n🎉 Seed data created successfully!")
    print(f"📁 Data directory: {data_dir.absolute()}")


if __name__ == "__main__":
    create_seed_data()
