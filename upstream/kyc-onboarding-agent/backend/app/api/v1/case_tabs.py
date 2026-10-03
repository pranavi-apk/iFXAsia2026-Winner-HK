"""
Case Tab Endpoints - Completeness, Verification, UBO, Screening, Risk, HITL, Audit
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.services.case_service import case_service


router = APIRouter()


@router.get(
    "/{case_id}/completeness",
    summary="Get completeness check results",
    description="Get document completeness status for a case"
)
async def get_case_completeness(case_id: str):
    """Get completeness check results for a case - reads from AI assessment results."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # If assessment has been run, return those results
    if case.assessment_results and 'completeness' in case.assessment_results:
        completeness_data = case.assessment_results['completeness']

        # Map missing documents to required_documents format
        required_documents = []
        for missing_doc in completeness_data.get('missing_documents', []):
            # Determine category based on document type
            category = "Corporate Formation"
            if "Passport" in missing_doc or "ID" in missing_doc:
                category = "Identity"
            elif "Financial" in missing_doc:
                category = "Financial"
            elif "Regulatory" in missing_doc or "License" in missing_doc:
                category = "Regulatory"

            required_documents.append({
                "category": category,
                "document_type": missing_doc,
                "status": "missing",
                "document_id": None
            })

        # Add received documents from documents_analyzed
        if 'documents_analyzed' in case.assessment_results:
            for doc in case.assessment_results['documents_analyzed']:
                category = "Corporate Formation"
                doc_type = doc.get('classification', 'Unknown')
                if "Passport" in doc_type or "ID" in doc_type:
                    category = "Identity"
                elif "Financial" in doc_type:
                    category = "Financial"
                elif "Regulatory" in doc_type or "License" in doc_type:
                    category = "Regulatory"

                required_documents.append({
                    "category": category,
                    "document_type": doc_type,
                    "status": "received",
                    "document_id": doc.get('id')
                })

        return {
            "case_id": case_id,
            "completeness_score": float(completeness_data.get('score', 0)),
            "required_documents": required_documents,
            "missing_count": len(completeness_data.get('missing_documents', [])),
            "total_required": completeness_data.get('required_count', 5)
        }

    # Fallback: compute from documents if no assessment run yet
    from app.services.document_service import document_service
    documents = await document_service.get_all_documents(case_id=case_id)

    required_types = [
        {"category": "Corporate Formation", "document_type": "Certificate of Incorporation"},
        {"category": "Corporate Formation", "document_type": "Articles of Association"},
        {"category": "Corporate Formation", "document_type": "Board Resolution"},
        {"category": "Identity", "document_type": "Passport/ID"},
        {"category": "Financial", "document_type": "Financial Statement"},
    ]

    uploaded_types = {doc.ai_classification for doc in documents if doc.ai_classification}
    required_documents = []
    missing_count = 0

    for req in required_types:
        matching_doc = next((doc for doc in documents if doc.ai_classification == req["document_type"]), None)
        if matching_doc:
            required_documents.append({
                "category": req["category"],
                "document_type": req["document_type"],
                "status": "received",
                "document_id": matching_doc.id
            })
        else:
            required_documents.append({
                "category": req["category"],
                "document_type": req["document_type"],
                "status": "missing",
                "document_id": None
            })
            missing_count += 1

    return {
        "case_id": case_id,
        "completeness_score": float(case.completeness_score),
        "required_documents": required_documents,
        "missing_count": missing_count,
        "total_required": len(required_types)
    }


