"""
Comprehensive AI Assessment Service - handles complete case analysis.
"""
import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class ComprehensiveAssessment:
    """
    Complete AI-powered assessment of investor onboarding case.

    Performs:
    1. Document parsing & classification
    2. Completeness checking
    3. Cross-document verification
    4. UBO structure extraction
    5. Risk scoring
    6. HITL flagging
    """

    async def run_full_assessment(
        self,
        case_id: str,
        documents: List[Any]
    ) -> Dict[str, Any]:
        """
        Run complete AI assessment on a case.

        Returns comprehensive results including:
        - Document classifications and extracted data
        - Completeness score and missing documents
        - Verification results
        - UBO structure
        - Risk assessment
        - HITL review items
        """
        logger.info(f"🚀 Starting COMPREHENSIVE assessment for case {case_id}")

        results = {
            'case_id': case_id,
            'assessment_timestamp': datetime.utcnow().isoformat(),
            'documents_analyzed': [],
            'completeness': {},
            'verification': {},
            'ubo_structure': {},
            'risk_assessment': {},
            'hitl_items': [],
            'summary': {}
        }

        # Step 1: Parse and classify all documents with OpenAI
        logger.info("📄 Step 1/6: Parsing documents with OpenAI...")
        doc_results = await self._parse_all_documents(documents)
        results['documents_analyzed'] = doc_results

        # Step 2: Calculate completeness
        logger.info("📊 Step 2/6: Calculating completeness...")
        results['completeness'] = await self._calculate_completeness(doc_results)

        # Step 3: Cross-document verification
        logger.info("✓ Step 3/6: Performing verification checks...")
        results['verification'] = await self._perform_verification(doc_results)

        # Step 4: Extract UBO structure
        logger.info("🏢 Step 4/6: Extracting UBO structure...")
        results['ubo_structure'] = await self._extract_ubo(doc_results)

        # Step 5: Calculate risk score
        logger.info("⚠️  Step 5/6: Calculating risk score...")
        results['risk_assessment'] = await self._calculate_risk(doc_results, results['verification'])

        # Step 6: Flag HITL items
        logger.info("👁️  Step 6/6: Flagging HITL review items...")
        results['hitl_items'] = await self._flag_hitl_items(doc_results, results)

        # Generate summary
        results['summary'] = {
            'total_documents': len(doc_results),
            'completeness_score': results['completeness'].get('score', 0),
            'verification_passed': results['verification'].get('passed', 0),
            'verification_failed': results['verification'].get('failed', 0),
            'risk_score': results['risk_assessment'].get('overall_score', 0),
            'risk_level': results['risk_assessment'].get('level', 'Unknown'),
            'hitl_required': len(results['hitl_items']) > 0,
            'hitl_count': len(results['hitl_items'])
        }

        logger.info(f"✅ COMPREHENSIVE assessment complete: {results['summary']}")

        return results

    async def _parse_all_documents(self, documents: List[Any]) -> List[Dict[str, Any]]:
        """Parse all documents and extract structured data. Only classify unclassified documents."""
        from app.services.document_service import document_service

        parsed_docs = []
        classified_count = 0
        skipped_count = 0

        for doc in documents:
            # Only classify if document is uploaded but not yet classified
            # Skip documents that are already classified to avoid reprocessing
            needs_classification = (
                doc.status.value.lower() == "uploaded" and
                (not doc.ai_classification or doc.ai_classification == "Unknown")
            )

            if needs_classification:
                logger.info(f"📄 Classifying NEW document: {doc.filename} (ID: {doc.id})")
                updated_doc = await document_service.classify_document(doc.id)
                if updated_doc:
                    doc = updated_doc
                    classified_count += 1
            else:
                # Skip already classified documents
                logger.info(f"⏩ SKIPPING already classified document: {doc.filename} (status: {doc.status.value}, classification: {doc.ai_classification})")
                skipped_count += 1

            parsed_docs.append({
                'id': doc.id,
                'filename': doc.filename,
                'classification': doc.ai_classification,
                'confidence': doc.confidence,
                'extracted_data': doc.extracted_data or {},
                'ocr_text': doc.ocr_text,
                'authenticity': doc.authenticity,
                'status': doc.status.value
            })

        logger.info(f"📊 Classification summary: {classified_count} newly classified, {skipped_count} skipped (already classified)")
        return parsed_docs

    async def _calculate_completeness(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Calculate document completeness.

        Required documents:
        - Certificate of Incorporation
        - Board Resolution
        - Financial Statement
        - Proof of Identity
        - Proof of Address
        """
        # Define required document types with their acceptable variations
        required_docs = {
            'Certificate of Incorporation': ['certificate', 'incorporation', 'certificate of incorporation'],
            'Board Resolution': ['board', 'resolution', 'board resolution', '8-k', 'form 8-k', '8k', 'bylaws', 'bylaw', 'articles of association', 'articles'],
            'Financial Statement': ['financial', 'audit', 'financials', 'audited', 'financial statement', '10-k', '10-q'],
            'Passport/ID': ['passport', 'national id', 'id', 'identity', 'drivers license', 'driver'],
            'Proof of Address': ['address', 'utility', 'bank statement', 'proof of address']
        }

        received_types = [doc['classification'].lower() for doc in documents]

        missing = []
        for req_name, variations in required_docs.items():
            # Check if any variation matches any received document
            found = False
            for received in received_types:
                if any(variation in received for variation in variations):
                    found = True
                    break
            if not found:
                missing.append(req_name)

        score = int(((len(required_docs) - len(missing)) / len(required_docs)) * 100)

        return {
            'score': score,
            'required_count': len(required_docs),
            'received_count': len(required_docs) - len(missing),
            'missing_documents': missing,
            'status': 'Complete' if score == 100 else 'Incomplete'
        }

    async def _perform_verification(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Perform cross-document verification checks.

        Checks:
        - Company name consistency across documents
        - Address consistency
        - Date consistency
        - Director name consistency
        """
        checks = []

        # Extract company names from all documents
        company_names = []
        for doc in documents:
            extracted = doc.get('extracted_data', {})
            if extracted.get('company_name'):
                company_names.append(extracted['company_name'])

        # Check consistency
        if len(set(company_names)) > 1:
            checks.append({
                'check': 'Company Name Consistency',
                'status': 'Failed',
                'issue': f"Multiple company names found: {list(set(company_names))}"
            })
        elif company_names:
            checks.append({
                'check': 'Company Name Consistency',
                'status': 'Passed',
                'value': company_names[0]
            })

        # Extract addresses
        addresses = []
        for doc in documents:
            extracted = doc.get('extracted_data', {})
            if extracted.get('registered_address'):
                addresses.append(extracted['registered_address'])

        if len(set(addresses)) > 1:
            checks.append({
                'check': 'Address Consistency',
                'status': 'Failed',
                'issue': f"Multiple addresses found"
            })
        elif addresses:
            checks.append({
                'check': 'Address Consistency',
                'status': 'Passed',
                'value': addresses[0]
            })

        passed = len([c for c in checks if c['status'] == 'Passed'])
        failed = len([c for c in checks if c['status'] == 'Failed'])

        return {
            'checks': checks,
            'passed': passed,
            'failed': failed,
            'pass_rate': int((passed / len(checks) * 100)) if checks else 0
        }

    async def _extract_ubo(self, documents: List[Dict]) -> Dict[str, Any]:
        """
        Extract UBO (Ultimate Beneficial Owner) structure from documents.

        Looks for:
        - Shareholders
        - Directors
        - Beneficial owners
        """
        ubo_data = {
            'shareholders': [],
            'directors': [],
            'beneficial_owners': [],
            'ownership_structure': 'Simple'
        }

        for doc in documents:
            extracted = doc.get('extracted_data', {})

            # Extract shareholders
            if extracted.get('shareholders'):
                ubo_data['shareholders'].extend(extracted['shareholders'])

            # Extract directors
            if extracted.get('directors'):
                ubo_data['directors'].extend(extracted['directors'])

        # Remove duplicates
        ubo_data['shareholders'] = list(set(ubo_data['shareholders']))
        ubo_data['directors'] = list(set(ubo_data['directors']))

        # Determine ownership structure complexity
        if len(ubo_data['shareholders']) > 5:
            ubo_data['ownership_structure'] = 'Complex'
        elif len(ubo_data['shareholders']) > 2:
            ubo_data['ownership_structure'] = 'Moderate'

        return ubo_data

    async def _calculate_risk(
        self,
        documents: List[Dict],
        verification: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive risk score.

        Factors:
        - Document authenticity scores
        - Verification failures
        - Jurisdiction risk
        - Document completeness
        """
        risk_factors = []

        # Factor 1: Document authenticity
        avg_authenticity = sum(doc['authenticity'] for doc in documents) / len(documents) if documents else 0
        auth_risk = (100 - avg_authenticity) / 10  # 0-10 scale
        risk_factors.append({
            'factor': 'Document Authenticity',
            'score': round(auth_risk, 1),
            'weight': 0.3
        })

        # Factor 2: Verification failures
        ver_risk = (verification.get('failed', 0) / max(verification.get('failed', 0) + verification.get('passed', 1), 1)) * 10
        risk_factors.append({
            'factor': 'Verification Issues',
            'score': round(ver_risk, 1),
            'weight': 0.3
        })

        # Factor 3: Completeness
        # (Will add when we have completeness data)

        # Calculate weighted overall score
        overall_score = sum(f['score'] * f['weight'] for f in risk_factors)

        # Determine risk level
        if overall_score < 2:
            level = 'Low'
        elif overall_score < 4:
            level = 'Medium'
        elif overall_score < 7:
            level = 'High'
        else:
            level = 'Critical'

        return {
            'overall_score': round(overall_score, 2),
            'level': level,
            'factors': risk_factors,
            'recommendation': 'Approve' if overall_score < 3 else 'Review Required' if overall_score < 6 else 'Reject'
        }

    async def _flag_hitl_items(
        self,
        documents: List[Dict],
        full_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Flag items requiring Human-in-the-Loop review.

        Flag when:
        - Confidence < 93% (Low: <85%, Medium: 85-92%)
        - Verification failures
        - High risk score
        - Critical compliance fields (company name, address) - ALWAYS flagged
        - Low authenticity scores

        Uses OpenAI to generate detailed reasoning for each flagged item.
        """
        hitl_items = []

        # Import OpenAI for generating detailed explanations
        from app.core.config import settings
        from openai import OpenAI

        client = None
        if settings.OPENAI_API_KEY:
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize OpenAI client: {e}")

        # ALWAYS flag critical compliance verifications for human review
        # This is best practice even if AI is 100% confident
        for check in full_results['verification'].get('checks', []):
            if check['check'] in ['Company Name Consistency', 'Address Consistency']:
                if check['status'] == 'Passed':
                    # Generate detailed AI reasoning for compliance verification
                    ai_reasoning = self._generate_ai_reasoning(
                        client,
                        "compliance_verification",
                        {},
                        context=f"{check['check']}: {check.get('value', 'N/A')}"
                    )

                    hitl_items.append({
                        'type': 'Compliance Verification',
                        'item': check['check'],
                        'reason': ai_reasoning,
                        'severity': 'Low',
                        'ai_status': check['status'],
                        'value': check.get('value', 'N/A')
                    })

        # Flag low confidence documents (< 85%)
        for doc in documents:
            if doc['confidence'] < 85:
                # Generate detailed AI reasoning for low confidence
                ai_reasoning = self._generate_ai_reasoning(
                    client,
                    "low_confidence",
                    doc
                )

                hitl_items.append({
                    'type': 'Low Confidence Classification',
                    'item': doc['filename'],
                    'reason': ai_reasoning,
                    'severity': 'High',
                    'confidence': doc['confidence'],
                    'classification': doc['classification'],
                    'authenticity': doc['authenticity']
                })
            # Flag medium confidence documents (85-92%)
            elif doc['confidence'] < 93:
                # Generate detailed AI reasoning for medium confidence
                ai_reasoning = self._generate_ai_reasoning(
                    client,
                    "medium_confidence",
                    doc
                )

                hitl_items.append({
                    'type': 'Medium Confidence Classification',
                    'item': doc['filename'],
                    'reason': ai_reasoning,
                    'severity': 'Medium',
                    'confidence': doc['confidence'],
                    'classification': doc['classification'],
                    'authenticity': doc['authenticity']
                })

        # Flag low authenticity documents
        for doc in documents:
            if doc['authenticity'] < 90:
                # Generate detailed AI reasoning for authenticity concerns
                ai_reasoning = self._generate_ai_reasoning(
                    client,
                    "low_authenticity",
                    doc
                )

                hitl_items.append({
                    'type': 'Document Authenticity Concern',
                    'item': doc['filename'],
                    'reason': ai_reasoning,
                    'severity': 'High' if doc['authenticity'] < 80 else 'Medium',
                    'confidence': doc['confidence'],
                    'classification': doc['classification'],
                    'authenticity': doc['authenticity']
                })

        # Flag verification failures
        for check in full_results['verification'].get('checks', []):
            if check['status'] == 'Failed':
                hitl_items.append({
                    'type': 'Verification Failure',
                    'item': check['check'],
                    'reason': check.get('issue', 'Verification check failed'),
                    'severity': 'High'
                })

        # Flag high risk
        if full_results['risk_assessment'].get('overall_score', 0) >= 6:
            hitl_items.append({
                'type': 'High Risk Score',
                'item': 'Overall Risk Assessment',
                'reason': f"Risk score {full_results['risk_assessment']['overall_score']} ({full_results['risk_assessment']['level']})",
                'severity': 'High'
            })

        return hitl_items

    def _generate_ai_reasoning(
        self,
        client,
        issue_type: str,
        document: Dict[str, Any],
        context: str = ""
    ) -> str:
        """
        Generate detailed AI reasoning for a HITL item using OpenAI.

        Args:
            client: OpenAI client
            issue_type: Type of issue (low_confidence, medium_confidence, low_authenticity, etc.)
            document: Document data
            context: Additional context about the issue

        Returns:
            Detailed AI-generated reasoning for human reviewer
        """
        if not client:
            return f"Document requires review: {context}"

        try:
            # Build prompt based on issue type
            if issue_type == "low_confidence":
                prompt = f"""As an AI compliance analyst, provide a detailed explanation for why this document classification requires human review:

Document: {document.get('filename', 'Unknown')}
AI Classification: {document.get('classification', 'Unknown')}
Confidence Score: {document.get('confidence', 0)}%
Authenticity Score: {document.get('authenticity', 0)}%

The confidence score is below 85%, indicating the AI is not certain about the classification.

Provide a professional explanation for a human reviewer covering:
1. Why the low confidence score is concerning
2. What ambiguities or inconsistencies the AI detected
3. What the human reviewer should specifically verify
4. Potential consequences of misclassification

Keep it concise (3-4 sentences) and actionable."""

            elif issue_type == "medium_confidence":
                prompt = f"""As an AI compliance analyst, provide a detailed explanation for why this document classification should be verified by a human:

Document: {document.get('filename', 'Unknown')}
AI Classification: {document.get('classification', 'Unknown')}
Confidence Score: {document.get('confidence', 0)}%
Authenticity Score: {document.get('authenticity', 0)}%

The confidence score is between 85-92%, suggesting reasonable certainty but not absolute confidence.

Provide a professional explanation for a human reviewer covering:
1. Why this confidence level warrants human verification
2. What specific elements the human should verify
3. What documents this could potentially be confused with
4. Recommended verification steps

Keep it concise (3-4 sentences) and actionable."""

            elif issue_type == "low_authenticity":
                prompt = f"""As an AI compliance analyst, provide a detailed explanation for why this document's authenticity requires human review:

Document: {document.get('filename', 'Unknown')}
AI Classification: {document.get('classification', 'Unknown')}
Confidence Score: {document.get('confidence', 0)}%
Authenticity Score: {document.get('authenticity', 0)}%

The authenticity score is below 90%, indicating potential concerns about document validity.

Provide a professional explanation for a human reviewer covering:
1. What authenticity concerns were detected
2. Specific elements that raised red flags (e.g., inconsistent fonts, metadata issues, quality concerns)
3. What the human reviewer should examine closely
4. Potential risks if this document is fraudulent

Keep it concise (3-4 sentences) and actionable."""

            elif issue_type == "compliance_verification":
                prompt = f"""As an AI compliance analyst, explain why this critical compliance field requires mandatory human verification:

Verification Check: {context}
AI Status: Passed

This is a critical compliance field (company name or address) that requires human eyes even when AI verification passes.

Provide a professional explanation for a human reviewer covering:
1. Why human verification is mandatory for this field (regulatory/compliance reasons)
2. What the human should specifically verify
3. What discrepancies to look for
4. Consequences of incorrect information

Keep it concise (2-3 sentences) and actionable."""

            else:
                return context

            # Call OpenAI to generate reasoning
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert AML/KYC compliance analyst providing clear, actionable guidance to human reviewers."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"Error generating AI reasoning: {e}")
            return f"Document requires review: {context}"


# Singleton instance
_assessment_service: ComprehensiveAssessment = None


def get_assessment_service() -> ComprehensiveAssessment:
    """Get or create comprehensive assessment service."""
    global _assessment_service
    if _assessment_service is None:
        _assessment_service = ComprehensiveAssessment()
    return _assessment_service
