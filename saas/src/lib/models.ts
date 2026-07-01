// Plain data models (no ORM). Dates are stored as ISO strings.
// Production target: the same shapes map to the PostgreSQL/Prisma schema in
// docs-schema.prisma — swap the store for Prisma without touching call sites.

export interface Company {
  id: string;
  legalName: string;
  brandName?: string | null;
  orgType?: string | null;
  headOffice?: string | null;
  phone?: string | null;
  email?: string | null;
  incorpPlace?: string | null;
  incorpYear?: number | null;
  secpNumber?: string | null;
  ntn?: string | null;
  stampDocId?: string | null;
  signatureDocId?: string | null;
  logoDocId?: string | null;
  readinessScore: number;
  createdAt: string;
}

export interface Credential {
  id: string;
  companyId: string;
  kind: string; // PEC | SECP | NTN | SALES_TAX | PRA | AEDB | ISO | OTHER
  label?: string | null;
  number?: string | null;
  category?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: string; // active | expired | pending
  documentId?: string | null;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  client?: string | null;
  valuePkr?: number | null;
  sector?: string | null;
  role?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string; // completed | ongoing
  capacity?: string | null;
  completionCertId?: string | null;
}

export interface Person {
  id: string;
  companyId: string;
  name: string;
  designation?: string | null;
  qualification?: string | null;
  pecReg?: string | null;
  years?: number | null;
  nationality?: string | null;
  cvDocId?: string | null;
}

export interface FinancialYear {
  id: string;
  companyId: string;
  year: number;
  turnoverPkr?: number | null;
  netWorthPkr?: number | null;
  auditedDocId?: string | null;
}

export interface DocumentRec {
  id: string;
  companyId: string;
  kind: string; // certificate | completion | cv | audited | stamp | signature | bid_security | award | other
  title: string;
  fileName?: string | null;
  filePath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  expiryDate?: string | null;
  createdAt: string;
}

export interface Requirement {
  id: string;
  tenderId: string;
  text: string;
  type: string; // gate | doc | scored
  category?: string | null;
  result?: string | null;
  detail?: string | null;
}

export interface ChecklistItem {
  id: string;
  tenderId: string;
  label: string;
  required: boolean;
  status: string; // have | missing | expired
  documentId?: string | null;
  aiHelp?: string | null;
  sortOrder: number;
}

export interface Tender {
  id: string;
  companyId: string;
  title: string;
  agency?: string | null;
  workType?: string | null;
  refNo?: string | null;
  estimatedCostPkr?: number | null;
  bidValuePkr?: number | null;
  earnestMoneyPkr?: number | null;
  earnestMoneyPct?: number | null;
  requiredPecCat?: string | null;
  method?: string | null;
  validityDays?: number | null;
  completionTime?: string | null;
  submissionDeadline?: string | null;
  openingDate?: string | null;
  summary?: string | null;
  extractedJson?: string | null;
  verdict?: string | null;
  predictedScore?: number | null;
  verdictReasons?: string | null;
  status: string; // evaluating | preparing | submitted | won | lost
  outcome?: string | null;
  outcomeReason?: string | null;
  agreementAmountPkr?: number | null;
  awardDocId?: string | null;
  submittedAt?: string | null;
  createdAt: string;

  // Compiled submission package (generated PDF)
  submissionPdfPath?: string | null;
  submissionGeneratedAt?: string | null;
  submissionPageCount?: number | null;
  submissionMissingCount?: number | null;
}

/// A discovered tender opportunity (from the discovery feed), before the firm
/// decides to pursue it. Importing a lead creates a full Tender.
export interface TenderLead {
  id: string;
  companyId: string;
  title: string;
  agency?: string | null;
  source?: string | null; // "PPRA" | "EPADS" | "Newspaper" | ...
  workType?: string | null;
  refNo?: string | null;
  estimatedCostPkr?: number | null;
  earnestMoneyPct?: number | null;
  requiredPecCat?: string | null;
  requiredRegistrations?: string | null; // serialized string[] of credential kinds
  city?: string | null;
  submissionDeadline?: string | null;
  publishedDate?: string | null;
  url?: string | null;
  status: string; // "new" | "imported" | "dismissed"
  importedTenderId?: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  companyId: string;
  tenderId?: string | null;
  kind: string; // deadline | security_expiry | licence_expiry | outcome_check | validity
  message: string;
  dueDate: string;
  done: boolean;
  createdAt: string;
}

// Composite read shapes
export type CompanyFull = Company & { credentials: Credential[]; projects: Project[] };
export type TenderFull = Tender & { requirements: Requirement[]; checklist: ChecklistItem[] };

export interface DB {
  companies: Company[];
  credentials: Credential[];
  projects: Project[];
  people: Person[];
  financials: FinancialYear[];
  documents: DocumentRec[];
  tenders: Tender[];
  requirements: Requirement[];
  checklist: ChecklistItem[];
  reminders: Reminder[];
  leads: TenderLead[];
}