@router.get(
    "/{case_id}/verification",
    summary="Get verification results",
    description="Get cross-document verification results"
)
async def get_case_verification(case_id: str):
    """Get verification results for a case - reads from AI assessment results."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # If assessment has been run, return those results
    if case.assessment_results and 'verification' in case.assessment_results:
        verification_data = case.assessment_results['verification']

        return {
            "case_id": case_id,
            "verification_status": case.verification_status,
            "cross_checks": verification_data.get('checks', []),
            "total_checks": len(verification_data.get('checks', [])),
            "passed": verification_data.get('passed', 0),
            "flagged": verification_data.get('failed', 0)
        }

    # Fallback: return empty state if no assessment run yet
    return {
        "case_id": case_id,
        "verification_status": case.verification_status,
        "cross_checks": [],
        "total_checks": 0,
        "passed": 0,
        "flagged": 0
    }


@router.get(
    "/{case_id}/ubo",
    summary="Get UBO structure",
    description="Get Ultimate Beneficial Owner structure"
)
async def get_case_ubo(case_id: str):
    """Get UBO structure for a case - reads from AI assessment results."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # If assessment has been run, return those results
    if case.assessment_results and 'ubo_structure' in case.assessment_results:
        ubo_data = case.assessment_results['ubo_structure']

        # Build UBO entities list from shareholders and directors
        ubo_entities = []
        entity_id = 1

        # Add company as root
        ubo_entities.append({
            "id": entity_id,
            "entity_name": case.investor_name,
            "entity_type": "company",
            "ownership_percentage": 100.0,
            "level": 0,
            "parent_id": None
        })
        entity_id += 1

        # Add shareholders
        for shareholder in ubo_data.get('shareholders', []):
            ubo_entities.append({
                "id": entity_id,
                "entity_name": shareholder,
                "entity_type": "shareholder",
                "ownership_percentage": None,  # Would need to extract from documents
                "level": 1,
                "parent_id": 1
            })
            entity_id += 1

        # Add directors
        for director in ubo_data.get('directors', []):
            ubo_entities.append({
                "id": entity_id,
                "entity_name": director,
                "entity_type": "director",
                "ownership_percentage": None,
                "level": 1,
                "parent_id": 1
            })
            entity_id += 1

        # Calculate complexity score
        complexity_map = {
            "Simple": 1.0,
            "Moderate": 2.0,
            "Complex": 3.0
        }
        complexity_score = complexity_map.get(ubo_data.get('ownership_structure', 'Simple'), 1.0)

        return {
            "case_id": case_id,
            "ubo_entities": ubo_entities,
            "complexity_score": complexity_score,
            "ubo_count": len(ubo_entities) - 1  # Exclude company itself
        }

    # Fallback: return minimal structure
    return {
        "case_id": case_id,
        "ubo_entities": [
            {
                "id": 1,
                "entity_name": case.investor_name,
                "entity_type": "company",
                "ownership_percentage": 100.0,
                "level": 0,
                "parent_id": None
            }
        ],
        "complexity_score": 1.0,
        "ubo_count": 0
    }


@router.get(
    "/{case_id}/screening",
    summary="Get screening results",
    description="Get sanctions and PEP screening results"
)
async def get_case_screening(case_id: str):
    """Get screening results for a case - returns empty state for new cases."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # Return empty state - would integrate with actual screening system
    return {
        "case_id": case_id,
        "screening_status": case.screening_status,
        "total_entities_screened": 0,
        "matches": [],
        "sanctions_matches": 0,
        "pep_matches": 0,
        "adverse_media_matches": 0
    }


@router.get(
    "/{case_id}/risk",
    summary="Get risk assessment",
    description="Get AI-powered risk assessment"
)
async def get_case_risk(case_id: str):
    """Get risk assessment for a case - reads from AI assessment results."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # If assessment has been run, return those results
    if case.assessment_results and 'risk_assessment' in case.assessment_results:
        risk_data = case.assessment_results['risk_assessment']

        # Build risk factors breakdown from assessment factors
        risk_factors = {
            "jurisdictional_risk": 0.0,
            "industry_risk": 0.0,
            "screening_risk": 0.0,
            "complexity_risk": 0.0
        }

        # Map assessment factors to frontend risk categories
        for factor in risk_data.get('factors', []):
            factor_name = factor.get('factor', '')
            factor_score = factor.get('score', 0.0)

            if 'Authenticity' in factor_name:
                risk_factors['jurisdictional_risk'] = factor_score
            elif 'Verification' in factor_name:
                risk_factors['screening_risk'] = factor_score

        # Generate AI analysis summary
        key_concerns = []
        mitigating_factors = []

        for factor in risk_data.get('factors', []):
            if factor.get('score', 0) > 3:
                key_concerns.append(f"{factor['factor']}: {factor['score']}/10")
            elif factor.get('score', 0) < 2:
                mitigating_factors.append(f"Low {factor['factor']}")

        return {
            "case_id": case_id,
            "overall_risk_score": float(risk_data.get('overall_score', 0)),
            "risk_level": risk_data.get('level', 'Unknown').lower(),
            "risk_factors": risk_factors,
            "ai_analysis": {
                "summary": f"Risk level: {risk_data.get('level', 'Unknown')}. Recommendation: {risk_data.get('recommendation', 'Review Required')}",
                "key_concerns": key_concerns,
                "mitigating_factors": mitigating_factors
            },
            "assessed_at": case.assessment_results.get('assessment_timestamp', case.updated_at.isoformat() if case.updated_at else None)
        }

    # Fallback: return minimal risk data if no assessment run yet
    risk_score = float(case.risk_score) if case.risk_score else 0.0
    risk_level = case.risk_rating.lower() if hasattr(case.risk_rating, 'lower') else "unknown"

    return {
        "case_id": case_id,
        "overall_risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": {
            "jurisdictional_risk": 0.0,
            "industry_risk": 0.0,
            "screening_risk": 0.0,
            "complexity_risk": 0.0
        },
        "ai_analysis": {
            "summary": "Risk assessment pending - upload documents and run AI assessment",
            "key_concerns": [],
            "mitigating_factors": []
        },
        "assessed_at": case.updated_at.isoformat() if case.updated_at else None
    }


