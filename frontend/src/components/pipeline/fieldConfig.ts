export type CompanyField = 'industry' | 'city_country' | 'phone' | 'website' | 'notes' | 'created_at'
export type LeadField   = 'job_title' | 'company' | 'email' | 'phone' | 'city_country' | 'source' | 'linkedin' | 'notion_url' | 'created_at'

export interface FieldDef { label: string; defaultOn: boolean }

export const COMPANY_FIELDS: Record<CompanyField, FieldDef> = {
  industry:    { label: 'Industry',   defaultOn: true  },
  city_country:{ label: 'Location',   defaultOn: true  },
  phone:       { label: 'Phone',      defaultOn: false },
  website:     { label: 'Website',    defaultOn: false },
  notes:       { label: 'Notes',      defaultOn: false },
  created_at:  { label: 'Date added', defaultOn: true  },
}

export const LEAD_FIELDS: Record<LeadField, FieldDef> = {
  job_title:   { label: 'Job title',  defaultOn: true  },
  company:     { label: 'Company',    defaultOn: true  },
  email:       { label: 'Email',      defaultOn: true  },
  phone:       { label: 'Phone',      defaultOn: false },
  city_country:{ label: 'Location',   defaultOn: true  },
  source:      { label: 'Source',     defaultOn: false },
  linkedin:    { label: 'LinkedIn',   defaultOn: false },
  notion_url:  { label: 'Notion',     defaultOn: false },
  created_at:  { label: 'Date added', defaultOn: true  },
}

const LS_COMPANY = 'pipeline_company_fields_v2'
const LS_LEAD    = 'pipeline_lead_fields_v2'

function loadSet<T extends string>(key: string, defaults: Record<T, FieldDef>): Set<T> {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return new Set(JSON.parse(raw) as T[])
  } catch { /* ignore */ }
  return new Set(
    (Object.entries(defaults) as [T, FieldDef][])
      .filter(([, d]) => d.defaultOn)
      .map(([k]) => k)
  )
}

function saveSet<T extends string>(key: string, set: Set<T>) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

export function loadCompanyFields() { return loadSet<CompanyField>(LS_COMPANY, COMPANY_FIELDS) }
export function loadLeadFields()    { return loadSet<LeadField>(LS_LEAD, LEAD_FIELDS) }
export function saveCompanyFields(s: Set<CompanyField>) { saveSet(LS_COMPANY, s) }
export function saveLeadFields(s: Set<LeadField>)       { saveSet(LS_LEAD, s) }
