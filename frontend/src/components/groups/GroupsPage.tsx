import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Pencil, Check, X, Loader2, ArrowRight, ExternalLink } from 'lucide-react'
import { useAssistantGroups, useRenameGroup, useGroupMembers } from '../../hooks/useAssistant'
import type { AssistantGroup, GroupMember } from '../../hooks/useAssistant'

function formatDate(iso: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '' }
}

// ---------------------------------------------------------------------------
// Group Members Drawer
// ---------------------------------------------------------------------------

interface DrawerProps {
  group: AssistantGroup
  onClose: () => void
}

function GroupDrawer({ group, onClose }: DrawerProps) {
  const navigate = useNavigate()
  const { data: members, isLoading } = useGroupMembers(group.id)

  function goToLeads(search: string) {
    navigate(`/leads?search=${encodeURIComponent(search)}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Users size={15} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{group.name}</h2>
              <p className="text-xs text-slate-400">{group.member_count} member{group.member_count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Go to Leads link */}
        <div className="px-5 py-2.5 border-b border-slate-100 shrink-0">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ExternalLink size={12} />
            Open in Leads Center
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center gap-2 justify-center py-12 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading members…</span>
            </div>
          )}

          {!isLoading && (!members || members.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Users size={28} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No members in this group yet.</p>
            </div>
          )}

          {members && members.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: GroupMember) => (
                  <tr key={m.email} className="border-b border-slate-50 hover:bg-slate-50 group/row transition-colors">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => goToLeads(m.name)}
                        className="text-left"
                        title="Open in Leads Center"
                      >
                        <p className="font-medium text-slate-800 group-hover/row:text-blue-600 transition-colors flex items-center gap-1">
                          {m.name}
                          <ArrowRight size={11} className="opacity-0 group-hover/row:opacity-100 transition-opacity text-blue-500" />
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.specialty}</p>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => goToLeads(m.company)}
                        className="text-left"
                        title="Open in Leads Center"
                      >
                        <p className="font-medium text-slate-700 group-hover/row:text-blue-600 transition-colors flex items-center gap-1">
                          {m.company}
                          <ArrowRight size={11} className="opacity-0 group-hover/row:opacity-100 transition-opacity text-blue-500" />
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.country}</p>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Group Card
// ---------------------------------------------------------------------------

interface CardProps {
  group: AssistantGroup
  onClick: () => void
}

function GroupCard({ group, onClick }: CardProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(group.name)
  const rename = useRenameGroup()

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== group.name) rename.mutate({ id: group.id, name: trimmed })
    setEditing(false)
  }

  function handleCardClick() {
    if (!editing) onClick()
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      {/* Icon + name row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <Users size={18} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') { setName(group.name); setEditing(false) }
                }}
                className="flex-1 text-sm font-semibold text-slate-800 border border-blue-400 rounded px-2 py-0.5 outline-none"
              />
              <button onClick={commit} className="text-green-500 hover:text-green-600">
                <Check size={14} />
              </button>
              <button onClick={() => { setName(group.name); setEditing(false) }} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/card">
              <h3 className="text-sm font-semibold text-slate-800 truncate">{group.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true) }}
                className="opacity-0 group-hover/card:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"
                title="Rename"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          {group.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        <div>
          <p className="text-xl font-bold text-slate-900">{group.member_count}</p>
          <p className="text-xs text-slate-500">member{group.member_count !== 1 ? 's' : ''}</p>
        </div>
        {group.created_at && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400">Created</p>
            <p className="text-xs font-medium text-slate-600">{formatDate(group.created_at)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GroupsPage() {
  const groups = useAssistantGroups()
  const groupList = groups.data ?? []
  const [activeGroup, setActiveGroup] = useState<AssistantGroup | null>(null)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lead groups created by the AI Assistant. Click a group to see its members.
        </p>
      </div>

      {/* Loading */}
      {groups.isLoading && (
        <div className="flex items-center gap-2 text-slate-400 py-12 justify-center">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading groups…</span>
        </div>
      )}

      {/* Empty state */}
      {!groups.isLoading && groupList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-700 font-medium mb-1">No groups yet</p>
          <p className="text-slate-400 text-sm max-w-xs">
            Go to the AI Assistant and say something like "Create a group with all dentists from Poland".
          </p>
        </div>
      )}

      {/* Grid */}
      {groupList.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-500">{groupList.length} group{groupList.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupList.map((g) => (
              <GroupCard key={g.id} group={g} onClick={() => setActiveGroup(g)} />
            ))}
          </div>
        </>
      )}

      {/* Slide-over drawer */}
      {activeGroup && (
        <GroupDrawer group={activeGroup} onClose={() => setActiveGroup(null)} />
      )}
    </div>
  )
}
