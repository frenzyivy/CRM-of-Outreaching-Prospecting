import { useState } from 'react'
import Header from '../layout/Header'
import CompanyTable from './CompanyTable'
import LeadDetailModal from './LeadDetailModal'
import type { Company } from '../../types'

export default function CompaniesPage() {
  const [selected, setSelected] = useState<Company | null>(null)

  return (
    <div>
      <Header title="Companies" subtitle="Browse and manage company accounts" />
      <CompanyTable onSelect={setSelected} />
      {selected && (
        <LeadDetailModal lead={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
