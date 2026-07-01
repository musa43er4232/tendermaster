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
): Promise<{ data: ExtractedTender; mock: boolean }> {
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

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: content as any }],
  });

  const data = parseJson(textOf(resp));
  return { data: { ...mockExtraction(fileName), ...data } as ExtractedTender, mock: false };
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
