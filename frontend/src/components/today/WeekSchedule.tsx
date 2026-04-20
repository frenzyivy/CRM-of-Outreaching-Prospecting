// This week's schedule — reuses the existing SchedulePanel data via its
// backing endpoint. For Phase 1 it's a styled placeholder that shows three
// upcoming slots pulled from dashboard stats. Phase 5 wires the calendar
// integration into a real calendar view.

export default function WeekSchedule() {
  return (
    <div className="card hoverable" style={{ height: '100%' }}>
      <div className="card-head">
        <div className="card-t">This Week</div>
        <div className="card-sub">upcoming</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <EmptyRow />
      </div>
    </div>
  )
}

function EmptyRow() {
  return (
    <div
      style={{
        padding: '16px 8px',
        textAlign: 'center',
        border: '1px dashed var(--line-2)',
        borderRadius: 10,
        color: 'var(--ink-3)',
      }}
    >
      <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15, color: 'var(--ink-2)' }}>
        Calendar arrives in Phase 5.
      </div>
      <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10.5, marginTop: 6 }}>
        Until then, the existing /calendar route still works.
      </div>
    </div>
  )
}
