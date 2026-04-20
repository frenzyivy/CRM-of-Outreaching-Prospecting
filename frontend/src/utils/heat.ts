import type { Lead } from '../types'

export type Heat = 'hot' | 'warm' | 'cool' | 'none'

/**
 * Compute the heat dot for a lead based on days since last activity.
 * Heat dots are red/amber/green and represent urgency, not lead quality.
 *
 *  hot (red)    → 0–2 days    → fresh, act now
 *  warm (amber) → 3–7 days    → getting stale
 *  cool (green) → 8–21 days   → cooling
 *  none (gray)  → 22+ days / no touch / closed stage
 *
 * Source of truth: prefer stage_updated_at, fall back to last_email_event_at,
 * fall back to updated_at, fall back to created_at. NULL / undefined → 'none'.
 */
export function heatFor(lead: Lead): Heat {
  // Closed leads don't get a heat dot — they're done.
  if (lead.stage === 'closed_won' || lead.stage === 'closed_lost') return 'none'

  const days = daysSinceLastTouch(lead)
  if (days == null) return 'none'
  if (days <= 2)  return 'hot'
  if (days <= 7)  return 'warm'
  if (days <= 21) return 'cool'
  return 'none'
}

export function daysSinceLastTouch(lead: Lead): number | null {
  const pick = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
  const iso =
    pick(lead.stage_updated_at) ??
    pick(lead.last_email_event_at) ??
    pick(lead.updated_at) ??
    pick(lead.created_at)
  if (!iso) return null
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return null
  const ms = Date.now() - then
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export function heatLabel(h: Heat): string {
  switch (h) {
    case 'hot':  return 'Touched in last 2 days'
    case 'warm': return '3–7 days since last touch'
    case 'cool': return '8–21 days since last touch'
    default:     return 'No recent activity'
  }
}
