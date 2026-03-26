import { useState } from 'react'
import Header from '../layout/Header'
import ContactTable from './ContactTable'
import LeadDetailModal from './LeadDetailModal'
import type { Contact } from '../../types'

export default function ContactsPage() {
  const [selected, setSelected] = useState<Contact | null>(null)

  return (
    <div>
      <Header title="Contacts" subtitle="Manage individual contact records" />
      <ContactTable onSelect={setSelected} />
      {selected && (
        <LeadDetailModal lead={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
