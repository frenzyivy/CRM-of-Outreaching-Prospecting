import { X, Gift, Copy, Check, Share2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onClose: () => void
}

const INVITE_LINK = 'https://aimedicalcrm.app/invite/komal-k9x2'

export default function InviteModal({ onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(INVITE_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Gift size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Invite a Friend & Earn</h2>
                <p className="text-xs text-slate-500">Get rewards for every referral</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Banner */}
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600 mb-1">$20 Credit</p>
              <p className="text-sm text-amber-700">
                For every friend who signs up and activates a paid plan
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {[
                { step: '1', text: 'Share your unique invite link' },
                { step: '2', text: 'Friend signs up using your link' },
                { step: '3', text: 'They activate any paid plan' },
                { step: '4', text: 'You both get $20 account credit' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>

            {/* Invite link */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Your invite link
              </p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <Share2 size={14} className="text-slate-400 shrink-0" />
                <span className="flex-1 text-sm text-slate-600 truncate font-mono">
                  {INVITE_LINK}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                    copied
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Pending rewards */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Pending rewards</p>
                <p className="text-lg font-bold text-slate-900">$0.00</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total earned</p>
                <p className="text-lg font-bold text-slate-900">$0.00</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Friends invited</p>
                <p className="text-lg font-bold text-slate-900">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
