'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCompany } from '@/lib/company';
import { extractTender } from '@/lib/ai';
import { evaluateEligibility } from '@/lib/eligibility';
import { buildChecklist } from '@/lib/checklist';
import { buildSubmissionPdf } from '@/lib/pdfBuilder';
import { parseDate } from '@/lib/util';
import * as store from '@/lib/store';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function saveUpload(file: File): Promise<{ filePath: string; bytes: Buffer }> {
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const safe = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
  const filePath = path.join(UPLOAD_DIR, safe);
  await fs.writeFile(filePath, bytes);
  return { filePath, bytes };
}

/** Upload a tender PDF → AI extract → eligibility verdict → checklist. */
export async function createTenderFromUpload(formData: FormData): Promise<void> {
  const company = requireCompany();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) throw new Error('Please choose a tender PDF.');

  const { filePath, bytes } = await saveUpload(file);
  const { data, mock, error } = await extractTender(bytes, file.name);
  const elig = evaluateEligibility(company, data);
  const checklist = buildChecklist(company, data);
  const deadline = parseDate(data.submissionDeadline);
  const summaryNote = error
    ? `[${error}] `
    : mock
      ? '[Sample extraction — live AI is off; add your Anthropic key to read the real PDF] '
      : '';

  const tender = store.createTender({
    companyId: company.id,
    tender: {
      title: data.title,
      agency: data.agency,
      workType: data.workType,
      refNo: data.refNo,
      method: data.method,
      estimatedCostPkr: data.estimatedCostPkr,
      earnestMoneyPkr: data.earnestMoneyPkr,
      earnestMoneyPct: data.earnestMoneyPct,
      requiredPecCat: data.requiredPecCat,
      validityDays: data.validityDays,
      completionTime: data.completionTime,
      submissionDeadline: deadline ? deadline.toISOString() : null,
      openingDate: parseDate(data.openingDate)?.toISOString() ?? null,
      summary: summaryNote + data.summary,
      extractedJson: JSON.stringify(data),
      verdict: elig.verdict,
      predictedScore: elig.predictedScore,
      verdictReasons: JSON.stringify(elig.reasons),
      status: 'evaluating',
    },
    requirements: data.requirements.map((r) => ({ text: r.text, type: r.type, category: r.category })),
    checklist: checklist.map((c) => ({ label: c.label, required: c.required, status: c.status, documentId: c.documentId ?? null, aiHelp: c.aiHelp, sortOrder: c.sortOrder })),
  });

  if (deadline) {
    store.createReminder({ companyId: company.id, tenderId: tender.id, kind: 'deadline', message: `Submission deadline for "${data.title.slice(0, 50)}…"`, dueDate: deadline.toISOString() });
    store.createReminder({ companyId: company.id, tenderId: tender.id, kind: 'outcome_check', message: `Any news on "${data.title.slice(0, 50)}…"? Won / Lost / Waiting?`, dueDate: new Date(deadline.getTime() + 14 * 86_400_000).toISOString() });
  }

  store.createDocument({ companyId: company.id, kind: 'other', title: `Tender PDF — ${data.title.slice(0, 60)}`, fileName: file.name, filePath, mimeType: file.type, sizeBytes: file.size });

  revalidatePath('/');
  redirect(`/tenders/${tender.id}`);
}

export async function setOutcome(tenderId: string, outcome: 'won' | 'lost' | 'shortlisted'): Promise<void> {
  const status = outcome === 'won' ? 'won' : outcome === 'lost' ? 'lost' : 'submitted';
  store.updateTender(tenderId, { outcome, status });
  store.resolveOutcomeReminders(tenderId);
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath('/');
}

export async function setTenderStatus(tenderId: string, status: string): Promise<void> {
  store.updateTender(tenderId, { status });
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath('/');
}

export async function toggleChecklistItem(itemId: string, tenderId: string): Promise<void> {
  store.toggleChecklist(itemId);
  revalidatePath(`/tenders/${tenderId}`);
}

export async function dismissReminder(reminderId: string): Promise<void> {
  store.dismissReminder(reminderId);
  revalidatePath('/');
}

export async function recomputeReadiness(): Promise<void> {
  store.computeReadiness();
  revalidatePath('/company');
  revalidatePath('/');
}

/** Compile the checklist into one submission-ready PDF, with stamp & signature on every page. */
export async function generateSubmissionPdf(tenderId: string): Promise<void> {
  const company = requireCompany();
  const tender = store.getTender(tenderId);
  if (!tender) throw new Error('Tender not found.');

  const documents = store.listDocuments();
  const result = await buildSubmissionPdf(company, tender, documents);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, `submission-${tenderId}-${Date.now()}.pdf`);
  await fs.writeFile(filePath, result.bytes);

  store.updateTender(tenderId, {
    submissionPdfPath: filePath,
    submissionGeneratedAt: new Date().toISOString(),
    submissionPageCount: result.pageCount,
    submissionMissingCount: result.missingCount,
  });

  revalidatePath(`/tenders/${tenderId}`);
}
