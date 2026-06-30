import { getCompany, computeReadiness as storeReadiness } from './store';
import type { CompanyContext } from './eligibility';

/**
 * MVP single-workspace model: operate on the seeded company.
 * Phase-2 next step: real multi-tenant auth → resolve company from session.
 */
export function getCurrentCompany(): CompanyContext | null {
  return getCompany();
}

export function requireCompany(): CompanyContext {
  const c = getCompany();
  if (!c) throw new Error('No company found.');
  return c;
}

export function computeReadiness(): number {
  return storeReadiness();
}
