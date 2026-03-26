import { useEffect, useRef, useState } from 'react'
import { LayoutList } from 'lucide-react'
import type { CompanyField, LeadField } from './fieldConfig'
import { COMPANY_FIELDS, LEAD_FIELDS } from './fieldConfig'

interface CompanyProps {
  mode: 'company'
  visible: Set<CompanyField>
  onChange: (next: Set<CompanyField>) => void
}
interface LeadProps {
  mode: 'lead'
  visible: Set<LeadField>
  onChange: (next: Set<LeadField>) => void
}
type Props = CompanyProps | LeadProps

export default function FieldsToggle(props: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fields = props.mode === 'company' ? COMPANY_FIELDS : LEAD_FIELDS

  function toggle(key: string) {
    if (props.mode === 'company') {
      const next = new Set(props.visible)
      if (next.has(key as CompanyField)) next.delete(key as CompanyField)
      else next.add(key as CompanyField)
      props.onChange(next)
    } else {
      const next = new Set(props.visible)
      if (next.has(key as LeadField)) next.delete(key as LeadField)
      else next.add(key as LeadField)
      props.onChange(next)
    }
  }

  const visibleCount = props.visible.size

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors shadow-sm ${
          open
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <LayoutList size={14} />
        Properties
        <span className="text-[11px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0 font-semibold">
          {visibleCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-52 p-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2.5 pt-1.5 pb-2">
            {props.mode === 'company' ? 'Company' : 'Lead'} card properties
          </p>
          {(Object.entries(fields) as [string, { label: string }][]).map(([key, def]) => {
            const on = props.visible.has(key as never)
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <span className="text-sm text-slate-700">{def.label}</span>
                {/* Toggle pill */}
                <span
                  className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-200 ${
                    on ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${
                      on ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
