import { useState } from 'react'
import { Search } from 'lucide-react'
import { useContacts } from '../../hooks/useLeads'
import Badge from '../common/Badge'
import type { Contact } from '../../types'

interface Props {
  onSelect: (lead: Contact) => void
}

export default function ContactTable({ onSelect }: Props) {
  const { data: contacts, isLoading } = useContacts()
  const [search, setSearch] = useState('')

  const filtered = (contacts || []).filter((c) => {
    const q = search.toLowerCase()
    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return <div className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-left border-b border-slate-100">
              <th className="px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 font-medium text-slate-600">Title</th>
              <th className="px-4 py-3 font-medium text-slate-600">Company</th>
              <th className="px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 font-medium text-slate-600">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onSelect(contact)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {contact.first_name} {contact.last_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{contact.title}</td>
                <td className="px-4 py-3 text-slate-600">{contact.company}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{contact.email}</td>
                <td className="px-4 py-3">
                  <Badge stage={contact.stage} label={contact.stage_label} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-slate-100 text-xs text-slate-400">
        {filtered.length} of {contacts?.length || 0} contacts
      </div>
    </div>
  )
}
