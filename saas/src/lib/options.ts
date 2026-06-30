// Shared select options for onboarding forms.

export const ORG_TYPES = ['Private Limited', 'Public Limited', 'Sole Proprietor', 'Partnership', 'Joint Venture'];

export const CREDENTIAL_KINDS: { value: string; label: string; hasCategory?: boolean }[] = [
  { value: 'PEC', label: 'PEC Constructor Licence', hasCategory: true },
  { value: 'NTN', label: 'FBR — NTN (Active Filer)' },
  { value: 'SALES_TAX', label: 'FBR — Sales Tax' },
  { value: 'PRA', label: 'Provincial Revenue Authority (PRA/SRB/etc.)' },
  { value: 'AEDB', label: 'AEDB (Alternative Energy)' },
  { value: 'SECP', label: 'SECP Incorporation' },
  { value: 'ISO', label: 'ISO Certification' },
  { value: 'OTHER', label: 'Other registration / enlistment' },
];

export const PEC_CATEGORY_OPTIONS = ['CA', 'CB', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

export const SECTORS = ['solar', 'electrical', 'roads', 'buildings', 'water', 'mechanical', 'telecom', 'other'];

export const PROJECT_ROLES = ['prime', 'sub', 'jv'];

export const STEPS = [
  { n: 1, key: 'company', label: 'Company', hint: 'Who you are' },
  { n: 2, key: 'registrations', label: 'Registrations', hint: 'Licences & tax' },
  { n: 3, key: 'experience', label: 'Experience', hint: 'Past projects' },
  { n: 4, key: 'team', label: 'Team', hint: 'Key people' },
  { n: 5, key: 'financials', label: 'Financials', hint: 'Turnover' },
  { n: 6, key: 'assets', label: 'Stamp & finish', hint: 'Seal & signature' },
];
