import type { CompanyFull, TenderLead } from './models';
import { pecQualifies } from './pec';

// ---------------------------------------------------------------------------
// Tender Discovery
//
// "Auto-find tenders": a pluggable feed of live opportunities that get matched
// against the firm's profile so it only surfaces ones worth pursuing.
//
// This ships with a curated starter feed modeled on real Pakistani public-sector
// EPC tenders (LDA, NHA, WAPDA, PHED, C&W, cantonment boards, universities). It
// is intentionally behind a single function so a real source — scraping the PPRA
// (eproc.punjab.gov.pk) / EPADS active-tenders list, or a paid aggregator API —
// can be dropped in later without touching the UI or the matcher.
// ---------------------------------------------------------------------------

export type LeadSeed = Omit<TenderLead, 'id' | 'companyId' | 'createdAt' | 'status' | 'importedTenderId'>;

/** Deterministic starter feed. Deadlines are generated relative to "now" so they always look live. */
export function seedLeads(_companyId: string): (LeadSeed & { companyId: string })[] {
  const day = 86_400_000;
  const inDays = (n: number) => new Date(Date.now() + n * day).toISOString();
  const agoDays = (n: number) => new Date(Date.now() - n * day).toISOString();

  const feed: LeadSeed[] = [
    {
      title: 'Provision of Solar Powered LED Lights at Approach Roads, Housing Scheme (Package-II)',
      agency: 'Lahore Development Authority, UD Wing',
      source: 'PPRA',
      workType: 'solar',
      refNo: 'LDA/UD/2026-118',
      estimatedCostPkr: 21500000,
      earnestMoneyPct: 5,
      requiredPecCat: 'C6',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN', 'AEDB', 'SECP']),
      city: 'Lahore',
      submissionDeadline: inDays(9),
      publishedDate: agoDays(2),
      url: 'https://eproc.punjab.gov.pk/ViewTender.aspx',
    },
    {
      title: 'Design, Supply & Installation of Net-Metering Based Solar PV System for Govt. Offices',
      agency: 'Communication & Works Department, Punjab',
      source: 'EPADS',
      workType: 'solar',
      refNo: 'CW/SOLAR/2026-44',
      estimatedCostPkr: 48000000,
      earnestMoneyPct: 5,
      requiredPecCat: 'C4',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN', 'AEDB', 'SECP', 'ISO']),
      city: 'Lahore',
      submissionDeadline: inDays(14),
      publishedDate: agoDays(1),
      url: 'https://eproc.punjab.gov.pk/ViewTender.aspx',
    },
    {
      title: 'Electrification & Internal Wiring of Academic Block',
      agency: 'University of Engineering & Technology',
      source: 'Newspaper',
      workType: 'electrical',
      refNo: 'UET/P&D/2026-09',
      estimatedCostPkr: 9800000,
      earnestMoneyPct: 4,
      requiredPecCat: 'C6',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN']),
      city: 'Lahore',
      submissionDeadline: inDays(6),
      publishedDate: agoDays(3),
    },
    {
      title: 'Solar Water Pumping Scheme for Rural Water Supply (12 sites)',
      agency: 'Public Health Engineering Department',
      source: 'PPRA',
      workType: 'solar',
      refNo: 'PHED/SOLAR/2026-77',
      estimatedCostPkr: 33500000,
      earnestMoneyPct: 5,
      requiredPecCat: 'C5',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN', 'AEDB']),
      city: 'Multan',
      submissionDeadline: inDays(18),
      publishedDate: agoDays(1),
    },
    {
      title: 'Construction of Boundary Wall & Guard Rooms',
      agency: 'Cantonment Board',
      source: 'Newspaper',
      workType: 'buildings',
      refNo: 'CB/CIVIL/2026-15',
      estimatedCostPkr: 18700000,
      earnestMoneyPct: 5,
      requiredPecCat: 'C5',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN', 'SECP']),
      city: 'Rawalpindi',
      submissionDeadline: inDays(11),
      publishedDate: agoDays(2),
    },
    {
      title: 'Widening & Improvement of Approach Road (2.5 km)',
      agency: 'National Highway Authority',
      source: 'EPADS',
      workType: 'roads',
      refNo: 'NHA/2026-231',
      estimatedCostPkr: 145000000,
      earnestMoneyPct: 2,
      requiredPecCat: 'C2',
      requiredRegistrations: JSON.stringify(['PEC', 'NTN', 'SECP']),
      city: 'Sheikhupura',
      submissionDeadline: inDays(21),
      publishedDate: agoDays(4),
    },
  ];

  return feed.map((f) => ({ ...f, companyId: _companyId }));
}

// ---------------------------------------------------------------------------
// Matching: score a lead against the company profile (no PDF needed — this is a
// pre-screen from the advertised summary fields).
// ---------------------------------------------------------------------------

export interface LeadMatch {
  fit: 'strong' | 'possible' | 'weak';
  score: number; // 0-100
  reasons: string[];
  blockers: string[];
}

export function matchLead(company: CompanyFull, lead: TenderLead): LeadMatch {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 50;

  // PEC category (the hard gate)
  const pec = company.credentials.find((c) => c.kind === 'PEC' && c.status === 'active');
  if (lead.requiredPecCat) {
    if (pec && pecQualifies(pec.category, lead.requiredPecCat)) {
      reasons.push(`PEC ${pec.category} meets required ${lead.requiredPecCat} & above`);
      score += 20;
    } else if (pec) {
      blockers.push(`Requires PEC ${lead.requiredPecCat} & above — you hold ${pec.category}`);
      score -= 35;
    } else {
      blockers.push('No PEC licence on file');
      score -= 35;
    }
  }

  // Required registrations
  const required: string[] = safeParse(lead.requiredRegistrations);
  const held = new Set(company.credentials.filter((c) => c.status === 'active').map((c) => c.kind));
  const missing = required.filter((r) => !held.has(r));
  if (required.length) {
    if (missing.length === 0) {
      reasons.push('All required registrations on file');
      score += 12;
    } else {
      blockers.push(`Missing registration(s): ${missing.join(', ')}`);
      score -= missing.length * 8;
    }
  }

  // Sector fit vs experience
  const sectorProjects = company.projects.filter((p) => p.status === 'completed' && p.sector === lead.workType);
  if (lead.workType) {
    if (sectorProjects.length) {
      reasons.push(`${sectorProjects.length} completed ${lead.workType} project(s) — relevant experience`);
      score += 12;
    } else {
      reasons.push(`No prior ${lead.workType} projects on record`);
      score -= 4;
    }
  }

  // Value vs typical capacity (turnover-based sanity check)
  const maxTurnover = Math.max(0, ...company.projects.map((p) => p.valuePkr ?? 0));
  if (lead.estimatedCostPkr && maxTurnover) {
    if (lead.estimatedCostPkr <= maxTurnover * 3) {
      reasons.push('Value within your delivered range');
      score += 6;
    } else {
      reasons.push('Larger than your biggest delivered project — check bonding/capacity');
      score -= 6;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const fit: LeadMatch['fit'] = blockers.length ? (score >= 45 ? 'possible' : 'weak') : score >= 70 ? 'strong' : 'possible';
  return { fit, score, reasons, blockers };
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
