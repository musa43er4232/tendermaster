import type { CompanyContext } from './eligibility';
import type { ExtractedTender } from './types';

export interface ChecklistSpec {
  label: string;
  required: boolean;
  status: 'have' | 'missing' | 'expired';
  documentId?: string;
  aiHelp?: string;
  sortOrder: number;
}

// Maps a required-document label to a credential kind the firm may already hold.
const CRED_MATCHERS: { test: RegExp; kind: string; help: string }[] = [
  { test: /pec/i, kind: 'PEC', help: 'Attach your PEC constructor licence (must be the required category & in date).' },
  { test: /sales tax|fbr|ntn/i, kind: 'NTN', help: 'Attach your FBR registration (NTN + Sales Tax). Ensure active-filer status.' },
  { test: /pra|provincial/i, kind: 'PRA', help: 'Attach your Punjab Revenue Authority (PRA) registration.' },
  { test: /aedb|alternative energy/i, kind: 'AEDB', help: 'Attach your AEDB registration (required for solar / alternative-energy work).' },
  { test: /secp/i, kind: 'SECP', help: 'Attach your SECP incorporation certificate.' },
  { test: /iso/i, kind: 'ISO', help: 'Attach your ISO certificate(s).' },
];

// Documents the AI can generate from the company profile.
const GENERATABLE = /letter of technical bid|general information|cover letter|affidavit|integrity pact/i;
// Per-tender instruments the user must acquire externally.
const ACQUIRE = /bid security|bank guarantee/i;

export function buildChecklist(ctx: CompanyContext, tender: ExtractedTender): ChecklistSpec[] {
  const docs = tender.requiredDocuments?.length
    ? tender.requiredDocuments
    : ['Letter of Technical Bid', 'PEC Registration certificate', 'Bid Security (Bank Guarantee)'];

  return docs.map((label, i): ChecklistSpec => {
    // 1) Try to satisfy from an existing credential/vault document.
    const matcher = CRED_MATCHERS.find((m) => m.test.test(label));
    if (matcher) {
      const cred = ctx.credentials.find((c) => c.kind === matcher.kind);
      if (cred) {
        const expired = cred.expiryDate ? new Date(cred.expiryDate).getTime() < Date.now() : false;
        return {
          label,
          required: true,
          status: expired ? 'expired' : 'have',
          documentId: cred.documentId ?? undefined,
          aiHelp: expired ? `${matcher.help} (Your record shows this is expired — renew it.)` : matcher.help,
          sortOrder: i,
        };
      }
      return { label, required: true, status: 'missing', aiHelp: matcher.help, sortOrder: i };
    }

    // 2) AI-generatable document.
    if (GENERATABLE.test(label)) {
      return { label, required: true, status: 'missing', aiHelp: 'TenderMaster can draft this from your company profile — review, print on letterhead, sign & stamp.', sortOrder: i };
    }

    // 3) Externally-acquired instrument.
    if (ACQUIRE.test(label)) {
      const pct = tender.earnestMoneyPct ?? 5;
      const amt = tender.earnestMoneyPkr ? `~Rs ${Math.round(tender.earnestMoneyPkr).toLocaleString()}` : `${pct}% of estimated cost`;
      return { label, required: true, status: 'missing', aiHelp: `Request a Bank Guarantee (${amt}) from your bank in the employer's favour, valid 30 days beyond bid validity. Typically takes 2–3 working days — start early.`, sortOrder: i };
    }

    // 4) Generic document.
    return { label, required: true, status: 'missing', aiHelp: 'Upload this document, or ask AI for guidance on obtaining it.', sortOrder: i };
  });
}
