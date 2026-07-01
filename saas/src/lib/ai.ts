import Anthropic from '@anthropic-ai/sdk';
import type { ExtractedTender } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

// The app uses its own key name so it never clashes with Claude Code's own
// ANTHROPIC_API_KEY auth. Falls back to ANTHROPIC_API_KEY for local dev.
function apiKey(): string | undefined {
  return process.env.TENDERMASTER_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
}

export function aiEnabled(): boolean {
  return !!apiKey();
}

function client(): Anthropic {
  return new Anthropic({ apiKey: apiKey()! });
}

const EXTRACTION_SYSTEM = `You are an expert analyst of Pakistani public-sector (PPRA/PEC) construction & EPC tenders.
You read a tender document — often a scanned newspaper notice (NIT), bidding document, and BOQ —
and extract a strict, structured summary for an automated eligibility engine.

Rules:
- Pakistani tenders express the PEC category as a floor, e.g. "C-6 & Above" → requiredPecCat "C6".
- Bid/earnest-money security is typically ~5% of estimated cost, often via Bank Guarantee.
- Identify the work type (solar, roads, buildings, water, electrical, ...) because some gates are
  sector-specific (e.g. solar work often needs AEDB registration).
- "gate" = pass/fail eligibility condition; "doc" = a document that must be attached;
  "scored" = contributes to a technical score.
- Output ONLY valid JSON matching the requested schema. No prose, no markdown fences.`;

const SCHEMA_HINT = `Return JSON with this exact shape:
{
  "title": string,
  "agency": string,
  "refNo": string,
  "workType": "solar"|"roads"|"buildings"|"water"|"electrical"|"other",
  "method": string,
  "estimatedCostPkr": number,
  "earnestMoneyPkr": number,
  "earnestMoneyPct": number,
  "requiredPecCat": "C6"|"C5"|"C4"|"C3"|"C2"|"C1"|"CB"|"CA",
  "validityDays": number,
  "completionTime": string,
  "submissionDeadline": string (ISO date or ""),
  "openingDate": string (ISO date or ""),
  "summary": string (plain-language, 3-5 sentences),
  "requirements": [{ "text": string, "type": "gate"|"doc"|"scored", "category": "pec"|"tax"|"experience"|"turnover"|"security"|"sector"|"registration"|"other" }],
  "requiredDocuments": [string]
}
Use null/empty for unknown fields. Do not invent values.`;

/**
 * Extract a structured tender from a PDF buffer.
 * Uses Claude's native PDF support (handles scanned/stamped pages via vision).
 * Falls back to a deterministic mock when no API key is configured.
 */
export async function extractTender(
  pdf: Buffer,
  fileName: string,
): Promise<{ data: ExtractedTender; mock: boolean; error?: string }> {
  if (!aiEnabled()) {
    return { data: mockExtraction(fileName), mock: true };
  }

  const content: any[] = [
    {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') },
    },
    { type: 'text', text: `Extract the tender. ${SCHEMA_HINT}` },
  ];

  try {
    const resp = await client().messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        system: EXTRACTION_SYSTEM,
        messages: [{ role: 'user', content: content as any }],
      },
      { timeout: 180_000, maxRetries: 1 },
    );

    const data = parseJson(textOf(resp));
    // Guard: if the model returned nothing usable, treat as a soft failure.
    if (!data || !data.title) {
      return { data: mockExtraction(fileName), mock: true, error: 'AI returned no usable data — showing a sample. Try re-uploading.' };
    }
    return { data: { ...mockExtraction(fileName), ...data } as ExtractedTender, mock: false };
  } catch (err: any) {
    // Never fail the upload: fall back to the sample and surface a note.
    const msg = err?.status === 401 ? 'AI key rejected (401) — check ANTHROPIC_API_KEY.' : err?.status === 429 ? 'AI rate-limited (429) — try again shortly.' : `AI extraction failed (${err?.message ?? 'unknown error'}).`;
    return { data: mockExtraction(fileName), mock: true, error: msg };
  }
}

/** Draft a document (affidavit, cover letter, etc.) from company context. */
export async function draftDocument(prompt: string): Promise<string> {
  if (!aiEnabled()) {
    return `[Mock draft — set ANTHROPIC_API_KEY to enable real drafting]\n\n${prompt}`;
  }
  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  return textOf(resp);
}

interface DraftCompany {
  legalName: string;
  headOffice?: string | null;
  phone?: string | null;
  email?: string | null;
}
interface DraftTender {
  title: string;
  agency?: string | null;
  estimatedCostPkr?: number | null;
  validityDays?: number | null;
}

/**
 * Draft the text body for a checklist document (letter, affidavit, etc.), ready
 * to print on letterhead and sign. Uses Claude when available; otherwise falls
 * back to a sensible deterministic template so the PDF builder always has
 * clean, print-ready text rather than a raw prompt dump.
 */
export async function draftChecklistDocument(company: DraftCompany, tender: DraftTender, label: string): Promise<string> {
  if (aiEnabled()) {
    const prompt = `Draft the "${label}" document for a Pakistani EPC tender submission, ready to print on the bidder's letterhead.
Bidder: ${company.legalName}${company.headOffice ? `, ${company.headOffice}` : ''}.
Tender: ${tender.title}${tender.agency ? ` (Employer: ${tender.agency})` : ''}.
${tender.estimatedCostPkr ? `Estimated cost: Rs ${Math.round(tender.estimatedCostPkr).toLocaleString()}.` : ''}
${tender.validityDays ? `Bid validity: ${tender.validityDays} days.` : ''}
Write ONLY the document body text — no explanations, no markdown, no preamble like "Here is...". Keep it under 250 words, formal register, ready for signature.`;
    try {
      const text = await draftDocument(prompt);
      if (text && !text.startsWith('[Mock draft')) return text.trim();
    } catch {
      // fall through to template
    }
  }
  return templateFor(label, company, tender);
}

