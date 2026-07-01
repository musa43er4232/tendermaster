import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import type {
  DB, Company, CompanyFull, Credential, Project, Person, FinancialYear,
  DocumentRec, Tender, TenderFull, Requirement, ChecklistItem, Reminder, TenderLead,
} from './models';
import { mockExtraction } from './ai';
import { evaluateEligibility } from './eligibility';
import { buildChecklist } from './checklist';
import { seedLeads } from './discovery';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function emptyDb(): DB {
  return { companies: [], credentials: [], projects: [], people: [], financials: [], documents: [], tenders: [], requirements: [], checklist: [], reminders: [], leads: [] };
}

// Persist a single DB across hot reloads in dev.
const g = globalThis as unknown as { __tmDb?: DB };

function load(): DB {
  if (g.__tmDb) return g.__tmDb;
  let db: DB;
  if (existsSync(DB_PATH)) {
    try {
      db = { ...emptyDb(), ...JSON.parse(readFileSync(DB_PATH, 'utf8')) };
    } catch {
      db = emptyDb();
    }
  } else {
    db = emptyDb();
  }
  g.__tmDb = db;
  let dirty = false;
  if (db.companies.length === 0) {
    seed(db);
    dirty = true;
  }
  // Ensure the discovery feed exists (also back-fills older data files).
  if (!db.leads) db.leads = [];
  if (db.leads.length === 0 && db.companies[0]) {
    db.leads = seedLeads(db.companies[0].id).map((l) => ({ id: id(), createdAt: now(), status: 'new', ...l }));
    dirty = true;
  }
  if (dirty) save();
  return db;
}

function save(): void {
  if (!g.__tmDb) return;
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(g.__tmDb, null, 2));
}

const id = () => randomUUID();
const now = () => new Date().toISOString();

// ---------------- Reads ----------------

export function getCompany(): CompanyFull | null {
  const db = load();
  const c = db.companies[0];
  if (!c) return null;
  return {
    ...c,
    credentials: db.credentials.filter((x) => x.companyId === c.id),
    projects: db.projects.filter((x) => x.companyId === c.id),
  };
}

