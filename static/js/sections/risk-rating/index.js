import { pageHeader } from "../../components/page-header.js";
import { escapeHtml } from "../../core/dom.js";

export default {
  id: "risk-rating",
  step: 5,
  label: "Risk Rating",
  done: true,

  mount(container, caseData) {
    container.innerHTML = `
      ${pageHeader({
        title: "Risk Rating & Scoring Matrix",
        subtitle: `Automated compliance risk assessment for case: ${escapeHtml(caseData?.id || "Harbour Lantern")}`
      })}

      <div class="risk-rating-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1rem;">
        <!-- Overall Score Card -->
        <div style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Overall Suggested Risk Classification</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #d97706; margin-top: 0.25rem;">MEDIUM - HIGH RISK</div>
            <p style="font-size: 0.88rem; color: #64748b; margin: 0.25rem 0 0 0;">Elevated due to PEP / UN Sanction match on UBO (Soren Halek) and BVI offshore holding structure.</p>
          </div>
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 1rem 1.5rem; border-radius: 12px; text-align: center;">
            <div style="font-size: 2.2rem; font-weight: 800; color: #b45309;">78 / 100</div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #92400e;">RISK SCORE</div>
          </div>
        </div>

        <!-- Risk Factors Breakdown -->
        <div style="background: #ffffff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="font-size: 1.05rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">Risk Contribution Matrix</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
            <thead>
              <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">
                <th style="padding: 0.75rem 1rem;">Risk Domain</th>
                <th style="padding: 0.75rem 1rem;">Evaluated Factor</th>
                <th style="padding: 0.75rem 1rem;">Weight</th>
                <th style="padding: 0.75rem 1rem;">Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem; font-weight: 600; color: #0f172a;">Sanctions & PEP Exposure</td>
                <td style="padding: 1rem; color: #475569;">100% Match on Soren Halek (UN Security Council & OFAC List)</td>
                <td style="padding: 1rem; font-weight: 600; color: #64748b;">40%</td>
                <td style="padding: 1rem;"><span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem;">HIGH (Critical)</span></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem; font-weight: 600; color: #0f172a;">Entity Structure Complexity</td>
                <td style="padding: 1rem; color: #475569;">Multi-tier structure involving British Virgin Islands (BVI) holding company</td>
                <td style="padding: 1rem; font-weight: 600; color: #64748b;">30%</td>
                <td style="padding: 1rem;"><span style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem;">MEDIUM</span></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1rem; font-weight: 600; color: #0f172a;">Geographic / Country Risk</td>
                <td style="padding: 1rem; color: #475569;">Incorporated in Hong Kong (HKMA Low Risk Country List)</td>
                <td style="padding: 1rem; font-weight: 600; color: #64748b;">30%</td>
                <td style="padding: 1rem;"><span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem;">LOW</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
