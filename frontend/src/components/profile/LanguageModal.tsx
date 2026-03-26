import { X, Globe, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onClose: () => void
}

const languages = [
  { code: 'en', label: 'English', region: 'United States', flag: '🇺🇸' },
  { code: 'en-gb', label: 'English', region: 'United Kingdom', flag: '🇬🇧' },
  { code: 'es', label: 'Español', region: 'Spain', flag: '🇪🇸' },
  { code: 'es-mx', label: 'Español', region: 'Mexico', flag: '🇲🇽' },
  { code: 'fr', label: 'Français', region: 'France', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', region: 'Germany', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', region: 'Brazil', flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी', region: 'India', flag: '🇮🇳' },
  { code: 'ar', label: 'العربية', region: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'zh', label: '中文', region: 'China', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', region: 'Japan', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', region: 'South Korea', flag: '🇰🇷' },
]

export default function LanguageModal({ onClose }: Props) {
  const [selected, setSelected] = useState('en')
  const [search, setSearch] = useState('')

  const filtered = languages.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.region.toLowerCase().includes(search.toLowerCase())
  )

  const handleApply = () => {
    // In a real app, this would update i18n context
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Globe size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Language</h2>
                <p className="text-xs text-slate-500">Choose your display language</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50"
            />
          </div>

          {/* Language List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-900">{lang.label}</p>
                  <p className="text-xs text-slate-500">{lang.region}</p>
                </div>
                {selected === lang.code && (
                  <Check size={16} className="text-blue-600" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                No languages found for "{search}"
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-2xl border border-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
