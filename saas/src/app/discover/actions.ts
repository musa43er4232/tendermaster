'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as store from '@/lib/store';
import { requireCompany } from '@/lib/company';
import { evaluateEligibility } from '@/lib/eligibility';
import { buildChecklist } from '@/lib/checklist';
import type { ExtractedTender } from '@/lib/types';

/** Turn a discovered lead into a full tender in the pipeline (no PDF needed). */
export async function importLead(leadId: string): Promise<void> {
  const company = requireCompany();
  const lead = store.getLead(leadId);
  if (!lead) throw new Error('Lead not found.');

  const requiredRegs: string[] = safeParse(lead.requiredRegistrations);
  const earnest = lead.estimatedCostPkr && lead.earnestMoneyPct ? Math.round((lead.estimatedCostPkr * lead.earnestMoneyPct) / 100) : null;

  // Build a structured "extracted tender" from the advertised fields so the
  // normal eligibility + checklist engines can run without a document.
  const extracted: ExtractedTender = {
    title: lead.title,
    agency: lead.agency ?? undefined,
    refNo: lead.refNo ?? undefined,
    workType: lead.workType ?? 'other',
    method: 'single_stage_one_envelope',
    estimatedCostPkr: lead.estimatedCostPkr ?? undefined,
    earnestMoneyPkr: earnest ?? undefined,
    earnestMoneyPct: lead.earnestMoneyPct ?? undefined,
    requiredPecCat: lead.requiredPecCat ?? undefined,
    validityDays: 60,
    completionTime: undefined,
    submissionDeadline: lead.submissionDeadline ?? undefined,
    openingDate: undefined,
    summary: `Discovered via ${lead.source ?? 'feed'}${lead.city ? ` · ${lead.city}` : ''}. Imported from the tender advertisement — upload the full bidding document to refine the checklist and verdict.`,
    requirements: [
      lead.requiredPecCat ? { text: `Valid PEC constructor licence, category ${lead.requiredPecCat} & above`, type: 'gate' as const, category: 'pec' as const } : null,
      { text: 'Active filer with NTN and PNTN', type: 'gate' as const, category: 'tax' as const },
      lead.workType === 'solar' ? { text: 'AEDB registration (required for solar/alternative-energy work)', type: 'gate' as const, category: 'sector' as const } : null,
      earnest ? { text: `Bid security ~${lead.earnestMoneyPct}% via Bank Guarantee`, type: 'doc' as const, category: 'security' as const } : null,
      { text: 'Evidence of similar completed projects', type: 'scored' as const, category: 'experience' as const },
    ].filter(Boolean) as ExtractedTender['requirements'],
    requiredDocuments: buildRequiredDocs(requiredRegs, lead.workType),
  };

  const elig = evaluateEligibility(company, extracted);
  const checklist = buildChecklist(company, extracted);
  const deadline = lead.submissionDeadline ? new Date(lead.submissionDeadline) : null;

  const tender = store.createTender({
    companyId: company.id,
    tender: {
      title: extracted.title,
      agency: extracted.agency,
      workType: extracted.workType,
      refNo: extracted.refNo,
      method: extracted.method,
      estimatedCostPkr: extracted.estimatedCostPkr,
      earnestMoneyPkr: extracted.earnestMoneyPkr,
      earnestMoneyPct: extracted.earnestMoneyPct,
      requiredPecCat: extracted.requiredPecCat,
      validityDays: extracted.validityDays,
      submissionDeadline: deadline ? deadline.toISOString() : null,
      summary: extracted.summary,
      extractedJson: JSON.stringify(extracted),
      verdict: elig.verdict,
      predictedScore: elig.predictedScore,
      verdictReasons: JSON.stringify(elig.reasons),
      status: 'evaluating',
    },
    requirements: extracted.requirements.map((r) => ({ text: r.text, type: r.type, category: r.category })),
    checklist: checklist.map((c) => ({ label: c.label, required: c.required, status: c.status, documentId: c.documentId ?? null, aiHelp: c.aiHelp, sortOrder: c.sortOrder })),
  });

  if (deadline) {
    store.createReminder({ companyId: company.id, tenderId: tender.id, kind: 'deadline', message: `Submission deadline for "${lead.title.slice(0, 50)}…"`, dueDate: deadline.toISOString() });
    store.createReminder({ companyId: company.id, tenderId: tender.id, kind: 'outcome_check', message: `Any news on "${lead.title.slice(0, 50)}…"? Won / Lost / Waiting?`, dueDate: new Date(deadline.getTime() + 14 * 86_400_000).toISOString() });
  }

  store.setLeadStatus(leadId, 'imported', tender.id);
  revalidatePath('/discover');
  revalidatePath('/');
  redirect(`/tenders/${tender.id}`);
}

export async function dismissLead(leadId: string): Promise<void> {
  store.setLeadStatus(leadId, 'dismissed');
  revalidatePath('/discover');
}

export async function refreshFeed(): Promise<void> {
  store.refreshLeads();
  revalidatePath('/discover');
}

function buildRequiredDocs(regs: string[], workType?: string | null): string[] {
  const map: Record<string, string> = {
    PEC: 'PEC Registration certificate',
    NTN: 'Registration with FBR (NTN + Sales Tax)',
    SALES_TAX: 'Registration with FBR (NTN + Sales Tax)',
    PRA: 'Registration with Provincial Tax Authority (PRA)',
    AEDB: 'Registration with AEDB',
    SECP: 'Registration with SECP',
    ISO: 'ISO certificates',
  };
  const docs = ['Letter of Technical Bid', 'Bidder General Information form'];
  for (const r of regs) if (map[r] && !docs.includes(map[r])) docs.push(map[r]);
  if (workType === 'solar' && !docs.includes(map.AEDB)) docs.push(map.AEDB);
  docs.push('Bid Security (Bank Guarantee)');
  return docs;
}

function safeParse(s?: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
