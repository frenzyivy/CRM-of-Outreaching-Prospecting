import { useState } from 'react'
import {
  Sparkles, Mail, MessageSquare, Copy, Check, Loader2,
  Send, PenTool, RefreshCw, ChevronDown, AlertCircle
} from 'lucide-react'
import {
  useAgentStatus,
  useDraftEmail,
  useDraftFollowUp,
  useFreeform,
} from '../../hooks/useAgent'

type AgentAction = 'cold_email' | 'follow_up_1' | 'follow_up_2' | 'freeform'

interface Props {
  leadId: string
  leadName: string
  leadEmail: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function AgentPanel({ leadId, leadName, leadEmail }: Props) {
  const { data: status } = useAgentStatus()
  const draftEmail = useDraftEmail()
  const draftFollowUp = useDraftFollowUp()
  const freeform = useFreeform()

  const [customInstructions, setCustomInstructions] = useState('')
  const [freeformPrompt, setFreeformPrompt] = useState('')
  const [activeAction, setActiveAction] = useState<AgentAction | null>(null)
  const [showActions, setShowActions] = useState(true)

  const isLoading = draftEmail.isPending || draftFollowUp.isPending || freeform.isPending
  const result = draftEmail.data || draftFollowUp.data || freeform.data
  const error = draftEmail.error || draftFollowUp.error || freeform.error

  const handleAction = (action: AgentAction) => {
    setActiveAction(action)
    setShowActions(false)

    // Reset previous results
    draftEmail.reset()
    draftFollowUp.reset()
    freeform.reset()

    if (action === 'cold_email') {
      draftEmail.mutate({ lead_id: leadId, custom_instructions: customInstructions })
    } else if (action === 'follow_up_1') {
      draftFollowUp.mutate({ lead_id: leadId, follow_up_number: 1, custom_instructions: customInstructions })
    } else if (action === 'follow_up_2') {
      draftFollowUp.mutate({ lead_id: leadId, follow_up_number: 2, custom_instructions: customInstructions })
    }
  }

  const handleFreeform = () => {
    if (!freeformPrompt.trim()) return
    setActiveAction('freeform')
    setShowActions(false)

    draftEmail.reset()
    draftFollowUp.reset()
    freeform.reset()

    freeform.mutate({ prompt: freeformPrompt, lead_id: leadId })
  }

  const handleReset = () => {
    setActiveAction(null)
    setShowActions(true)
    setCustomInstructions('')
    setFreeformPrompt('')
    draftEmail.reset()
    draftFollowUp.reset()
    freeform.reset()
  }

  if (!status?.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-amber-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">AI Agent Not Configured</p>
        <p className="text-xs text-slate-400 mt-2 max-w-xs">
          Add your API key in Settings &rarr; Integrations to enable AI-powered email drafting, follow-ups, and content generation.
        </p>
        <div className="mt-3 px-3 py-1.5 bg-slate-50 rounded-lg">
          <code className="text-[10px] text-slate-500">
            {status?.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'}
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-50">
              <Sparkles size={14} className="text-violet-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">AI Agent</h4>
              <p className="text-[10px] text-slate-400">
                {status.provider === 'openai' ? 'OpenAI' : 'Claude'} &middot; {leadName}
              </p>
            </div>
          </div>
          {activeAction && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <RefreshCw size={12} />
              New
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Quick Actions */}
        {showActions && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Quick Actions</p>

            <button
              onClick={() => handleAction('cold_email')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Mail size={16} className="text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">Draft Cold Email</p>
                <p className="text-[11px] text-slate-400">Personalized outreach for {leadName}</p>
              </div>
            </button>

            <button
              onClick={() => handleAction('follow_up_1')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-green-200 hover:bg-green-50/50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                <Send size={16} className="text-green-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">Follow-up #1</p>
                <p className="text-[11px] text-slate-400">Add a new value angle</p>
              </div>
            </button>

            <button
              onClick={() => handleAction('follow_up_2')}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                <MessageSquare size={16} className="text-amber-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">Follow-up #2 (Break-up)</p>
                <p className="text-[11px] text-slate-400">Graceful last attempt</p>
              </div>
            </button>

            {/* Custom Instructions */}
            <div className="mt-4">
              <button
                onClick={() => setCustomInstructions(customInstructions ? '' : ' ')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <PenTool size={11} />
                Custom instructions
                <ChevronDown size={11} className={`transition-transform ${customInstructions ? 'rotate-180' : ''}`} />
              </button>
              {customInstructions !== '' && (
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Mention our free trial, focus on compliance..."
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
                  rows={2}
                />
              )}
            </div>

            {/* Freeform divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] text-slate-300 uppercase">or ask anything</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Freeform input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={freeformPrompt}
                onChange={(e) => setFreeformPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFreeform()}
                placeholder="Write a message about..."
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
              <button
                onClick={handleFreeform}
                disabled={!freeformPrompt.trim()}
                className="px-3 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Loader2 size={20} className="text-violet-500 animate-spin" />
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4 font-medium">
              {activeAction === 'freeform' ? 'Thinking...' : 'Drafting email...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Using lead context to personalize</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Generation Failed</p>
                <p className="text-xs text-red-500 mt-1">{error.message}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-3 text-xs text-red-600 hover:text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Result */}
        {result && !isLoading && (
          <div className="space-y-3 mt-1">
            {/* Result header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-green-50">
                  <Check size={12} className="text-green-500" />
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {activeAction === 'freeform' ? 'Response' :
                   activeAction === 'cold_email' ? 'Cold Email Draft' :
                   `Follow-up #${activeAction === 'follow_up_1' ? '1' : '2'} Draft`}
                </span>
              </div>
              <CopyButton text={'email_body' in result ? result.email_body : result.content} />
            </div>

            {/* Email recipient */}
            {'email_to' in result && result.email_to && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <Mail size={12} className="text-slate-400" />
                <span className="text-xs text-slate-500">To:</span>
                <span className="text-xs text-slate-700">{result.email_to}</span>
              </div>
            )}

            {/* Generated content */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed m-0">
                  {'email_body' in result ? result.email_body : result.content}
                </pre>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  if (activeAction && activeAction !== 'freeform') {
                    handleAction(activeAction)
                  } else if (activeAction === 'freeform') {
                    handleFreeform()
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <Sparkles size={12} />
                New action
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
