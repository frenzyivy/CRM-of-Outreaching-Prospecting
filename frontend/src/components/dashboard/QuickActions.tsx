import { useState, useRef } from 'react'
import { UserPlus, Phone, Mail, Upload, X } from 'lucide-react'
import api from '../../api/client'

export default function QuickActions() {
  const [showAddLead, setShowAddLead] = useState(false)
  const [showLogCall, setShowLogCall] = useState(false)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Add Lead modal state
  const [leadForm, setLeadForm] = useState({ full_name: '', email: '', company_name: '', phone: '' })
  const [leadSaving, setLeadSaving] = useState(false)

  // Log Call modal state
  const [callForm, setCallForm] = useState({ lead_id: '', description: '' })
  const [callSaving, setCallSaving] = useState(false)

  // Send Email modal state
  const [emailForm, setEmailForm] = useState({ lead_id: '', description: '' })
  const [emailSaving, setEmailSaving] = useState(false)

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/leads/import', form)
      setUploadResult(`Imported: ${res.data.inserted ?? 0} new, ${res.data.updated ?? 0} updated, ${res.data.skipped ?? 0} skipped`)
    } catch {
      setUploadResult('Import failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleAddLead = async () => {
    if (!leadForm.email) return
    setLeadSaving(true)
    try {
      const form = new FormData()
      const csv = `email,full_name,company_name,phone\n${leadForm.email},${leadForm.full_name},${leadForm.company_name},${leadForm.phone}`
      form.append('file', new Blob([csv], { type: 'text/csv' }), 'new_lead.csv')
      await api.post('/leads/import', form)
      setShowAddLead(false)
      setLeadForm({ full_name: '', email: '', company_name: '', phone: '' })
    } catch { /* ignore */ }
    setLeadSaving(false)
  }

  const handleLogCall = async () => {
    if (!callForm.lead_id || !callForm.description) return
    setCallSaving(true)
    try {
      await api.post('/activities', { lead_id: callForm.lead_id, activity_type: 'call', description: callForm.description })
      setShowLogCall(false)
      setCallForm({ lead_id: '', description: '' })
    } catch { /* ignore */ }
    setCallSaving(false)
  }

  const handleSendEmail = async () => {
    if (!emailForm.lead_id || !emailForm.description) return
    setEmailSaving(true)
    try {
      await api.post('/activities', { lead_id: emailForm.lead_id, activity_type: 'email', description: emailForm.description })
      setShowSendEmail(false)
      setEmailForm({ lead_id: '', description: '' })
    } catch { /* ignore */ }
    setEmailSaving(false)
  }

  const actions = [
    { label: 'Add Lead', icon: UserPlus, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30', onClick: () => setShowAddLead(true) },
    { label: 'Log Call', icon: Phone, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30', onClick: () => setShowLogCall(true) },
    { label: 'Send Email', icon: Mail, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', onClick: () => setShowSendEmail(true) },
    { label: 'Import CSV', icon: Upload, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30', onClick: () => fileRef.current?.click() },
  ]

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600`}
          >
            <div className={`p-1 rounded-lg ${a.color}`}>
              <a.icon size={14} />
            </div>
            {a.label}
          </button>
        ))}
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportCSV} />
        {uploading && <span className="text-xs text-slate-400 animate-pulse">Uploading...</span>}
        {uploadResult && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            {uploadResult}
            <button onClick={() => setUploadResult(null)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
          </span>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddLead && (
        <Modal title="Add Lead" onClose={() => setShowAddLead(false)}>
          <div className="space-y-3">
            <Input label="Full Name" value={leadForm.full_name} onChange={(v) => setLeadForm({ ...leadForm, full_name: v })} />
            <Input label="Email *" value={leadForm.email} onChange={(v) => setLeadForm({ ...leadForm, email: v })} />
            <Input label="Company" value={leadForm.company_name} onChange={(v) => setLeadForm({ ...leadForm, company_name: v })} />
            <Input label="Phone" value={leadForm.phone} onChange={(v) => setLeadForm({ ...leadForm, phone: v })} />
            <button onClick={handleAddLead} disabled={leadSaving || !leadForm.email} className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
              {leadSaving ? 'Saving...' : 'Add Lead'}
            </button>
          </div>
        </Modal>
      )}

      {/* Log Call Modal */}
      {showLogCall && (
        <Modal title="Log Call" onClose={() => setShowLogCall(false)}>
          <div className="space-y-3">
            <Input label="Lead ID" value={callForm.lead_id} onChange={(v) => setCallForm({ ...callForm, lead_id: v })} placeholder="Paste lead UUID" />
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <textarea value={callForm.description} onChange={(e) => setCallForm({ ...callForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
            <button onClick={handleLogCall} disabled={callSaving || !callForm.lead_id} className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {callSaving ? 'Saving...' : 'Log Call'}
            </button>
          </div>
        </Modal>
      )}

      {/* Send Email Modal */}
      {showSendEmail && (
        <Modal title="Log Email" onClose={() => setShowSendEmail(false)}>
          <div className="space-y-3">
            <Input label="Lead ID" value={emailForm.lead_id} onChange={(v) => setEmailForm({ ...emailForm, lead_id: v })} placeholder="Paste lead UUID" />
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subject / Notes</label>
              <textarea value={emailForm.description} onChange={(e) => setEmailForm({ ...emailForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
            </div>
            <button onClick={handleSendEmail} disabled={emailSaving || !emailForm.lead_id} className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {emailSaving ? 'Saving...' : 'Log Email'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
      />
    </div>
  )
}
