"""
Case management service.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from app.core.storage import storage
from app.schemas.case import Case, CaseCreate, CaseUpdate, CaseStats, CaseStatus

logger = logging.getLogger(__name__)


class CaseService:
    """Service for managing cases."""

    COLLECTION = "cases"

    @staticmethod
    def _generate_case_id() -> str:
        """Generate a unique case ID."""
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        import random
        random_suffix = random.randint(1000, 9999)
        year = datetime.now().year
        return f"CASE-{year}-{random_suffix}"

    async def get_all_cases(self, skip: int = 0, limit: int = 100) -> List[Case]:
        """Get all cases with pagination."""
        cases_data = await storage.get_all(self.COLLECTION)

        # Sort by created_at descending (newest first)
        cases_data.sort(
            key=lambda x: x.get('created_at', ''),
            reverse=True
        )

        # Apply pagination
        paginated_data = cases_data[skip:skip + limit]

        return [Case(**case) for case in paginated_data]

    async def get_case_by_id(self, case_id: str) -> Optional[Case]:
        """Get a specific case by ID."""
        case_data = await storage.get_by_id(self.COLLECTION, case_id)
        if case_data:
            return Case(**case_data)
        return None

    async def create_case(self, case_create: CaseCreate) -> Case:
        """Create a new case."""
        # Generate case ID
        case_id = self._generate_case_id()

        logger.info(f"Creating new case: {case_id} - Investor: {case_create.investor_name}")

        # Prepare case data
        case_data = case_create.model_dump()
        case_data['id'] = case_id
        case_data['is_new'] = True
        case_data['created_at'] = datetime.utcnow().isoformat()
        case_data['updated_at'] = datetime.utcnow().isoformat()

        # Calculate SLA deadline (72 hours from now)
        case_data['sla_deadline'] = (
            datetime.utcnow() + timedelta(hours=72)
        ).isoformat()

        # Create in storage
        created_data = await storage.create(self.COLLECTION, case_data)

        logger.info(f"Case created successfully: {case_id}")

        return Case(**created_data)

    async def update_case(
        self,
        case_id: str,
        case_update: CaseUpdate
    ) -> Optional[Case]:
        """Update an existing case."""
        # Get only the fields that were set
        update_data = case_update.model_dump(exclude_unset=True)

        if not update_data:
            return await self.get_case_by_id(case_id)

        updated_data = await storage.update(self.COLLECTION, case_id, update_data)

        if updated_data:
            return Case(**updated_data)
        return None

    async def delete_case(self, case_id: str) -> bool:
        """Delete a case."""
        return await storage.delete(self.COLLECTION, case_id)

    async def get_stats(self) -> CaseStats:
        """Get case statistics for dashboard."""
        all_cases = await storage.get_all(self.COLLECTION)

        stats = {
            'total_cases': len(all_cases),
            'in_review': 0,
            'approved': 0,
            'escalated': 0,
            'pending_docs': 0,
            'hitl_pending': 0,
            'avg_completion_days': 0.0,
        }

        total_days = 0
        completed_count = 0

        for case in all_cases:
            status = case.get('status', '')

            if status == CaseStatus.IN_REVIEW:
                stats['in_review'] += 1
            elif status == CaseStatus.APPROVED:
                stats['approved'] += 1
            elif status == CaseStatus.ESCALATED:
                stats['escalated'] += 1
            elif status == CaseStatus.PENDING_DOCS:
                stats['pending_docs'] += 1

            # Count HITL pending
            if case.get('hitl_status') == 'pending':
                stats['hitl_pending'] += 1

            # Calculate average completion days
            if case.get('approved_at') and case.get('created_at'):
                try:
                    created = datetime.fromisoformat(case['created_at'])
                    approved = datetime.fromisoformat(case['approved_at'])
                    days = (approved - created).days
                    total_days += days
                    completed_count += 1
                except (ValueError, TypeError):
                    pass

        if completed_count > 0:
            stats['avg_completion_days'] = round(total_days / completed_count, 1)

        return CaseStats(**stats)

    async def mark_as_viewed(self, case_id: str) -> Optional[Case]:
        """Mark a case as viewed (remove 'new' flag)."""
        update_data = {'is_new': False}
        return await self.update_case(case_id, CaseUpdate(**update_data))


case_service = CaseService()
