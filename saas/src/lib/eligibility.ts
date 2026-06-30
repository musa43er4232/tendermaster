import type { Credential, CompanyFull } from './models';
import type { ExtractedTender, VerdictReason } from './types';
import { pecQualifies, normalizePec } from './pec';

export type CompanyContext = CompanyFull;

export interface EligibilityResult {
  verdict: 'eligible' | 'eligible_with_gaps' | 'not_eligible';
  predictedScore: number; // 0-100
  reasons: VerdictReason[];
}

function hasCredential(ctx: CompanyContext, kind: string, mustBeActive = true): Credential | undefined {
  return ctx.credentials.find(
    (c) => c.kind === kind && (!mustBeActive || c.status === 'active'),
  );
}

function notExpired(c?: Credential): boolean {
  if (!c) return false;
  if (!c.expiryDate) return true;
  return new Date(c.expiryDate).getTime() >= Date.now();
}

/**
 * Deterministic eligibility: hard gates are pass/fail in code (never guessed),
 * scored items contribute to a predicted technical score.
 */
export function evaluateEligibility(ctx: CompanyContext, tender: ExtractedTender): EligibilityResult {
  const reasons: VerdictReason[] = [];
  let hardFail = false;
  let gaps = 0;

  // --- PEC category (hard gate) ---
  const pec = hasCredential(ctx, 'PEC');
  if (tender.requiredPecCat) {
    if (!pec) {
      reasons.push({ label: 'PEC category', result: 'fail', detail: `Requires ${tender.requiredPecCat} & above — no PEC licence on file.` });
      hardFail = true;
    } else if (!pecQualifies(pec.category, tender.requiredPecCat)) {
      reasons.push({ label: 'PEC category', result: 'fail', detail: `Requires ${tender.requiredPecCat} & above — you hold ${normalizePec(pec.category) ?? pec.category}.` });
      hardFail = true;
    } else if (!notExpired(pec)) {
      reasons.push({ label: 'PEC licence', result: 'gap', detail: `Category OK (${normalizePec(pec.category)}) but the licence has expired — renew before submission.` });
      gaps++;
    } else {
      reasons.push({ label: 'PEC category', result: 'pass', detail: `You hold ${normalizePec(pec.category)} — satisfies ${tender.requiredPecCat} & above.` });
    }
  }

  // --- Tax / active filer (hard gate) ---
  const ntn = hasCredential(ctx, 'NTN');
  const reqTax = tender.requirements.some((r) => r.category === 'tax');
  if (reqTax || ntn) {
    if (ntn) {
      reasons.push({ label: 'Active filer (NTN)', result: 'pass', detail: 'NTN on file and active.' });
    } else {
      reasons.push({ label: 'Active filer (NTN)', result: 'fail', detail: 'Active filer NTN required but not on file.' });
      hardFail = true;
    }
  }

  // --- Sector gate (e.g. solar → AEDB) ---
  const sectorReqs = tender.requirements.filter((r) => r.category === 'sector');
  for (const r of sectorReqs) {
    const needsAedb = /aedb|alternative energy/i.test(r.text) || tender.workType === 'solar';
    if (needsAedb) {
      const aedb = hasCredential(ctx, 'AEDB');
      if (aedb) reasons.push({ label: 'AEDB registration', result: 'pass', detail: 'AEDB registration on file (required for solar work).' });
      else {
        reasons.push({ label: 'AEDB registration', result: 'gap', detail: 'Solar work — AEDB registration required and not on file.' });
        gaps++;
      }
    }
  }

  // --- Registrations: SECP, Sales Tax, PRA (soft gaps if missing) ---
  for (const [kind, label] of [['SECP', 'SECP registration'], ['SALES_TAX', 'Sales Tax registration'], ['PRA', 'Provincial (PRA) registration']] as const) {
    if (tender.requiredDocuments.some((d) => new RegExp(kind === 'SALES_TAX' ? 'sales tax|fbr' : kind, 'i').test(d))) {
      if (hasCredential(ctx, kind)) reasons.push({ label, result: 'pass', detail: `${label} on file.` });
      else { reasons.push({ label, result: 'gap', detail: `${label} listed in required documents but not on file.` }); gaps++; }
    }
  }

  // --- Experience (scored) ---
  const relevant = ctx.projects.filter(
    (p) => p.status === 'completed' && (!tender.workType || !p.sector || p.sector === tender.workType),
  );
  if (tender.requirements.some((r) => r.category === 'experience')) {
    if (relevant.length >= 1) reasons.push({ label: 'Similar experience', result: 'pass', detail: `${relevant.length} relevant completed project(s) on file.` });
    else { reasons.push({ label: 'Similar experience', result: 'gap', detail: 'No clearly matching completed projects — add completion certificates to strengthen the bid.' }); gaps++; }
  }

  // --- Bid security capacity (informational) ---
  if (tender.earnestMoneyPkr) {
    reasons.push({ label: 'Bid security', result: 'gap', detail: `Arrange a Bank Guarantee of ~Rs ${Math.round(tender.earnestMoneyPkr).toLocaleString()} (≈${tender.earnestMoneyPct ?? 5}%).` });
  }

  // --- Predicted score ---
  const passes = reasons.filter((r) => r.result === 'pass').length;
  const total = reasons.length || 1;
  let score = Math.round((passes / total) * 100);
  // Reward depth of the knowledge graph (experience + people + credentials).
  score = Math.min(100, score + Math.min(15, relevant.length * 5));

  const verdict: EligibilityResult['verdict'] = hardFail
    ? 'not_eligible'
    : gaps > 0
      ? 'eligible_with_gaps'
      : 'eligible';

  return { verdict, predictedScore: hardFail ? Math.min(score, 45) : score, reasons };
}
