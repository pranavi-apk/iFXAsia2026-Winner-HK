"""
Dashboard statistics service - calculates real metrics from case and document data.
"""
from datetime import datetime, timedelta
from typing import Dict, Any
import logging
from app.core.storage import storage
from app.schemas.dashboard import DashboardStats, RiskDistribution
from app.schemas.case import CaseStatus

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for calculating dashboard statistics from real data."""

    CASES_COLLECTION = "cases"
    DOCUMENTS_COLLECTION = "documents"

    async def get_dashboard_stats(self) -> DashboardStats:
        """
        Calculate comprehensive dashboard statistics from real case and document data.

        Returns:
            DashboardStats: Complete dashboard statistics
        """
        logger.info("📊 Calculating dashboard statistics from real data...")

        # Get all cases and documents
        all_cases = await storage.get_all(self.CASES_COLLECTION)
        all_documents = await storage.get_all(self.DOCUMENTS_COLLECTION)

        # Initialize statistics
        stats = {
            'total_cases': len(all_cases),
            'cases_this_month': 0,
            'in_review': 0,
            'hitl_pending': 0,
            'approved': 0,
            'avg_completion_days': 0.0,
            'escalated': 0,
            'rejected': 0,
            'pending_docs': 0,
            'draft': 0,
            'on_hold': 0,
            'ai_classification_accuracy': 0.0,
            'screening_false_positive_rate': 0.0,
            'risk_distribution': {
                'low': 0,
                'medium': 0,
                'high': 0,
                'prohibited': 0
            },
            'total_documents_processed': 0,
            'total_documents_classified': 0,
            'total_screening_matches': 0,
            'auto_resolved_screenings': 0
        }

        # Calculate current month start
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)

        # Tracking variables
        total_completion_days = 0
        completed_count = 0

        # Create a map of case_id to pending HITL count
        hitl_pending_by_case = {}
        for doc in all_documents:
            case_id = doc.get('case_id')
            if case_id and doc.get('hitl_verified') == 'Pending':
                hitl_pending_by_case[case_id] = hitl_pending_by_case.get(case_id, 0) + 1

        # Process each case
        for case in all_cases:
            case_id = case.get('case_number') or case.get('id')
            case_hitl_pending = hitl_pending_by_case.get(case_id, 0)

            # Status counts
            status = case.get('status', '')

            # Check if case is "In Review" but all HITL items are completed
            if status == CaseStatus.IN_REVIEW:
                if case_hitl_pending == 0:
                    # All HITL items completed - count as approved/completed
                    stats['approved'] += 1
                else:
                    # Still has pending HITL items
                    stats['in_review'] += 1
                    stats['hitl_pending'] += case_hitl_pending
            elif status == CaseStatus.APPROVED:
                stats['approved'] += 1
            elif status == CaseStatus.ESCALATED:
                stats['escalated'] += 1
            elif status == CaseStatus.REJECTED:
                stats['rejected'] += 1
            elif status == CaseStatus.PENDING_DOCS:
                stats['pending_docs'] += 1
            elif status == CaseStatus.DRAFT:
                stats['draft'] += 1
            elif status == CaseStatus.ON_HOLD:
                stats['on_hold'] += 1

            # Cases this month
            created_at_str = case.get('created_at')
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                    if created_at >= month_start:
                        stats['cases_this_month'] += 1
                except (ValueError, TypeError):
                    pass

            # Average completion days (for approved cases)
            if case.get('approved_at') and case.get('created_at'):
                try:
                    created = datetime.fromisoformat(case['created_at'].replace('Z', '+00:00'))
                    approved = datetime.fromisoformat(case['approved_at'].replace('Z', '+00:00'))
                    days = (approved - created).days
                    total_completion_days += days
                    completed_count += 1
                except (ValueError, TypeError):
                    pass

            # Risk distribution
            risk_rating = case.get('risk_rating', '').lower()
            if risk_rating == 'low':
                stats['risk_distribution']['low'] += 1
            elif risk_rating == 'medium':
                stats['risk_distribution']['medium'] += 1
            elif risk_rating == 'high':
                stats['risk_distribution']['high'] += 1
            # Note: "prohibited" risk level would be mapped from case data
            # For now, we'll consider "critical" priority + high risk as prohibited
            if case.get('priority') == 'Critical' and risk_rating == 'high':
                stats['risk_distribution']['prohibited'] += 1
                stats['risk_distribution']['high'] -= 1  # Adjust the high count

        # Calculate average completion days
        if completed_count > 0:
            stats['avg_completion_days'] = round(total_completion_days / completed_count, 1)

        # Process documents for AI metrics
        total_docs = len(all_documents)
        classified_correctly = 0
        total_screening_hits = 0
        auto_resolved = 0

        for doc in all_documents:
            # Count processed documents (those with extracted_data or ai_classification not "Unknown")
            ai_classification = doc.get('ai_classification', 'Unknown')
            has_extracted_data = doc.get('extracted_data') and len(doc.get('extracted_data', {})) > 0

            if has_extracted_data or (ai_classification and ai_classification != 'Unknown'):
                stats['total_documents_processed'] += 1

            # AI Classification Accuracy
            # We consider a document correctly classified if:
            # 1. It has an ai_classification that's not "Unknown"
            # 2. It has a confidence score above 0.7 (70%) OR has been verified by HITL
            confidence = doc.get('confidence', 0)
            hitl_verified = doc.get('hitl_verified', 'Pending')

            if ai_classification and ai_classification != 'Unknown':
                # If confidence is high enough or verified by human
                if confidence >= 0.7 or hitl_verified == 'Verified':
                    classified_correctly += 1
                # If confidence is moderate (40-70%) and document_type matches, consider it correct
                elif confidence >= 0.4 and doc.get('document_type') and doc.get('document_type') != 'Unknown':
                    classified_correctly += 1

            # Screening metrics
            screening_results = doc.get('screening_results', {})
            if screening_results:
                # Count total screening matches
                sanctions = screening_results.get('sanctions', [])
                pep = screening_results.get('pep', [])
                adverse_media = screening_results.get('adverse_media', [])

                total_matches = len(sanctions) + len(pep) + len(adverse_media)
                total_screening_hits += total_matches

                # Count auto-resolved (matches with low risk or cleared status)
                for match in sanctions + pep + adverse_media:
                    if match.get('auto_resolved', False) or match.get('risk_level') == 'low':
                        auto_resolved += 1

        # Calculate AI classification accuracy
        if stats['total_documents_processed'] > 0:
            stats['ai_classification_accuracy'] = round(
                (classified_correctly / stats['total_documents_processed']) * 100,
                1
            )
            stats['total_documents_classified'] = classified_correctly

        # Calculate screening false positive rate
        if total_screening_hits > 0:
            stats['screening_false_positive_rate'] = round(
                (auto_resolved / total_screening_hits) * 100,
                1
            )
            stats['total_screening_matches'] = total_screening_hits
            stats['auto_resolved_screenings'] = auto_resolved

        logger.info(f"✅ Dashboard statistics calculated: {stats['total_cases']} cases, "
                   f"{stats['total_documents_processed']} documents processed, "
                   f"{stats['ai_classification_accuracy']}% AI accuracy")

        return DashboardStats(**stats)


dashboard_service = DashboardService()
