import { X, Settings, User, Bell, Shield, Palette, Save } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onClose: () => void
}

type Tab = 'profile' | 'notifications' | 'security' | 'appearance'

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

export default function SettingsModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)

  // Profile fields
  const [name, setName] = useState('Komal Singh')
  const [email] = useState('komal@allianzaai.com')
  const [role, setRole] = useState('Sales Manager')
  const [phone, setPhone] = useState('+1 (555) 000-0000')

  // Notification toggles
  const [notifs, setNotifs] = useState({
    emailAlerts: true,
    leadAssigned: true,
    pipelineUpdates: true,
    weeklyReport: false,
    systemUpdates: true,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <Settings size={16} className="text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Settings</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-44 border-r border-slate-200 py-4 shrink-0">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === 'profile' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-white">
                      K
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{email}</p>
                      <button className="text-xs text-blue-600 mt-1 hover:underline">
                        Change photo
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name', value: name, setter: setName },
                      { label: 'Role / Title', value: role, setter: setRole },
                      { label: 'Email Address', value: email, setter: () => {} },
                      { label: 'Phone Number', value: phone, setter: setPhone },
                    ].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          {label}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          disabled={label === 'Email Address'}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Choose which notifications you want to receive.
                  </p>
                  {[
                    { key: 'emailAlerts', label: 'Email Alerts', desc: 'Get email for important activity' },
                    { key: 'leadAssigned', label: 'Lead Assigned', desc: 'Notify when a lead is assigned to me' },
                    { key: 'pipelineUpdates', label: 'Pipeline Updates', desc: 'Stage changes on my leads' },
                    { key: 'weeklyReport', label: 'Weekly Summary', desc: 'Weekly digest of your activity' },
                    { key: 'systemUpdates', label: 'System Updates', desc: 'New features and maintenance notices' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          notifs[key as keyof typeof notifs] ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            notifs[key as keyof typeof notifs] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Shield size={16} className="text-emerald-600" />
                    <p className="text-sm text-emerald-700 font-medium">
                      Your account is secured
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-3">
                      Two-Factor Authentication
                    </p>
                    <button className="text-sm text-blue-600 font-medium hover:underline">
                      Enable 2FA →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-5">
                  <p className="text-sm text-slate-500">
                    Appearance preferences are managed via the Theme toggle in your profile menu.
                    Use Light, Dark, or System to match your OS setting.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Light', preview: 'bg-white border-slate-200', text: 'text-slate-900' },
                      { label: 'Dark', preview: 'bg-slate-900 border-slate-700', text: 'text-white' },
                      { label: 'System', preview: 'bg-gradient-to-br from-white to-slate-900 border-slate-400', text: 'text-slate-600' },
                    ].map(({ label, preview, text }) => (
                      <div
                        key={label}
                        className={`rounded-xl border-2 p-3 cursor-pointer ${preview} hover:scale-105 transition-transform`}
                      >
                        <p className={`text-xs font-semibold text-center ${text}`}>{label}</p>
                        <div className="mt-2 space-y-1">
                          <div className={`h-2 rounded ${label === 'Dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />
                          <div className={`h-2 rounded w-3/4 ${label === 'Dark' ? 'bg-slate-600' : 'bg-slate-100'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-700'
              }`}
            >
              <Save size={14} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
