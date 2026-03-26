import { X, HelpCircle, ChevronDown, ChevronUp, MessageCircle, BookOpen, Video } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onClose: () => void
}

const faqs = [
  {
    q: 'How do I import leads from Excel?',
    a: 'Go to the Companies or Contacts page and click the "Import" button. Upload your Excel (.xlsx) file and map the columns to the correct fields. The system will import and deduplicate automatically.',
  },
  {
    q: 'How does the email campaign work?',
    a: 'Navigate to the Email section, compose your message, and select a recipient list from your contacts. You can personalize with merge fields like {{first_name}} and {{company}}. Track open rates in the campaign report.',
  },
  {
    q: 'Can I assign leads to other team members?',
    a: 'Yes. Open any lead, click the "Assigned To" dropdown in the detail panel, and select a team member. They will receive a notification and the lead will appear in their filtered view.',
  },
  {
    q: 'What does the pipeline stage represent?',
    a: 'Each stage reflects where a prospect is in your sales cycle: New → Contacted → Qualified → Proposal Sent → Closed. Drag and drop cards in the Pipeline view to move them between stages.',
  },
  {
    q: 'How is lead score calculated?',
    a: 'Lead score is based on engagement signals: email opens, replies, call duration, website visits, and time since last activity. Scores range from 0–100 and refresh every 30 minutes.',
  },
]

export default function HelpCenterModal({ onClose }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <HelpCircle size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Help Center</h2>
                <p className="text-xs text-slate-500">Docs, FAQs & support</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Quick links */}
          <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-slate-200">
            {[
              { icon: BookOpen, label: 'Documentation', color: 'text-blue-600 bg-blue-50' },
              { icon: Video, label: 'Video Guides', color: 'text-purple-600 bg-purple-50' },
              { icon: MessageCircle, label: 'Live Chat', color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ icon: Icon, label, color }) => (
              <button
                key={label}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>

          {/* FAQs */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Frequently Asked Questions
            </p>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900 pr-4">{faq.q}</span>
                    {openIndex === i ? (
                      <ChevronUp size={16} className="text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                  {openIndex === i && (
                    <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
