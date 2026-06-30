// PEC constructor category logic.
//
// Categories from least to most capable. A higher rank = larger projects allowed.
// In Pakistani tenders a requirement of "C-6 & Above" means the *minimum*
// capability is C6, and any higher category also qualifies. So a firm qualifies
// when its rank >= the required category's rank.

const ORDER = ['C6', 'C5', 'C4', 'C3', 'C2', 'C1', 'CB', 'CA'] as const;
export type PecCategory = (typeof ORDER)[number];

/** Normalise inputs like "c-1", "C 1", "Category C1" → "C1". */
export function normalizePec(input?: string | null): PecCategory | null {
  if (!input) return null;
  const m = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // C-A / C-B
  if (m.includes('CA')) return 'CA';
  if (m.includes('CB')) return 'CB';
  const num = m.match(/C\s*([1-6])/) ?? m.match(/([1-6])/);
  if (num) {
    const cat = ('C' + num[1]) as PecCategory;
    return ORDER.includes(cat) ? cat : null;
  }
  return null;
}

export function pecRank(cat?: string | null): number {
  const n = normalizePec(cat);
  return n ? ORDER.indexOf(n) + 1 : 0; // 0 = unknown
}

/** Does `held` satisfy a tender requiring `required` (treated as a floor)? */
export function pecQualifies(held?: string | null, required?: string | null): boolean {
  const heldRank = pecRank(held);
  const reqRank = pecRank(required);
  if (!reqRank) return true; // no requirement stated → not a blocker
  if (!heldRank) return false; // required but firm has none
  return heldRank >= reqRank;
}

export const PEC_CATEGORIES = ORDER;