function templateFor(label: string, company: DraftCompany, tender: DraftTender): string {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  if (/letter of technical bid|bid form|covering letter/i.test(label)) {
    return [
      'To,', 'The Procuring Officer,', tender.agency ?? '', '',
      `Subject: ${tender.title}`, '',
      `Dear Sir,`, '',
      `I/We, ${company.legalName}, having examined the tender documents and conditions of contract for the above-named work, hereby offer to execute, complete and maintain the whole of the said work in accordance with the tender documents.`, '',
      `We agree to abide by this tender and keep it valid for the period stated in the tender documents from the date of submission, and it shall remain binding upon us until a formal contract is prepared and executed.`, '',
      `We understand you are not bound to accept the lowest or any tender received.`, '',
      'Yours faithfully,', '', '', '_______________________', '(Authorised Signatory)', company.legalName, `Dated: ${today}`,
    ].join('\n');
  }
  if (/general information/i.test(label)) {
    return [
      'BIDDER GENERAL INFORMATION', '',
      `Name of Firm: ${company.legalName}`,
      `Head Office: ${company.headOffice ?? '—'}`,
      `Phone: ${company.phone ?? '—'}`,
      `Email: ${company.email ?? '—'}`, '',
      '(Complete remaining fields — registration category, incorporation details and representative information — from the Company Profile before submission.)',
    ].join('\n');
  }
  if (/non-blacklisting|affidavit/i.test(label)) {
    return [
      'AFFIDAVIT', '',
      `I, the undersigned, being the authorised representative of ${company.legalName}, do hereby solemnly affirm and declare that our firm has not been blacklisted or debarred by any government department, autonomous body or public sector organisation in Pakistan, and that all information submitted with this tender is true and correct to the best of our knowledge.`, '', '',
      '_______________________', 'Deponent',
    ].join('\n');
  }
  if (/integrity pact/i.test(label)) {
    return [
      'INTEGRITY PACT', '',
      `${company.legalName} undertakes that it has not obtained or induced the procurement of this contract through any corrupt business practice, and agrees to be bound by the terms of the Integrity Pact as prescribed under the applicable procurement rules.`, '', '',
      '_______________________', 'Authorised Signatory',
    ].join('\n');
  }
  return [
    label, '',
    '(This section could not be auto-drafted. Please attach the actual document, or configure an AI key for automatic drafting.)',
  ].join('\n');
}

/** Concatenate all text blocks from a Claude response (SDK-version agnostic). */
function textOf(resp: any): string {
  const blocks = (resp?.content ?? []) as Array<{ type: string; text?: string }>;
  return blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
}

function parseJson(text: string): Partial<ExtractedTender> {
  // Strip accidental code fences and grab the outermost JSON object.
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return {};
  }
}

/**
 * Deterministic mock based on the real LDA solar tender we studied, so the full
 * product flow (verdict, checklist, reminders) works without an API key.
 */
export function mockExtraction(fileName: string): ExtractedTender {
  return {
    title:
      'Development of LDA City Housing Scheme — Provision of Solar Powered LED Lights at Approach Road of LDA City, Lahore',
    agency: 'Lahore Development Authority, UD Wing',
    refNo: fileName.replace(/\.pdf$/i, '').slice(0, 40),
    workType: 'solar',
    method: 'single_stage_one_envelope',
    estimatedCostPkr: 17060123,
    earnestMoneyPkr: 853006,
    earnestMoneyPct: 5,
    requiredPecCat: 'C6',
    validityDays: 60,
    completionTime: '2 Months',
    submissionDeadline: '2026-01-20',
    openingDate: '2026-01-20',
    summary:
      'LDA UD Wing invites item-rate bids (single stage–one envelope, PPRA-38-1) for supply and installation of solar-powered LED street lights. Estimated cost ≈ Rs 17.06M, completion in 2 months. Bidders must be EPADS-registered, hold a valid PEC licence (C-6 & above), be active filers (NTN + PNTN), and submit 5% bid security as a Bank Guarantee. Being solar work, AEDB registration is required.',
    requirements: [
      { text: 'Valid PEC constructor licence, category C-6 or above', type: 'gate', category: 'pec' },
      { text: 'Active filer with NTN and PNTN', type: 'gate', category: 'tax' },
      { text: 'Registered on EPADS (Punjab e-procurement)', type: 'gate', category: 'registration' },
      { text: 'AEDB registration (alternative energy — required for solar work)', type: 'gate', category: 'sector' },
      { text: 'Bid security: 5% of estimated cost via Bank Guarantee in favour of LDA', type: 'doc', category: 'security' },
      { text: 'Evidence of similar completed projects', type: 'scored', category: 'experience' },
    ],
    requiredDocuments: [
      'Letter of Technical Bid',
      'Bidder General Information form',
      'PEC Registration certificate',
      'Registration with FBR (NTN + Sales Tax)',
      'Registration with Provincial Tax Authority (PRA)',
      'Registration with AEDB',
      'Registration with SECP',
      'ISO certificates',
      'Bid Security (Bank Guarantee)',
    ],
  };
}
