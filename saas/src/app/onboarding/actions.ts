'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as store from '@/lib/store';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function str(fd: FormData, k: string): string | null {
  const v = fd.get(k);
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
}
function num(fd: FormData, k: string): number | null {
  const s = str(fd, k);
  if (!s) return null;
  const n = Number(s.replace(/[, ]/g, ''));
  return isNaN(n) ? null : n;
}

function refresh() {
  store.computeReadiness();
  revalidatePath('/onboarding');
  revalidatePath('/company');
  revalidatePath('/');
}

// ---- Step 1: identity ----
export async function saveIdentity(formData: FormData): Promise<void> {
  store.updateCompany({
    legalName: str(formData, 'legalName') ?? 'My Company',
    brandName: str(formData, 'brandName'),
    orgType: str(formData, 'orgType'),
    headOffice: str(formData, 'headOffice'),
    phone: str(formData, 'phone'),
    email: str(formData, 'email'),
    incorpPlace: str(formData, 'incorpPlace'),
    incorpYear: num(formData, 'incorpYear'),
    secpNumber: str(formData, 'secpNumber'),
    ntn: str(formData, 'ntn'),
  });
  refresh();
  redirect('/onboarding?step=2');
}

// ---- Step 2: credentials ----
export async function addCredential(formData: FormData): Promise<void> {
  const kind = str(formData, 'kind') ?? 'OTHER';
  store.addCredential({
    kind,
    label: str(formData, 'label') ?? kind,
    number: str(formData, 'number'),
    category: kind === 'PEC' ? str(formData, 'category') : null,
    expiryDate: str(formData, 'expiryDate'),
    status: 'active',
  });
  refresh();
  redirect('/onboarding?step=2');
}
export async function removeCredential(id: string): Promise<void> {
  store.deleteCredential(id);
  refresh();
  redirect('/onboarding?step=2');
}

// ---- Step 3: projects ----
export async function addProject(formData: FormData): Promise<void> {
  store.addProject({
    name: str(formData, 'name') ?? 'Untitled project',
    client: str(formData, 'client'),
    valuePkr: num(formData, 'valuePkr'),
    sector: str(formData, 'sector'),
    role: str(formData, 'role'),
    status: str(formData, 'status') ?? 'completed',
    capacity: str(formData, 'capacity'),
    endDate: str(formData, 'endDate'),
  });
  refresh();
  redirect('/onboarding?step=3');
}
export async function removeProject(id: string): Promise<void> {
  store.deleteProject(id);
  refresh();
  redirect('/onboarding?step=3');
}

// ---- Step 4: people ----
export async function addPerson(formData: FormData): Promise<void> {
  store.addPerson({
    name: str(formData, 'name') ?? 'Unnamed',
    designation: str(formData, 'designation'),
    qualification: str(formData, 'qualification'),
    pecReg: str(formData, 'pecReg'),
    years: num(formData, 'years'),
    nationality: str(formData, 'nationality'),
  });
  refresh();
  redirect('/onboarding?step=4');
}
export async function removePerson(id: string): Promise<void> {
  store.deletePerson(id);
  refresh();
  redirect('/onboarding?step=4');
}

// ---- Step 5: financials ----
export async function addFinancial(formData: FormData): Promise<void> {
  const year = num(formData, 'year');
  if (!year) {
    redirect('/onboarding?step=5');
  }
  store.addFinancial({ year: year!, turnoverPkr: num(formData, 'turnoverPkr'), netWorthPkr: num(formData, 'netWorthPkr') });
  refresh();
  redirect('/onboarding?step=5');
}
export async function removeFinancial(id: string): Promise<void> {
  store.deleteFinancial(id);
  refresh();
  redirect('/onboarding?step=5');
}

// ---- Step 6: assets + finish ----
export async function saveAsset(formData: FormData): Promise<void> {
  const kind = (str(formData, 'kind') as 'stamp' | 'signature') ?? 'stamp';
  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safe = `${kind}-${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safe);
    await fs.writeFile(filePath, bytes);
    store.setAsset(kind, file.name, { fileName: file.name, filePath, mimeType: file.type, sizeBytes: file.size });
  } else {
    // Mark as provided without a file (e.g. captured elsewhere) so the flow can proceed.
    store.setAsset(kind, kind === 'stamp' ? 'Company e-stamp' : 'Authorised signature');
  }
  refresh();
  redirect('/onboarding?step=6');
}

export async function finishOnboarding(): Promise<void> {
  refresh();
  redirect('/?onboarded=1');
}
