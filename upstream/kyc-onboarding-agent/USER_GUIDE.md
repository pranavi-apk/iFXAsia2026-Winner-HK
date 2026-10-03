# the global bank KYC Onboarding Demo - User Guide

## Welcome to the KYC/AML Compliance Platform

This guide will help you navigate and use the the global bank Investor Risk Assessment platform for institutional investor onboarding.

---

## 🌐 Accessing the Application

**Application URL**: http://localhost:8080

**API Documentation**: http://localhost:8080/api/docs

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Cases](#managing-cases)
4. [Document Management](#document-management)
5. [Case Details & Tabs](#case-details--tabs)
6. [Understanding Risk Levels](#understanding-risk-levels)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Login

1. **Open the Application**
   - Navigate to: http://localhost:8080
   - The dashboard will load automatically

2. **Dashboard Overview**
   - You'll see the main dashboard with active cases
   - Key metrics are displayed at the top
   - Active cases are listed in a table format

### Navigation

The application has a clean, intuitive interface:
- **Dashboard** - Main view showing all active cases
- **Case Details** - Click on any case to view detailed information
- **Search & Filter** - Use the search bar to find specific cases
- **Create Case** - Click "Create New Case" to onboard a new investor

---

## Dashboard Overview

### Main Dashboard Components

#### 1. **Dashboard Header**
   - Application title and logo
   - Quick statistics overview
   - Create new case button

#### 2. **Key Metrics Cards**
   - **Total Cases**: Total number of investor cases
   - **Pending Review**: Cases awaiting compliance review
   - **High Risk**: Cases flagged as high risk
   - **Completion Rate**: Percentage of completed cases

#### 3. **Active Cases Table**

The table displays all active investor cases with the following columns:

| Column | Description |
|--------|-------------|
| **Investor Name** | Name of the institutional investor |
| **Case ID** | Unique identifier for the case |
| **Risk Level** | Low, Medium, High, or Critical |
| **Status** | Current status (Draft, In Review, Approved, Rejected) |
| **Progress** | Document completeness percentage |
| **Created Date** | When the case was created |
| **Last Updated** | Most recent activity timestamp |
| **Actions** | View details, edit, or delete |

#### 4. **Filtering & Search**

- **Search Bar**: Search by investor name or case ID
- **Status Filter**: Filter by case status
- **Risk Filter**: Filter by risk level
- **Date Range**: Filter by creation or update date

---

## Managing Cases

### Creating a New Case

1. **Click "Create New Case"** button on the dashboard
2. **Enter Investor Information**:
   - Investor Name (required)
   - Entity Type (Corporation, Fund, Trust, etc.)
   - Country of Incorporation
   - Industry Sector
   - Contact Information
3. **Click "Create Case"**
4. You'll be redirected to the case details page

### Viewing Case Details

Click on any case row in the table to view:
- Complete investor profile
- All uploaded documents
- Risk assessment details
- Audit trail
- Compliance notes

### Editing Case Information

1. Open the case details page
2. Click the "Edit" button
3. Update the required fields
4. Click "Save Changes"

### Deleting a Case

1. Find the case in the dashboard table
2. Click the three-dot menu (⋮) in the Actions column
3. Select "Delete Case"
4. Confirm the deletion

**⚠️ Warning**: Deletion is permanent and cannot be undone.

---

## Document Management

### Uploading Documents

1. **Open a Case**
   - Navigate to the case details page

2. **Access Documents Tab**
   - Click on the "Documents" tab

3. **Upload Documents**
   - Click "Upload Documents" button
   - Drag and drop files or click to browse
   - Supported formats: PDF, JPG, PNG, DOCX
   - Maximum file size: 50MB

4. **Document Types**
   The system accepts various KYC/AML documents:
   - Certificate of Incorporation
   - Articles of Association
   - Beneficial Ownership Declaration
   - Financial Statements
   - Bank References
   - Proof of Address
   - Identity Documents (Directors/UBOs)
   - AML Policies
   - Sanctions Screening Reports

5. **AI Document Classification**
   - Documents are automatically classified by AI
   - The system extracts key information
   - Confidence scores are displayed
   - You can override classifications if needed

### Document Status Indicators

| Status | Meaning |
|--------|---------|
| ✅ **Verified** | Document verified and approved |
| ⏳ **Processing** | AI is analyzing the document |
| ⚠️ **Needs Review** | Manual review required |
| ❌ **Rejected** | Document rejected (reason provided) |
| 📄 **Uploaded** | Successfully uploaded, awaiting processing |

### Viewing Document Details

1. Click on any document in the Documents tab
2. View document preview
3. See extracted information
4. Review confidence scores
5. Check authenticity analysis

### Document Investigation

For suspicious or unclear documents:

1. **Click "Investigate"** on a document
2. **Review AI Analysis**:
   - Text extraction results
   - Metadata analysis
   - Authenticity checks
   - Anomaly detection

3. **Manual Verification**:
   - Compare with source documents
   - Cross-reference information
   - Flag inconsistencies

4. **Take Action**:
   - Approve document
   - Request re-submission
   - Escalate to compliance team

---

## Case Details & Tabs

### Overview Tab

**Investor Profile**
- Legal name and entity type
- Registration details
- Contact information
- Business description

**Risk Summary**
- Overall risk score
- Risk category breakdown
- Key risk factors
- Mitigation notes

**Timeline**
- Case creation date
- Document submission dates
- Review milestones
- Approval/rejection dates

### Documents Tab

Displays all uploaded documents with:
- Document thumbnail/preview
- Document type and classification
- Upload date and uploader
- Verification status
- AI confidence score
- Actions (view, download, investigate, delete)

**Bulk Actions**:
- Select multiple documents
- Download as ZIP
- Batch verify
- Bulk delete

### Completeness Tab

**Document Checklist**
- Lists all required documents
- Shows which are missing
- Indicates completion percentage
- Highlights mandatory vs. optional

**Completion Status**:
- ✅ Complete (100%)
- ⚠️ Incomplete (< 100%)
- 🔴 Missing Critical Documents

**Actions**:
- Upload missing documents
- Mark documents as not applicable
- Request documents from investor

### Authenticity Tab

**AI-Powered Verification**
- Document authenticity scores
- Tamper detection analysis
- Metadata verification
- Cross-document consistency checks

**Red Flags**:
- Modified documents
- Suspicious patterns
- Inconsistent information
- Expired documents

**Verification Methods**:
- Digital signature verification
- Watermark detection
- Font analysis
- Image forensics

### Audit Trail Tab

**Complete Activity Log**
- User actions and timestamps
- System-generated events
- Document uploads/deletions
- Status changes
- Comments and notes

**Export Capabilities**:
- Export audit trail as PDF
- Download as CSV
- Filter by date range
- Filter by user or action type

---

## Understanding Risk Levels

The platform uses AI to assess risk across multiple dimensions:

### Risk Categories

#### 🟢 **Low Risk**
- Well-established entities
- Low-risk jurisdictions
- Complete and verified documentation
- No adverse media or sanctions hits
- **Action**: Streamlined approval process

#### 🟡 **Medium Risk**
- Some minor gaps in documentation
- Moderate-risk jurisdictions
- Limited adverse media
- **Action**: Standard due diligence required

#### 🟠 **High Risk**
- Complex ownership structures
- Higher-risk jurisdictions
- Incomplete documentation
- Some adverse media findings
- **Action**: Enhanced due diligence required

#### 🔴 **Critical Risk**
- Sanctions matches
- PEP (Politically Exposed Persons) involvement
- High-risk jurisdictions (FATF blacklist)
- Significant adverse media
- **Action**: Senior management review required

### Risk Factors Analyzed

1. **Geographic Risk**
   - Country of incorporation
   - Country of operations
   - FATF ratings
   - Corruption indices

2. **Entity Risk**
   - Business type and sector
   - Ownership structure complexity
   - Corporate history
   - Legal structure

3. **Documentation Risk**
   - Completeness of documents
   - Authenticity scores
   - Age of documents
   - Consistency of information

4. **Compliance Risk**
   - Sanctions screening results
   - PEP screening
   - Adverse media findings
   - Historical issues

---

## Common Workflows

### Workflow 1: Onboarding a New Investor

**Step 1: Create Case**
1. Click "Create New Case"
2. Enter investor details
3. Set initial risk classification (if known)
4. Save case

**Step 2: Request Documents**
1. Open the case
2. Go to Completeness tab
3. Review required documents
4. Send document request to investor

**Step 3: Upload Documents**
1. Receive documents from investor
2. Go to Documents tab
3. Upload all received documents
4. Verify AI classifications

**Step 4: Review & Verify**
1. Check Authenticity tab for red flags
2. Investigate suspicious documents
3. Verify all information manually
4. Cross-reference across documents

**Step 5: Risk Assessment**
1. Review AI risk scoring
2. Check compliance screening results
3. Add manual risk notes
4. Adjust risk level if needed

**Step 6: Approval Decision**
1. Review complete case file
2. Check all tabs for completeness
3. Make approval decision
4. Document reasoning in notes
5. Update case status

### Workflow 2: Periodic Review of Existing Investor

**Step 1: Locate Case**
1. Search for investor in dashboard
2. Open case details
3. Review last update date

**Step 2: Request Updated Documents**
1. Check Completeness tab
2. Identify expired documents
3. Request refreshed documents

**Step 3: Re-screen**
1. Run updated sanctions screening
2. Check for new adverse media
3. Review PEP status changes
4. Update risk assessment

**Step 4: Update Case**
1. Upload new documents
2. Update investor information
3. Adjust risk level if changed
4. Add review notes to audit trail

### Workflow 3: Investigating a High-Risk Alert

**Step 1: Alert Notification**
1. Receive high-risk alert
2. Open flagged case
3. Review risk factors

**Step 2: Enhanced Due Diligence**
1. Review all documents in detail
2. Check Authenticity tab carefully
3. Investigate anomalies
4. Cross-reference public information

**Step 3: Additional Information**
1. Request additional documentation
2. Seek clarification from investor
3. Conduct enhanced background checks
4. Review beneficial ownership chain

**Step 4: Escalation Decision**
1. Document all findings
2. Assess whether to escalate
3. If escalating, prepare summary
4. Update case status appropriately

---

## Tips & Best Practices

### ✅ Document Management Tips

1. **Upload Documents Promptly**
   - Upload documents as soon as received
   - Don't batch too many documents at once
   - Use clear, descriptive filenames

2. **Verify AI Classifications**
   - Always review AI-suggested document types
   - Override if incorrect
   - Provide feedback to improve accuracy

3. **Maintain Document Quality**
   - Ensure documents are legible
   - Use high-resolution scans
   - Avoid uploading redacted versions unless necessary

4. **Organize Systematically**
   - Group related documents
   - Use consistent naming conventions
   - Tag documents appropriately

### ✅ Risk Assessment Tips

1. **Regular Reviews**
   - Review high-risk cases monthly
   - Medium-risk cases quarterly
   - Low-risk cases annually

2. **Document Decisions**
   - Always add notes explaining risk decisions
   - Reference specific evidence
   - Update audit trail consistently

3. **Stay Updated**
   - Check for sanctions list updates
   - Monitor adverse media regularly
   - Review regulatory changes

### ✅ Efficiency Tips

1. **Use Filters**
   - Create saved filter presets
   - Filter by status for daily work
   - Use date filters for reporting

2. **Bulk Operations**
   - Process similar cases together
   - Use bulk document downloads
   - Batch approve when appropriate

3. **Keyboard Shortcuts**
   - Press `/` to focus search
   - Use `Esc` to close modals
   - Tab through form fields

---

## Troubleshooting

### Common Issues

#### Issue: Documents won't upload

**Possible Causes**:
- File too large (>50MB limit)
- Unsupported file format
- Network connectivity issues
- Browser compatibility

**Solutions**:
1. Check file size and compress if needed
2. Convert to supported format (PDF, JPG, PNG, DOCX)
3. Refresh the page and try again
4. Try a different browser (Chrome recommended)
5. Clear browser cache

#### Issue: AI classification is incorrect

**Solution**:
1. Click on the document
2. Select "Override Classification"
3. Choose correct document type from dropdown
4. Save changes
5. The system learns from corrections

#### Issue: Case not appearing in dashboard

**Possible Causes**:
- Filters hiding the case
- Case status changed
- Synchronization delay

**Solutions**:
1. Clear all active filters
2. Check archived cases
3. Use search to find by case ID
4. Refresh the page
5. Wait a few seconds for sync

#### Issue: Risk score seems incorrect

**Solution**:
1. Review all risk factors in Overview tab
2. Check if all documents are processed
3. Verify sanctions screening completed
4. Manually adjust risk level if needed
5. Add notes explaining adjustment

#### Issue: Can't download documents

**Solutions**:
1. Check browser pop-up settings
2. Ensure sufficient storage space
3. Try right-click > Save As
4. Use bulk download feature
5. Contact IT support if persistent

---

## Reporting & Analytics

### Available Reports

1. **Case Summary Report**
   - Total cases by status
   - Average completion time
   - Risk distribution
   - Document completeness rates

2. **Compliance Report**
   - High-risk cases summary
   - PEP matches
   - Sanctions screening results
   - Adverse media findings

3. **Audit Report**
   - User activity log
   - System changes
   - Approval history
   - Document trail

### Exporting Data

**Export Options**:
- PDF (formatted reports)
- CSV (raw data for analysis)
- Excel (tabular data)
- JSON (API integration)

**Export Steps**:
1. Go to desired section
2. Click "Export" button
3. Select format
4. Choose date range (if applicable)
5. Download file

---

## Data Privacy & Security

### Data Handling

- All data is encrypted in transit (HTTPS)
- Documents stored securely in Cloud Storage
- Access controlled by authentication
- Audit trail for all actions
- GDPR compliant

### Best Practices

1. **Don't share login credentials**
2. **Log out when finished**
3. **Report suspicious activity**
4. **Handle PII with care**
5. **Follow data retention policies**

---

## Getting Help

### Support Resources

**Technical Support**
- Email: support@globalbank-demo.com
- Hours: Monday-Friday, 9 AM - 5 PM EST

**Documentation**
- API Documentation: http://localhost:8080/api/docs
- Video Tutorials: [Coming Soon]
- FAQ: [Coming Soon]

**Feedback**
- Report bugs or request features
- Suggest improvements
- Share your experience

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search bar |
| `Esc` | Close modal/dialog |
| `Ctrl/Cmd + S` | Save (in edit mode) |
| `Ctrl/Cmd + K` | Open command palette |
| `Tab` | Navigate form fields |
| `Enter` | Submit form |

---

## Glossary

**AML** - Anti-Money Laundering

**KYC** - Know Your Customer

**UBO** - Ultimate Beneficial Owner

**PEP** - Politically Exposed Person

**EDD** - Enhanced Due Diligence

**CDD** - Customer Due Diligence

**FATF** - Financial Action Task Force

**Sanctions Screening** - Checking against restricted parties lists

**Adverse Media** - Negative news or information

**Risk Score** - Calculated risk assessment rating

---

## Version Information

**Application Version**: 1.0.0
**Last Updated**: May 4, 2026
**Environment**: Production

---

## Quick Reference Card

### Daily Checklist
- [ ] Review new cases assigned to you
- [ ] Process uploaded documents
- [ ] Complete pending risk assessments
- [ ] Respond to escalations
- [ ] Update case notes
- [ ] Check for system alerts

### Weekly Tasks
- [ ] Review high-risk cases
- [ ] Run compliance reports
- [ ] Update periodic reviews
- [ ] Clear completed cases
- [ ] Team sync meeting

### Monthly Activities
- [ ] Generate monthly reports
- [ ] Review process improvements
- [ ] Update risk matrices
- [ ] Training and development
- [ ] Audit trail review

---

## Contact & Feedback

We value your feedback! Help us improve this platform:

**Report Issues**: File a bug report with screenshots and details
**Suggest Features**: Share ideas for new functionality
**Ask Questions**: Don't hesitate to reach out for clarification

---

**© 2026 the global bank Investor Risk Assessment Platform**
*This guide is for demo purposes only*
