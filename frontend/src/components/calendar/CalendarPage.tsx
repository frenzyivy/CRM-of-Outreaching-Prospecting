import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Video, Phone, Mail,
  Users, Clock, Edit3, X, LayoutGrid, CalendarDays,
} from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType   = 'call' | 'email' | 'meeting' | 'follow_up'
type EventStatus = 'confirmed' | 'pending' | 'rescheduled'
type ViewMode    = 'day' | 'week' | 'month'
type StyleMode   = 'modern' | 'classic'

interface CalendarEvent {
  id: string
  title: string
  details: string
  date: string
  time?: string       // "HH:MM"
  endTime?: string    // "HH:MM"
  type: EventType
  status: EventStatus
  contactName: string
  company: string
  allDay?: boolean
  priority: 'High' | 'Medium' | 'Low'
  joinLink?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT  = 64  // px per hour in week/day view
const START_HOUR   = 7   // first visible hour
const END_HOUR     = 20  // last visible hour

// ─── Color palettes ───────────────────────────────────────────────────────────

// Modern (pastel, Google-Cal style)
const modernColors: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
  call:      { bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-800',  dot: 'bg-emerald-500'  },
  email:     { bg: 'bg-orange-50',   border: 'border-orange-300',  text: 'text-orange-800',   dot: 'bg-orange-500'   },
  meeting:   { bg: 'bg-violet-50',   border: 'border-violet-300',  text: 'text-violet-800',   dot: 'bg-violet-500'   },
  follow_up: { bg: 'bg-blue-50',     border: 'border-blue-300',    text: 'text-blue-800',     dot: 'bg-blue-500'     },
}

// Classic (solid, CRM style)
const classicColors: Record<EventType, string> = {
  call:      'bg-emerald-500 text-white',
  email:     'bg-orange-400 text-white',
  meeting:   'bg-blue-500 text-white',
  follow_up: 'bg-purple-500 text-white',
}

const typeIcons: Record<EventType, React.FC<{ size?: number; className?: string }>> = {
  call:      Phone,
  email:     Mail,
  meeting:   Users,
  follow_up: Clock,
}

const statusBadge: Record<EventStatus, string> = {
  confirmed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  rescheduled:'bg-blue-50 text-blue-700 border-blue-200',
}

const priorityBadge: Record<string, string> = {
  High:   'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-slate-50 text-slate-600 border-slate-200',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${pad(m)} ${ampm}`
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ─── Events ─────────────────────────────────────────────────────────────

const ALL_EVENTS: CalendarEvent[] = []

// ─── Task Details Panel ───────────────────────────────────────────────────────

function TaskDetailsPanel({
  event, onClose, styleMode,
}: { event: CalendarEvent | null; onClose: () => void; styleMode: StyleMode }) {
  if (!event) {
    return (
      <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex items-center justify-center">
        <p className="text-xs text-slate-400 text-center px-4">Click an event to view details</p>
      </div>
    )
  }
  const Icon = typeIcons[event.type]
  const mc = modernColors[event.type]

  return (
    <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header strip */}
      <div className={cn('h-1.5 w-full shrink-0',
        styleMode === 'modern' ? mc.dot : classicColors[event.type].split(' ')[0]
      )} />

      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Task Details</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border',
            styleMode === 'modern'
              ? `${mc.bg} ${mc.border} ${mc.text}`
              : `${classicColors[event.type]} border-transparent`
          )}>
            <Icon size={10} />
            {event.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusBadge[event.status])}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </div>

        {/* Title */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Title</p>
          <p className="text-sm font-semibold text-slate-800 leading-snug">{event.title}</p>
        </div>

        {/* Details */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Details</p>
          <p className="text-sm text-slate-600 leading-relaxed">{event.details}</p>
        </div>

        {/* Contact */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Contact</p>
          <p className="text-sm font-medium text-slate-800">{event.contactName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{event.company}</p>
        </div>

        {/* Date & Time */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
          <p className="text-sm text-slate-700">
            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
          {event.time && (
            <p className="text-xs text-slate-500 mt-0.5">
              {formatTime12(event.time)}{event.endTime ? ` – ${formatTime12(event.endTime)}` : ''}
            </p>
          )}
        </div>

        {/* Priority */}
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Priority</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', priorityBadge[event.priority])}>
            {event.priority}
          </span>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2">
        {event.joinLink && event.status === 'confirmed' && (
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Video size={14} />
            Join Video Call
          </button>
        )}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors">
          <Edit3 size={14} />
          Edit Task
        </button>
      </div>
    </div>
  )
}

// ─── MODERN: Week View ────────────────────────────────────────────────────────

function ModernWeekView({
  weekStart, events, selected, onSelect,
}: {
  weekStart: string
  events: CalendarEvent[]
  selected: CalendarEvent | null
  onSelect: (e: CalendarEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayDate = todayStr()
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (9 - START_HOUR) * HOUR_HEIGHT
    }
  }, [])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  const totalHeight = hours.length * HOUR_HEIGHT

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header row */}
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        <div className="w-16 shrink-0" />
        {days.map(d => {
          const dt = new Date(d + 'T00:00:00')
          const isToday = d === todayDate
          return (
            <div key={d} className="flex-1 text-center py-3 border-l border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {dt.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <span className={cn(
                'mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold',
                isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
              )}>
                {dt.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: totalHeight }}>
          {/* Time labels */}
          <div className="w-16 shrink-0 relative">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-3 text-[10px] text-slate-400 -translate-y-2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => {
            const dayEvents = (eventsByDate[d] || []).filter(e => e.time)
            return (
              <div key={d} className="flex-1 border-l border-slate-100 relative">
                {/* Hour grid lines */}
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-slate-100"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Events */}
                {dayEvents.map(ev => {
                  const startMin = timeToMinutes(ev.time!)
                  const endMin   = ev.endTime ? timeToMinutes(ev.endTime) : startMin + 30
                  const top      = (startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT
                  const height   = Math.max((endMin - startMin) / 60 * HOUR_HEIGHT, 22)
                  const mc       = modernColors[ev.type]
                  const isSelected = selected?.id === ev.id

                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelect(ev)}
                      style={{ top, height, left: 4, right: 4 }}
                      className={cn(
                        'absolute rounded-lg border px-2 py-1 text-left overflow-hidden transition-all',
                        mc.bg, mc.border, mc.text,
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md' : 'hover:shadow-sm hover:brightness-95'
                      )}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">
                        {formatTime12(ev.time!)}
                        {ev.status === 'pending' && ' ·'}
                      </p>
                      {height > 30 && (
                        <p className="text-[11px] font-medium leading-tight mt-0.5 line-clamp-2">{ev.title}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── MODERN: Day View ─────────────────────────────────────────────────────────

function ModernDayView({
  date, events, selected, onSelect,
}: {
  date: string
  events: CalendarEvent[]
  selected: CalendarEvent | null
  onSelect: (e: CalendarEvent) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR)
  const dayEvents = events.filter(e => e.date === date && e.time)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (9 - START_HOUR) * HOUR_HEIGHT
  }, [date])

  const totalHeight = hours.length * HOUR_HEIGHT

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-200 bg-white shrink-0">
        <div className="w-16 shrink-0" />
        <div className="flex-1 py-3 px-4">
          <p className="text-sm font-semibold text-slate-800">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: totalHeight }}>
          <div className="w-16 shrink-0 relative">
            {hours.map((h, i) => (
              <div key={h} className="absolute right-3 text-[10px] text-slate-400 -translate-y-2" style={{ top: i * HOUR_HEIGHT }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          <div className="flex-1 border-l border-slate-100 relative">
            {hours.map((_, i) => (
              <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * HOUR_HEIGHT }} />
            ))}

            {dayEvents.map(ev => {
              const startMin = timeToMinutes(ev.time!)
              const endMin   = ev.endTime ? timeToMinutes(ev.endTime) : startMin + 30
              const top      = (startMin - START_HOUR * 60) / 60 * HOUR_HEIGHT
              const height   = Math.max((endMin - startMin) / 60 * HOUR_HEIGHT, 28)
              const mc       = modernColors[ev.type]
              const Icon     = typeIcons[ev.type]
              const isSelected = selected?.id === ev.id

              return (
                <button
                  key={ev.id}
                  onClick={() => onSelect(ev)}
                  style={{ top, height, left: 8, right: 8 }}
                  className={cn(
                    'absolute rounded-xl border px-3 py-2 text-left overflow-hidden transition-all',
                    mc.bg, mc.border, mc.text,
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-lg' : 'hover:shadow-sm hover:brightness-95'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={11} />
                    <p className="text-[11px] font-semibold leading-tight truncate">
                      {formatTime12(ev.time!)}{ev.endTime ? ` – ${formatTime12(ev.endTime)}` : ''}
                    </p>
                  </div>
                  {height > 40 && (
                    <p className="text-xs font-medium mt-0.5 line-clamp-2">{ev.title}</p>
                  )}
                  {height > 64 && (
                    <p className="text-[10px] opacity-70 mt-0.5 truncate">{ev.contactName} · {ev.company}</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODERN: Month View ───────────────────────────────────────────────────────

function ModernMonthView({
  year, month, events, selected, onSelect,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  selected: CalendarEvent | null
  onSelect: (e: CalendarEvent) => void
}) {
  const firstDay     = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const daysInPrev   = new Date(year, month, 0).getDate()
  const todayDate    = todayStr()

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [events])

  const cells: { date: string; inMonth: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: dateStr(year, month - 1 < 0 ? 11 : month - 1, daysInPrev - i), inMonth: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: dateStr(year, month, d), inMonth: true })
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: dateStr(year, month + 1 > 11 ? 0 : month + 1, d), inMonth: false })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 divide-x divide-y divide-slate-100 overflow-hidden">
        {cells.map((cell, idx) => {
          const dayEvents  = eventsByDate[cell.date] || []
          const isToday    = cell.date === todayDate
          const dayNum     = parseInt(cell.date.split('-')[2])

          return (
            <div key={idx} className={cn('p-2 flex flex-col gap-1 overflow-hidden min-h-0', !cell.inMonth && 'bg-slate-50/60')}>
              <span className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold shrink-0',
                isToday ? 'bg-blue-600 text-white' : cell.inMonth ? 'text-slate-700' : 'text-slate-350 text-slate-300'
              )}>
                {dayNum}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const mc = modernColors[ev.type]
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelect(ev)}
                      className={cn(
                        'w-full text-left text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate border transition-all',
                        mc.bg, mc.border, mc.text,
                        selected?.id === ev.id && 'ring-1 ring-blue-400'
                      )}
                    >
                      {ev.time && <span className="opacity-60">{formatTime12(ev.time).replace(' AM','a').replace(' PM','p')} </span>}
                      {ev.title}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-slate-400 pl-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CLASSIC: Week View ───────────────────────────────────────────────────────

function ClassicWeekView({
  weekStart, events, selected, onSelect,
}: {
  weekStart: string
  events: CalendarEvent[]
  selected: CalendarEvent | null
  onSelect: (e: CalendarEvent) => void
}) {
  const todayDate = todayStr()
  const hours = Array.from({ length: 12 }, (_, i) => i + 8)
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [events])

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-8 border-b border-slate-200 sticky top-0 bg-white z-10">
        <div className="py-2 text-center text-xs text-slate-400" />
        {days.map(d => {
          const dt = new Date(d + 'T00:00:00')
          const isToday = d === todayDate
          return (
            <div key={d} className="py-2 text-center border-l border-slate-100">
              <p className="text-xs text-slate-400">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</p>
              <span className={cn(
                'text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto',
                isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
              )}>
                {dt.getDate()}
              </span>
            </div>
          )
        })}
      </div>
      {hours.map(hour => (
        <div key={hour} className="grid grid-cols-8 border-b border-slate-100 min-h-[56px]">
          <div className="text-[10px] text-slate-400 pt-1 text-right pr-3">
            {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
          </div>
          {days.map(d => {
            const slotEvents = (eventsByDate[d] || []).filter(e => e.time && parseInt(e.time.split(':')[0]) === hour)
            return (
              <div key={d} className="border-l border-slate-100 p-0.5 space-y-0.5">
                {slotEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={cn(
                      'w-full text-left text-[10px] px-1.5 py-1 rounded font-medium truncate transition-opacity',
                      classicColors[ev.type],
                      selected?.id === ev.id ? 'ring-2 ring-blue-500 ring-offset-1' : 'opacity-90 hover:opacity-100'
                    )}
                  >
                    {ev.time} {ev.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── CLASSIC: Month View ──────────────────────────────────────────────────────

function ClassicMonthView({
  year, month, events, selected, onSelect,
}: {
  year: number; month: number; events: CalendarEvent[]; selected: CalendarEvent | null; onSelect: (e: CalendarEvent) => void
}) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const todayDate   = todayStr()

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [events])

  const cells: { date: string; inMonth: boolean }[] = []
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: dateStr(year, month - 1 < 0 ? 11 : month - 1, daysInPrev - i), inMonth: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: dateStr(year, month, d), inMonth: true })
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: dateStr(year, month + 1 > 11 ? 0 : month + 1, d), inMonth: false })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100">
        {cells.map((cell, idx) => {
          const dayEvents = eventsByDate[cell.date] || []
          const isToday   = cell.date === todayDate
          const dayNum    = parseInt(cell.date.split('-')[2])
          return (
            <div key={idx} className={cn('p-1.5 min-h-0 overflow-hidden flex flex-col gap-0.5', !cell.inMonth && 'bg-slate-50/50')}>
              <span className={cn(
                'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0',
                isToday ? 'bg-blue-600 text-white' : cell.inMonth ? 'text-slate-700' : 'text-slate-400'
              )}>
                {dayNum}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onSelect(ev)}
                    className={cn(
                      'w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate font-medium transition-opacity',
                      classicColors[ev.type],
                      selected?.id === ev.id ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-90 hover:opacity-100'
                    )}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── CLASSIC: Day View ────────────────────────────────────────────────────────

function ClassicDayView({
  date, events, selected, onSelect,
}: {
  date: string; events: CalendarEvent[]; selected: CalendarEvent | null; onSelect: (e: CalendarEvent) => void
}) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7)
  const dayEvents = events.filter(e => e.date === date)

  return (
    <div className="flex-1 overflow-auto">
      <div className="border-b border-slate-200 px-6 py-3 bg-white sticky top-0">
        <p className="text-sm font-semibold text-slate-800">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-xs text-slate-400">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {hours.map(hour => {
          const slotEvents = dayEvents.filter(e => e.time && parseInt(e.time.split(':')[0]) === hour)
          return (
            <div key={hour} className="flex min-h-[56px]">
              <div className="w-16 text-[11px] text-slate-400 pt-2 text-right pr-4 shrink-0">
                {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
              </div>
              <div className="flex-1 border-l border-slate-100 p-1 space-y-1">
                {slotEvents.map(ev => {
                  const Icon = typeIcons[ev.type]
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelect(ev)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-opacity',
                        classicColors[ev.type],
                        selected?.id === ev.id ? 'ring-2 ring-blue-500 ring-offset-1' : 'opacity-90 hover:opacity-100'
                      )}
                    >
                      <Icon size={13} />
                      <span className="truncate">{ev.title}</span>
                      {ev.time && <span className="ml-auto text-xs opacity-80 shrink-0">{ev.time}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView]           = useState<ViewMode>('week')
  const [styleMode, setStyleMode] = useState<StyleMode>('modern')
  const [currentDate, setCurrentDate] = useState(todayStr())
  const [selected, setSelected]   = useState<CalendarEvent | null>(null)
  const [filterType, setFilterType] = useState<'All' | EventType>('All')

  const dt    = new Date(currentDate + 'T00:00:00')
  const year  = dt.getFullYear()
  const month = dt.getMonth()

  const filteredEvents = useMemo(() => {
    if (filterType === 'All') return ALL_EVENTS
    return ALL_EVENTS.filter(e => e.type === filterType)
  }, [filterType])

  const weekStart = useMemo(() => {
    const d = new Date(currentDate + 'T00:00:00')
    d.setDate(d.getDate() - d.getDay())
    return d.toISOString().slice(0, 10)
  }, [currentDate])

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate + 'T00:00:00')
    if (view === 'month')     { d.setMonth(d.getMonth() + dir); d.setDate(1) }
    else if (view === 'week') { d.setDate(d.getDate() + dir * 7) }
    else                      { d.setDate(d.getDate() + dir) }
    setCurrentDate(d.toISOString().slice(0, 10))
  }

  function getTitle() {
    if (view === 'month') {
      return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (view === 'week') {
      const ws = new Date(weekStart + 'T00:00:00')
      const we = new Date(weekStart + 'T00:00:00')
      we.setDate(we.getDate() + 6)
      const sameMon = ws.getMonth() === we.getMonth()
      return sameMon
        ? `${ws.toLocaleDateString('en-US', { month: 'long' })} ${ws.getFullYear()}`
        : `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  const isModern = styleMode === 'modern'

  return (
    <div className={cn('flex flex-col', isModern ? 'bg-white' : 'bg-slate-50')} style={{ height: '100vh' }}>

      {/* ── Toolbar ── */}
      <div className={cn(
        'shrink-0 flex items-center gap-3 px-5 py-3 border-b',
        isModern ? 'bg-white border-slate-200' : 'bg-white border-slate-200'
      )}>
        {/* Page title */}
        <h1 className="text-base font-semibold text-slate-800 mr-2">Calendar</h1>

        {/* View toggle */}
        <div className={cn(
          'flex items-center rounded-lg p-0.5 gap-0.5',
          isModern ? 'bg-slate-100' : 'bg-slate-100'
        )}>
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all',
                view === v
                  ? isModern
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
          <span className="text-sm font-semibold text-slate-700 w-44 text-center">{getTitle()}</span>
        </div>

        <div className="flex-1" />

        {/* Filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as typeof filterType)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Tasks</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="follow_up">Follow-ups</option>
        </select>

        {/* Today button */}
        <button
          onClick={() => setCurrentDate(todayStr())}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
            isModern
              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
              : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
          )}
        >
          Today
        </button>

