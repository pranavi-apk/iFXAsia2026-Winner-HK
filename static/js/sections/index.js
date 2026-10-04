// The sections shown in the sidebar, in order. To add one, create
// sections/<name>/index.js exporting { id, step, label, mount(container, caseData) }
// and list it here.
import documents from "./documents/index.js";
import ownership from "./ownership/index.js";
import sanctions from "./sanctions/index.js";
import sourceOfFunds from "./source-of-funds/index.js";
import riskRating from "./risk-rating/index.js";
import approvalMemo from "./approval-memo/index.js";

export const sections = [documents, ownership, sanctions, sourceOfFunds, riskRating, approvalMemo];

export const sectionById = (id) => sections.find((s) => s.id === id);