export function listTenders(): TenderFull[] {
  const db = load();
  return db.tenders
    .map(withTenderRelations)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTender(tenderId: string): TenderFull | null {
  const db = load();
  const t = db.tenders.find((x) => x.id === tenderId);
  return t ? withTenderRelations(t) : null;
}

function withTenderRelations(t: Tender): TenderFull {
  const db = load();
  return {
    ...t,
    requirements: db.requirements.filter((r) => r.tenderId === t.id),
    checklist: db.checklist.filter((c) => c.tenderId === t.id).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function listReminders(openOnly = true): Reminder[] {
  const db = load();
  return db.reminders
    .filter((r) => (openOnly ? !r.done : true))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function listPeople(): Person[] {
  const db = load();
  return db.people.filter((p) => p.companyId === db.companies[0]?.id);
}
export function listFinancials(): FinancialYear[] {
  const db = load();
  return db.financials
    .filter((f) => f.companyId === db.companies[0]?.id)
    .sort((a, b) => b.year - a.year);
}
export function listDocuments(): DocumentRec[] {
  const db = load();
  return db.documents.filter((d) => d.companyId === db.companies[0]?.id);
}

// ---------------- Writes ----------------

export interface NewTenderInput {
  companyId: string;
  tender: Omit<Tender, 'id' | 'createdAt' | 'companyId'>;
  requirements: Omit<Requirement, 'id' | 'tenderId'>[];
  checklist: Omit<ChecklistItem, 'id' | 'tenderId'>[];
}

export function createTender(input: NewTenderInput): TenderFull {
  const db = load();
  const t: Tender = { id: id(), companyId: input.companyId, createdAt: now(), ...input.tender };
  db.tenders.push(t);
  for (const r of input.requirements) db.requirements.push({ id: id(), tenderId: t.id, ...r });
  for (const c of input.checklist) db.checklist.push({ id: id(), tenderId: t.id, ...c });
  save();
  return withTenderRelations(t);
}

export function updateTender(tenderId: string, patch: Partial<Tender>): void {
  const db = load();
  const t = db.tenders.find((x) => x.id === tenderId);
  if (!t) return;
  Object.assign(t, patch);
  save();
}

export function toggleChecklist(itemId: string): void {
  const db = load();
  const item = db.checklist.find((c) => c.id === itemId);
  if (!item) return;
  item.status = item.status === 'have' ? 'missing' : 'have';
  save();
}

export function createReminder(r: Omit<Reminder, 'id' | 'createdAt' | 'done'>): void {
  const db = load();
  db.reminders.push({ id: id(), createdAt: now(), done: false, ...r });
  save();
}

export function dismissReminder(reminderId: string): void {
  const db = load();
  const r = db.reminders.find((x) => x.id === reminderId);
  if (r) r.done = true;
  save();
}

export function resolveOutcomeReminders(tenderId: string): void {
  const db = load();
  db.reminders.filter((r) => r.tenderId === tenderId && r.kind === 'outcome_check').forEach((r) => (r.done = true));
  save();
}

export function createDocument(d: Omit<DocumentRec, 'id' | 'createdAt'>): DocumentRec {
  const db = load();
  const doc: DocumentRec = { id: id(), createdAt: now(), ...d };
  db.documents.push(doc);
  save();
  return doc;
}

export function updateCompany(patch: Partial<Company>): void {
  const db = load();
  if (db.companies[0]) Object.assign(db.companies[0], patch);
  save();
}

export function computeReadiness(): number {
  const db = load();
  const c = db.companies[0];
  if (!c) return 0;
  const creds = db.credentials.filter((x) => x.companyId === c.id).length;
  const projects = db.projects.filter((x) => x.companyId === c.id).length;
  const people = db.people.filter((x) => x.companyId === c.id).length;
  const fin = db.financials.filter((x) => x.companyId === c.id).length;
  const docs = db.documents.filter((x) => x.companyId === c.id).length;

  let score = 0;
  if (c.legalName) score += 5;
  if (c.ntn) score += 5;
  if (c.secpNumber) score += 5;
  if (c.headOffice) score += 5;
  score += Math.min(25, creds * 5);
  score += Math.min(20, projects * 7);
  score += Math.min(10, people * 5);
  score += Math.min(10, fin * 5);
  if (c.stampDocId) score += 5;
  if (c.signatureDocId) score += 5;
  score += Math.min(5, docs);
  score = Math.min(100, score);
  c.readinessScore = score;
  save();
  return score;
}

// ---------------- Knowledge-graph CRUD (onboarding) ----------------

function companyId(): string | undefined {
  return load().companies[0]?.id;
}

export function listCredentials(): Credential[] {
  const db = load();
  return db.credentials.filter((c) => c.companyId === companyId());
}
export function addCredential(c: Omit<Credential, 'id' | 'companyId'>): void {
  const db = load();
  const cid = companyId();
  if (!cid) return;
  db.credentials.push({ id: id(), companyId: cid, ...c });
  save();
}
export function deleteCredential(credId: string): void {
  const db = load();
  db.credentials = db.credentials.filter((c) => c.id !== credId);
  save();
}

export function listProjects(): Project[] {
  const db = load();
  return db.projects.filter((p) => p.companyId === companyId());
}
export function addProject(p: Omit<Project, 'id' | 'companyId'>): void {
  const db = load();
  const cid = companyId();
  if (!cid) return;
  db.projects.push({ id: id(), companyId: cid, ...p });
  save();
}
export function deleteProject(projId: string): void {
  const db = load();
  db.projects = db.projects.filter((p) => p.id !== projId);
  save();
}

export function addPerson(p: Omit<Person, 'id' | 'companyId'>): void {
  const db = load();
  const cid = companyId();
  if (!cid) return;
  db.people.push({ id: id(), companyId: cid, ...p });
  save();
}
export function deletePerson(personId: string): void {
  const db = load();
  db.people = db.people.filter((p) => p.id !== personId);
  save();
}

export function addFinancial(f: Omit<FinancialYear, 'id' | 'companyId'>): void {
  const db = load();
  const cid = companyId();
  if (!cid) return;
  // upsert by year
  const existing = db.financials.find((x) => x.companyId === cid && x.year === f.year);
  if (existing) Object.assign(existing, f);
  else db.financials.push({ id: id(), companyId: cid, ...f });
  save();
}
export function deleteFinancial(finId: string): void {
  const db = load();
  db.financials = db.financials.filter((f) => f.id !== finId);
  save();
}

/** Store a stamp, signature or logo asset and point the company record at it. */
export function setAsset(kind: 'stamp' | 'signature' | 'logo', title: string, file?: { fileName: string; filePath: string; mimeType: string; sizeBytes: number }): void {
  const db = load();
  const cid = companyId();
  if (!cid) return;
  const doc: DocumentRec = { id: id(), companyId: cid, kind, title, createdAt: now(), ...(file ?? {}) };
  db.documents.push(doc);
  const c = db.companies[0];
  if (kind === 'stamp') c.stampDocId = doc.id;
  else if (kind === 'signature') c.signatureDocId = doc.id;
  else c.logoDocId = doc.id;
  save();
}

// ---------------- Discovery leads ----------------

export function listLeads(status?: string): TenderLead[] {
  const db = load();
  const cid = companyId();
  return db.leads
    .filter((l) => l.companyId === cid && (!status || l.status === status))
    .sort((a, b) => (a.submissionDeadline ?? '').localeCompare(b.submissionDeadline ?? ''));
}

export function getLead(leadId: string): TenderLead | null {
  return load().leads.find((l) => l.id === leadId) ?? null;
}

export function setLeadStatus(leadId: string, status: string, importedTenderId?: string): void {
  const db = load();
  const l = db.leads.find((x) => x.id === leadId);
  if (!l) return;
  l.status = status;
  if (importedTenderId) l.importedTenderId = importedTenderId;
  save();
}

/** Re-run the discovery feed, adding any leads not already present (by refNo/title). */
export function refreshLeads(): number {
  const db = load();
  const cid = companyId();
  if (!cid) return 0;
  const existing = new Set(db.leads.map((l) => `${l.refNo}|${l.title}`));
  let added = 0;
  for (const l of seedLeads(cid)) {
    const key = `${l.refNo}|${l.title}`;
    if (!existing.has(key)) {
      db.leads.push({ id: id(), createdAt: now(), status: 'new', ...l });
      added++;
    }
  }
  if (added) save();
  return added;
}

// ---------------- Seed ----------------

function seed(db: DB): void {
  const companyId = id();
  const company: Company = {
    id: companyId,
    legalName: 'Get Technologies (Pvt) Ltd',
    brandName: 'Get Technologies',
    orgType: 'Private Limited',
    headOffice: '24-Km Main Ferozepur Road, Kahna Nau, Lahore',
    phone: '+92-321-8438862',
    email: 'demo@gettechnologies.example',
    incorpPlace: 'Lahore',
    incorpYear: 2011,
    secpNumber: '0075153',
    ntn: '3747797',
    readinessScore: 0,
    createdAt: now(),
  };
  db.companies.push(company);

  const stamp: DocumentRec = { id: id(), companyId, kind: 'stamp', title: 'Company e-stamp (seal)', createdAt: now() };
  const signature: DocumentRec = { id: id(), companyId, kind: 'signature', title: 'Authorised signature', createdAt: now() };
  db.documents.push(stamp, signature);
  company.stampDocId = stamp.id;
  company.signatureDocId = signature.id;

  const creds: Omit<Credential, 'id'>[] = [
    { companyId, kind: 'PEC', label: 'PEC Constructor Licence', number: '2384', category: 'C1', expiryDate: '2026-12-31', status: 'active' },
    { companyId, kind: 'NTN', label: 'FBR — NTN (Active Filer)', number: '3747797', status: 'active' },
    { companyId, kind: 'SALES_TAX', label: 'FBR — Sales Tax', number: '3747797-8', status: 'active' },
    { companyId, kind: 'PRA', label: 'Punjab Revenue Authority', number: '3747797-8', status: 'active' },
    { companyId, kind: 'AEDB', label: 'Alternative Energy Development Board', status: 'active' },
    { companyId, kind: 'SECP', label: 'SECP Incorporation', number: '0075153', status: 'active' },
    { companyId, kind: 'ISO', label: 'ISO 9001', status: 'active' },
  ];
  creds.forEach((c) => db.credentials.push({ id: id(), ...c }));

  const projects: Omit<Project, 'id'>[] = [
    { companyId, name: 'Solar LED street lighting — Housing Scheme Phase I', client: 'LDA', valuePkr: 14200000, sector: 'solar', role: 'prime', status: 'completed', capacity: '90 poles' },
    { companyId, name: 'Net-metering PV system — Govt building', client: 'C&W Punjab', valuePkr: 23800000, sector: 'solar', role: 'prime', status: 'completed', capacity: '120 kW' },
    { companyId, name: 'Electrical works — commercial complex', client: 'Private', valuePkr: 8600000, sector: 'electrical', role: 'prime', status: 'completed' },
  ];
  projects.forEach((p) => db.projects.push({ id: id(), ...p }));

  [
    { companyId, name: 'Baqar Bilal Hussain', designation: 'CEO', nationality: 'Pakistani', years: 14 },
    { companyId, name: 'Iqbal Akhtar Hussain', designation: 'Chairman', nationality: 'Pakistani' },
  ].forEach((p) => db.people.push({ id: id(), ...p } as Person));

  [
    { companyId, year: 2025, turnoverPkr: 96000000 },
    { companyId, year: 2024, turnoverPkr: 71000000 },
    { companyId, year: 2023, turnoverPkr: 54000000 },
  ].forEach((f) => db.financials.push({ id: id(), ...f } as FinancialYear));

  // Example tender through the real pipeline
  const ctx: CompanyFull = {
    ...company,
    credentials: db.credentials.filter((c) => c.companyId === companyId),
    projects: db.projects.filter((p) => p.companyId === companyId),
  };
  const extracted = mockExtraction('LDA-Solar-LED-Tender.pdf');
  const elig = evaluateEligibility(ctx, extracted);
  const checklist = buildChecklist(ctx, extracted);

  const tenderId = id();
  db.tenders.push({
    id: tenderId,
    companyId,
    title: extracted.title,
    agency: extracted.agency,
    workType: extracted.workType,
    refNo: 'IPL-40 / 2026',
    method: extracted.method,
    estimatedCostPkr: extracted.estimatedCostPkr,
    earnestMoneyPkr: extracted.earnestMoneyPkr,
    earnestMoneyPct: extracted.earnestMoneyPct,
    requiredPecCat: extracted.requiredPecCat,
    validityDays: extracted.validityDays,
    completionTime: extracted.completionTime,
    submissionDeadline: '2026-01-20',
    openingDate: '2026-01-20',
    summary: extracted.summary,
    extractedJson: JSON.stringify(extracted),
    verdict: elig.verdict,
    predictedScore: elig.predictedScore,
    verdictReasons: JSON.stringify(elig.reasons),
    status: 'evaluating',
    createdAt: now(),
  });
  extracted.requirements.forEach((r) => db.requirements.push({ id: id(), tenderId, text: r.text, type: r.type, category: r.category }));
  checklist.forEach((c) => db.checklist.push({ id: id(), tenderId, label: c.label, required: c.required, status: c.status, aiHelp: c.aiHelp, sortOrder: c.sortOrder }));

  db.reminders.push(
    { id: id(), companyId, tenderId, kind: 'deadline', message: 'Submission deadline — LDA Solar LED tender', dueDate: '2026-01-20', done: false, createdAt: now() },
    { id: id(), companyId, kind: 'licence_expiry', message: 'PEC licence renews on 31 Dec 2026', dueDate: '2026-12-31', done: false, createdAt: now() },
  );

  // Readiness
  let score = 20 + Math.min(25, creds.length * 5) + Math.min(20, projects.length * 7) + 10 + 15 + 5;
  company.readinessScore = Math.min(100, score);
}