        {/* Style toggle */}
        <button
          onClick={() => setStyleMode(m => m === 'modern' ? 'classic' : 'modern')}
          title={isModern ? 'Switch to Classic view' : 'Switch to Modern view'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {isModern ? <LayoutGrid size={13} /> : <CalendarDays size={13} />}
          {isModern ? 'Classic' : 'Modern'}
        </button>
      </div>

      {/* ── Legend ── */}
      <div className={cn(
        'shrink-0 flex items-center gap-5 px-5 py-2 border-b',
        isModern ? 'bg-white border-slate-100' : 'bg-white border-slate-100'
      )}>
        {([
          { type: 'call' as EventType,      label: 'Call' },
          { type: 'email' as EventType,     label: 'Email' },
          { type: 'meeting' as EventType,   label: 'Meeting' },
          { type: 'follow_up' as EventType, label: 'Follow-up' },
        ]).map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? 'All' : type)}
            className="flex items-center gap-1.5 group"
          >
            <span className={cn(
              'w-2.5 h-2.5 rounded-sm transition-transform group-hover:scale-110',
              isModern ? modernColors[type].dot : classicColors[type].split(' ')[0]
            )} />
            <span className={cn(
              'text-xs transition-colors',
              filterType === type ? 'font-semibold text-slate-800' : 'text-slate-400 hover:text-slate-600'
            )}>
              {label}
            </span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {isModern ? (
            <>
              {view === 'month' && (
                <ModernMonthView year={year} month={month} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
              {view === 'week' && (
                <ModernWeekView weekStart={weekStart} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
              {view === 'day' && (
                <ModernDayView date={currentDate} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
            </>
          ) : (
            <>
              {view === 'month' && (
                <ClassicMonthView year={year} month={month} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
              {view === 'week' && (
                <ClassicWeekView weekStart={weekStart} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
              {view === 'day' && (
                <ClassicDayView date={currentDate} events={filteredEvents} selected={selected} onSelect={setSelected} />
              )}
            </>
          )}
        </div>

        {/* Details panel — always visible when event selected */}
        <TaskDetailsPanel event={selected} onClose={() => setSelected(null)} styleMode={styleMode} />
      </div>
    </div>
  )
}
