import { useState, useRef, useEffect, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { Bot, Send, Loader2, Sparkles, Plus, MessageSquare, Trash2 } from 'lucide-react'
import { useAssistantChat, useRefreshGroups } from '../../hooks/useAssistant'
import type { AssistantChatMessage } from '../../hooks/useAssistant'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolsUsed?: string[]
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  history: AssistantChatMessage[]
  createdAt: number
  updatedAt: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'assistant_sessions'
const MAX_SESSIONS = 50
const GROUP_TOOLS = new Set(['create_group', 'add_leads_to_group'])

const SUGGESTIONS = [
  'How many leads do I have?',
  'Show me leads from Germany',
  'Show me all dentists in Poland',
  "Create a group called 'Dentists Poland'",
  'List my groups',
  'What is the pipeline stage breakdown?',
]

const TOOL_LABEL: Record<string, string> = {
  get_lead_stats:     'queried lead stats',
  search_leads:       'searched leads',
  get_company_stats:  'queried companies',
  get_pipeline_stats: 'queried pipeline',
  create_group:       'created group',
  add_leads_to_group: 'added leads to group',
  list_groups:        'listed groups',
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)))
  } catch { /* storage full */ }
}

function makeTitle(text: string): string {
  const t = text.trim()
  return t.length > 42 ? t.slice(0, 42) + '…' : t
}

function newSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const s = loadSessions()
    return s.length > 0 ? s : [newSession()]
  })
  const [activeId, setActiveId] = useState<string>(() => {
    const s = loadSessions()
    return s.length > 0 ? s[0].id : sessions[0]?.id ?? ''
  })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const chat = useAssistantChat()
  const refreshGroups = useRefreshGroups()

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0]

  useEffect(() => { saveSessions(sessions) }, [sessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, chat.isPending])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }, [input])

  const updateSession = useCallback((id: string, patch: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s))
    )
  }, [])

  function createNewSession() {
    const s = newSession()
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
    setInput('')
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (next.length === 0) {
        const fresh = newSession()
        setActiveId(fresh.id)
        return [fresh]
      }
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending || !activeSession) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const isFirst = activeSession.messages.length === 0

    updateSession(activeId, {
      messages: [...activeSession.messages, userMsg],
      title: isFirst ? makeTitle(trimmed) : activeSession.title,
    })

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeId)
      if (idx <= 0) return prev
      const updated = [...prev]
      const [item] = updated.splice(idx, 1)
      return [item, ...updated]
    })

    setInput('')

    chat.mutate(
      { message: trimmed, history: activeSession.history },
      {
        onSuccess: (data) => {
          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            toolsUsed: data.tool_calls_made,
          }
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== activeId) return s
              return {
                ...s,
                messages: [...s.messages, assistantMsg],
                history: [
                  ...s.history,
                  { role: 'user' as const, content: trimmed },
                  { role: 'assistant' as const, content: data.reply },
                ],
                updatedAt: Date.now(),
              }
            })
          )
          // Invalidate groups cache if a group tool was used (so /groups page refreshes)
          if (data.tool_calls_made.some((t) => GROUP_TOOLS.has(t))) {
            refreshGroups()
          }
        },
        onError: (err) => {
          const errMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Something went wrong: ${err.message}`,
          }
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeId
                ? { ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }
                : s
            )
          )
        },
      }
    )
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const messages = activeSession?.messages ?? []

  return (
    <div className="flex h-[calc(100vh-112px)] min-h-0 gap-0">

      {/* ── Left: History + Groups Panel ── */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl mr-4 overflow-hidden">

        {/* Conversations header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="text-sm font-semibold text-slate-700">Conversations</span>
          <button
            onClick={createNewSession}
            title="New chat"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-1 min-h-0">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn(
                'group w-full text-left flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg transition-colors text-sm',
                s.id === activeId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <MessageSquare size={13} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate leading-snug">{s.title}</span>
              <span
                role="button"
                onClick={(e) => deleteSession(s.id, e)}
                className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-500 text-slate-400 transition-all"
                title="Delete"
              >
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-slate-400">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} saved locally
          </p>
        </div>
      </aside>

      {/* ── Right: Chat area ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Bot size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 truncate">
              {activeSession?.title === 'New chat' ? 'AI Assistant' : activeSession?.title}
            </h1>
            <p className="text-sm text-slate-500">Ask about your CRM data or give commands</p>
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 pr-1">
          {messages.length === 0 && !chat.isPending && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Sparkles size={28} className="text-slate-400" />
              </div>
              <div>
                <p className="text-slate-700 font-medium mb-1">Ask me anything about your CRM</p>
                <p className="text-slate-400 text-sm">I can query leads, companies, pipeline stats, and manage groups.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <Bot size={11} className="text-white" />
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Assistant</span>
                  </div>
                )}
                <div className={
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm'
                    : 'bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 shadow-sm'
                }>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[...new Set(msg.toolsUsed)].map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">
                        {TOOL_LABEL[t] ?? t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {chat.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-sm text-slate-400">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 mt-4 flex gap-2 items-end bg-white border border-slate-200 rounded-xl p-2 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or give a command… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none px-2 py-1.5 overflow-y-auto"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || chat.isPending}
            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
