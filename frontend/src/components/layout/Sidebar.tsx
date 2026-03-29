import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, Users, Mail, Phone, MessageCircle,
  BarChart3, DollarSign, CalendarDays, Plug, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import ProfileMenu from './ProfileMenu'

interface SidebarProps {
  expanded: boolean
  onToggle: () => void
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
      { to: '/leads', icon: Users, label: 'Leads' },
    ],
  },
  {
    label: 'Channels',
    items: [
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
        'fixed left-0 top-0 bottom-0 transition-[width] duration-200 ease-in-out bg-[#0f172a] text-white flex flex-col z-40 overflow-hidden',
        expanded ? 'w-[200px]' : 'w-[60px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-[60px] w-full shrink-0 border-b border-white/10 px-[14px] gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs leading-none">AI</span>
        </div>
        <span
          className={cn(
            'text-sm font-semibold text-white whitespace-nowrap overflow-hidden transition-all duration-200',
            expanded ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
          )}
        >
          AI Medical
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col py-2 gap-0 w-full overflow-y-auto overflow-x-hidden scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group label — visible only when sidebar is expanded */}
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap overflow-hidden transition-all duration-200 px-4 py-1 block',
                expanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'
              )}
            >
              {group.label}
            </span>

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group/link relative flex items-center h-9 rounded-xl transition-all mx-2 pl-[9px] gap-3 overflow-hidden',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <item.icon size={18} className="shrink-0" />

                {/* Label — slides in when sidebar expands */}
                <span
                  className={cn(
                    'text-sm font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
                    expanded ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'
                  )}
                >
                  {item.label}
                </span>

                {/* Tooltip — only visible when sidebar is collapsed */}
                {!expanded && (
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/link:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-700 shadow-lg">
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Toggle arrow button — 50% inside sidebar, 50% outside */}
      <div className="relative w-full mb-4">
        <button
          onClick={onToggle}
          className="absolute -right-[14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center hover:bg-slate-100 hover:shadow-lg transition-all z-[60] cursor-pointer"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? (
            <ChevronLeft size={14} className="text-slate-700" />
          ) : (
            <ChevronRight size={14} className="text-slate-700" />
          )}
        </button>
      </div>

      {/* Profile at bottom */}
      <div className="pb-3 pt-3 w-full flex justify-start pl-[10px] border-t border-white/10">
        <ProfileMenu />
      </div>
    </aside>
  )
}
