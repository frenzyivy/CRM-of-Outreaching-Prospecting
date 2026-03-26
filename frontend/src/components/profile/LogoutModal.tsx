import { X, LogOut } from 'lucide-react'

interface Props {
  onClose: () => void
  onConfirm: () => void
}

export default function LogoutModal({ onClose, onConfirm }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <LogOut size={16} className="text-red-500" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Sign Out</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to sign out of <span className="font-semibold text-slate-900">AI Medical CRM</span>?
              Your data and pipeline will be saved automatically.
            </p>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl border border-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Stay signed in
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