@router.get(
    "/{case_id}/hitl",
    summary="Get HITL review status",
    description="Get Human-in-the-Loop review status"
)
async def get_case_hitl(case_id: str):
    """Get HITL review status for a case - reads from AI assessment results."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # If assessment has been run, return those results
    if case.assessment_results and 'hitl_items' in case.assessment_results:
        hitl_items = case.assessment_results['hitl_items']

        # Convert HITL items to review format
        reviews = []
        for idx, item in enumerate(hitl_items, start=1):
            reviews.append({
                "id": idx,
                "type": item.get('type', 'Unknown'),
                "item": item.get('item', ''),
                "reason": item.get('reason', ''),
                "severity": item.get('severity', 'Medium'),
                "confidence": item.get('confidence'),  # AI classification confidence
                "classification": item.get('classification'),  # What AI classified it as
                "authenticity": item.get('authenticity'),  # Document authenticity score
                "ai_status": item.get('ai_status'),  # For compliance verifications
                "status": "pending",  # All new items are pending
                "reviewed_by": None,
                "reviewed_at": None
            })

        return {
            "case_id": case_id,
            "hitl_status": case.hitl_status,
            "reviews": reviews,
            "pending_reviews": len(reviews),
            "completed_reviews": 0
        }

    # Fallback: return empty state if no assessment run yet
    return {
        "case_id": case_id,
        "hitl_status": case.hitl_status,
        "reviews": [],
        "pending_reviews": 0,
        "completed_reviews": 0
    }


@router.get(
    "/{case_id}/audit",
    summary="Get audit trail",
    description="Get complete audit trail for a case"
)
async def get_case_audit(case_id: str):
    """Get audit trail for a case - shows real case lifecycle events."""
    case = await case_service.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found"
        )

    # Get real document events
    from app.services.document_service import document_service
    documents = await document_service.get_all_documents(case_id=case_id)

    audit_logs = [
        {
            "id": 1,
            "timestamp": case.created_at.isoformat() if case.created_at else None,
            "user": "System",
            "action": "case_created",
            "entity_type": "case",
            "entity_id": case_id,
            "changes": {
                "investor_name": case.investor_name,
                "status": str(case.status)
            }
        }
    ]

    # Add document upload events
    for idx, doc in enumerate(documents, start=2):
        audit_logs.append({
            "id": idx,
            "timestamp": doc.created_at.isoformat() if doc.created_at else None,
            "user": doc.uploaded_by or "System",
            "action": "document_uploaded",
            "entity_type": "document",
            "entity_id": doc.id,
            "changes": {
                "filename": doc.filename,
                "document_type": doc.ai_classification
            }
        })

    return {
        "case_id": case_id,
        "audit_logs": audit_logs,
        "total_events": len(audit_logs)
    }
