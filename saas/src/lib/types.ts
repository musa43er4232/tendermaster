// Shared shapes for AI extraction output.

export interface ExtractedRequirement {
  text: string;
  type: 'gate' | 'doc' | 'scored';
  category:
    | 'pec'
    | 'tax'
    | 'experience'
    | 'turnover'
    | 'security'
    | 'sector'
    | 'registration'
    | 'other';
}

export interface ExtractedTender {
  title: string;
  agency?: string;
  refNo?: string;
  workType?: string; // "solar" | "roads" | "buildings" | "water" | "electrical" | "other"
  method?: string;
  estimatedCostPkr?: number;
  earnestMoneyPkr?: number;
  earnestMoneyPct?: number;
  requiredPecCat?: string; // e.g. "C6"
  validityDays?: number;
  completionTime?: string;
  submissionDeadline?: string; // ISO date
  openingDate?: string; // ISO date
  summary: string;
  requirements: ExtractedRequirement[];
  /** Document names the bidder must include (drives the checklist). */
  requiredDocuments: string[];
}

export interface VerdictReason {
  label: string;
  result: 'pass' | 'gap' | 'fail';
  detail: string;
}
