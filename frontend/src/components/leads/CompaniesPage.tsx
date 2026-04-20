import { useState } from 'react'
import Header from '../layout/Header'
import CompanyTable from './CompanyTable'
import CompanyDetailDrawer from './CompanyDetailDrawer'
import type { NormalizedCompany } from '../../types'

export default function CompaniesPage() {
  const [selected, setSelected] = useState<NormalizedCompany | null>(null)

  return (
    <div>
      <Header title="Companies" subtitle="Browse and manage company accounts" />
      <CompanyTable onSelect={setSelected} />
      {selected && (
        <CompanyDetailDrawer
          company={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
