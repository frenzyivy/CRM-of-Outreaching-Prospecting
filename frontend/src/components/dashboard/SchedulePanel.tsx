import { Video, Clock, RefreshCw, User, Calendar } from 'lucide-react'
import { todaySchedule, weekSchedule } from '../../data/mockDashboardData'
import type { ScheduleItem } from '../../data/mockDashboardData'

const meetingTypeLabels: Record<string, string> = {
  intro_call: 'Intro Call',
  demo: 'Demo',
  follow_up: 'Follow-up',
  proposal_review: 'Proposal Review',
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-400/10 text-emerald-400',
  pending: 'bg-amber-400/10 text-amber-400',
  rescheduled: 'bg-blue-400/10 text-blue-400',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatWeekDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function ScheduleBlock({ item }: { item: ScheduleItem }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="text-center shrink-0 w-14">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{formatTime(item.time)}</p>
        {item.endTime && (
          <p className="text-xs text-slate-400">{formatTime(item.endTime)}</p>
        )}
      </div>
      <div className="w-px h-10 bg-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">{item.contactName}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[item.status]}`}>
            {item.status}
          </span>
        </div>
        <p className="text-xs text-slate-400 truncate">{item.company}</p>
        <p className="text-xs text-slate-500 mt-0.5">{meetingTypeLabels[item.meetingType]}</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {item.joinLink && item.status === 'confirmed' && (
          <button className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Join">
            <Video size={14} />
          </button>
        )}
        <button className="p-1.5 rounded-md bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors" title="Reschedule">
          <RefreshCw size={14} />
        </button>
        <button className="p-1.5 rounded-md bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors" title="View Profile">
          <User size={14} />
        </button>
      </div>
    </div>
  )
}

export default function SchedulePanel() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-blue-400" />
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">Today's Schedule</h3>
        <span className="ml-auto text-xs text-slate-400">{todaySchedule.length} meetings</span>
      </div>

      <div className="space-y-2 mb-6">
        {todaySchedule.map((item) => (
          <ScheduleBlock key={item.id} item={item} />
        ))}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
          Upcoming This Week ({weekSchedule.length})
        </h4>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {weekSchedule.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <Clock size={12} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 truncate">{item.contactName}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400 truncate">{item.company}</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{formatWeekDay(item.time)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[item.status]}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
