import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, Users, Mail, Phone, MessageCircle,
  BarChart3, DollarSign, CalendarDays, Plug, ChevronRight, ChevronLeft,
  Bot, Layers, Inbox,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import ProfileMenu from './ProfileMenu'

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

type NavItem = {
  to: string
  icon: typeof LayoutDashboard
  label: string
  disabled?: boolean
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/today', icon: LayoutDashboard, label: 'Today' },
      { to: '/assistant', icon: Bot, label: 'AI Assistant' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
      { to: '/leads', icon: Users, label: 'Leads' },
      { to: '/groups', icon: Layers, label: 'Groups' },
    ],
  },
  {
    label: 'Channels',
    items: [
      // /inbox arrives in Phase 4 — disabled stub so it doesn't 404.
      { to: '/inbox', icon: Inbox, label: 'Unified Inbox', disabled: true },
      { to: '/email', icon: Mail, label: 'Email' },
      { to: '/calls', icon: Phone, label: 'Calls' },
      { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/performance', icon: BarChart3, label: 'Performance' },
      { to: '/revenue', icon: DollarSign, label: 'Revenue' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      { to: '/integrations', icon: Plug, label: 'Integrations' },
    ],
  },
]

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'alainza fixed left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        expanded ? 'w-[220px]' : 'w-[60px]',
      )}
      style={{
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--line)',
      }}
    >
      {/* Brand block */}
      <div
        className="flex items-center gap-3 h-[60px] shrink-0 px-[14px]"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <div className="side-mark">A</div>
        <span
          className={cn(
            'whitespace-nowrap overflow-hidden transition-all duration-200',
            expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
          )}
          style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ink)',
          }}
        >
          Alainza
        </span>
        <span
          className={cn(
            'ml-auto whitespace-nowrap overflow-hidden transition-all duration-200',
            expanded ? 'max-w-[40px] opacity-100' : 'max-w-0 opacity-0',
          )}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 9.5,
            color: 'var(--ink-4)',
          }}
        >
          v3
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col py-2 gap-0 w-full overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group label — visible only when sidebar is expanded */}
            <span
              className={cn(
                'whitespace-nowrap overflow-hidden transition-all duration-200 block px-4 py-1',
                expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
              )}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 9.5,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--ink-4)',
                fontWeight: 500,
              }}
            >
              {group.label}
            </span>

            {group.items.map((item) => {
              if (item.disabled) {
                return (
                  <div
                    key={item.to}
                    className="group/link relative flex items-center h-9 rounded-lg mx-2 pl-[9px] gap-3 overflow-hidden cursor-not-allowed"
                    style={{ color: 'var(--ink-4)' }}
                    title={`${item.label} — coming soon`}
                  >
                    <item.icon size={14} className="shrink-0" />
                    <span
                      className={cn(
                        'whitespace-nowrap transition-all duration-200 overflow-hidden',
                        expanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0',
                      )}
                      style={{
                        fontFamily: "'Geist', sans-serif",
                        fontSize: 12.5,
                      }}
                    >
                      {item.label}
                    </span>
                    {expanded && (
                      <span
                        className="ml-auto mr-2"
                        style={{
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: 9,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: 'var(--surface-2)',
                          color: 'var(--ink-4)',
                        }}
                      >
                        soon
                      </span>
                    )}
                    {!expanded && (
                      <span
                        className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/link:opacity-100 pointer-events-none transition-opacity z-50 border shadow-lg"
                        style={{
                          background: 'var(--surface-2)',
                          color: 'var(--ink)',
                          borderColor: 'var(--line-2)',
                        }}
                      >
                        {item.label} · soon
                      </span>
                    )}
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/today'}
                  className="group/link relative flex items-center h-9 rounded-lg transition-all mx-2 pl-[9px] gap-3 overflow-hidden alainza-nav-link"
                >
                  <item.icon size={14} className="shrink-0" />
                  <span
                    className={cn(
                      'whitespace-nowrap transition-all duration-200 overflow-hidden',
                      expanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0',
                    )}
                    style={{
                      fontFamily: "'Geist', sans-serif",
                      fontSize: 12.5,
                    }}
                  >
                    {item.label}
                  </span>
                  {!expanded && (
                    <span
                      className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/link:opacity-100 pointer-events-none transition-opacity z-50 border shadow-lg"
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--ink)',
                        borderColor: 'var(--line-2)',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Toggle */}
      <div className="relative w-full mb-4">
        <button
          onClick={onToggle}
          className="absolute -right-[14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border shadow-md flex items-center justify-center transition-all z-[60] cursor-pointer"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--line-2)',
            color: 'var(--ink-2)',
          }}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Profile */}
      <div
        className="pb-3 pt-3 w-full flex justify-start pl-[10px]"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <ProfileMenu />
      </div>
    </aside>
  )
}
