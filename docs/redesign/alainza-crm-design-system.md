# Alainza CRM — Design System v3

**Purpose:** Everything needed to recreate the exact v3 visual design in your Vite + Next.js codebase.
**Companion file:** `alainza-crm-new-features.md` (the 9 new features to implement on top of this design).
**Reference artifact:** `alainza-crm-v3.html` — the clickable prototype. Treat it as the source of truth for any ambiguity.

---

## 1 · Philosophy

Four rules:

1. **Dual theme always.** Every component must work in dark (navy+blue) and light (sky-blue+white) without style hacks. Never hardcode colors — always use CSS variables.
2. **Action first.** Every view answers "what do I do next?" above the fold. Data comes second.
3. **Typography does the heavy lifting.** Use Instrument Serif italic for display emphasis, Geist Mono for numbers/metadata, Geist Sans for everything else. Don't rely on bold weight or colors to create hierarchy when typography already does it.
4. **No vanity metrics.** A zero is only acceptable if it's actionable ("0 leads stuck" is fine — the absence is the signal). Otherwise, show deltas, pace, or context, never a naked count.

---

## 2 · Typography

### Font loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

### Stack

| Purpose | Font | Weight | Size | Where |
|---------|------|--------|------|-------|
| Body / UI | Geist | 400 | 13.5px | Everywhere by default |
| Emphasized | Geist | 500 | inherit | Lead names, CTAs, card titles |
| Display headings | Geist | 500 | 24px, 20px | `<h1>` on page |
| Display emphasis | Instrument Serif italic | 400 | inherit | `<em>` inside `<h1>` — "5 things", "seven stages" |
| Numbers / metadata | Geist Mono | 400 | 10-12px | KPI deltas, timestamps, counts, IDs |
| KPI values | Geist | 500 | 22-28px | Big numbers on cards |

### Page heading pattern

```html
<h1>Good morning Komal — <em>5 things</em> need you today</h1>
<div class="page-sub">Sunday, 19 April · Week 16 · ~35 min of focused work ahead</div>
```

The `<em>` is always Instrument Serif italic in the brand-2 color. This is Alainza's visual signature.

---

## 3 · Color System

### Dark theme (default)

```css
:root[data-theme="dark"] {
  --bg: #0B1220;          /* app background */
  --bg-2: #0F172A;        /* main content background */
  --surface: #1E293B;     /* cards */
  --surface-2: #273449;   /* nested surfaces, hovers */
  --surface-3: #334155;   /* darkest surface */

  --ink: #F4F5F7;         /* primary text */
  --ink-2: #CBD5E1;       /* secondary text */
  --ink-3: #9CA3AF;       /* tertiary / labels */
  --ink-4: #6B7280;       /* quaternary / disabled */

  --line: rgba(255, 255, 255, 0.06);
  --line-2: rgba(255, 255, 255, 0.12);

  --brand: #2563EB;       /* primary blue */
  --brand-2: #60A5FA;     /* lighter blue for emphasis */
  --brand-soft: rgba(37, 99, 235, 0.15);
  --brand-border: rgba(37, 99, 235, 0.3);

  --success: #4ADE80;
  --success-soft: rgba(34, 197, 94, 0.15);
  --warn: #FBBF24;
  --warn-soft: rgba(245, 158, 11, 0.15);
  --danger: #F87171;
  --danger-soft: rgba(239, 68, 68, 0.15);
  --accent: #A78BFA;      /* purple, for variety in charts */
  --accent-soft: rgba(167, 139, 250, 0.15);

  --chart-grid: rgba(255, 255, 255, 0.05);
}
```

### Light theme

```css
:root[data-theme="light"] {
  --bg: #F0F6FF;          /* very light blue — Komal's spec */
  --bg-2: #E6F0FB;
  --surface: #FFFFFF;     /* white cards */
  --surface-2: #F4F9FF;
  --surface-3: #E1ECFA;

  --ink: #0F1E3D;
  --ink-2: #1E3A68;
  --ink-3: #4B6891;
  --ink-4: #7890B4;

  --line: rgba(30, 79, 216, 0.10);
  --line-2: rgba(30, 79, 216, 0.18);

  --brand: #1E4FD8;
  --brand-2: #3B82F6;
  --brand-soft: #DBEAFE;
  --brand-border: rgba(30, 79, 216, 0.25);

  --success: #047857;
  --success-soft: #D1FAE5;
  --warn: #A16207;
  --warn-soft: #FEF3C7;
  --danger: #B91C1C;
  --danger-soft: #FEE2E2;
  --accent: #6D28D9;
  --accent-soft: #EDE9FE;

  --chart-grid: rgba(30, 79, 216, 0.08);
}
```

### Theme toggle

Stored in `localStorage` under key `alainza-theme`. Applied via `data-theme` attribute on `<html>`. Toggle button in top-right of topbar.

---

## 4 · Layout

### App shell

```
┌──────────────┬──────────────────────────────────────────┐
│              │  Topbar (sticky)                          │
│              ├──────────────────────────────────────────┤
│  Sidebar     │                                           │
│  220px       │  Content                                  │
│  (fixed)     │  padding: 24px 28px 48px                  │
│              │                                           │
└──────────────┴──────────────────────────────────────────┘
```

Grid: `grid-template-columns: 220px 1fr`
Sidebar: `position: sticky; top: 0; height: 100vh; overflow-y: auto`
Main: `overflow-y: auto; max-height: 100vh`

### Sidebar sections

Always in this order:
1. Brand block (mark + name + version)
2. **OVERVIEW** — Today, AI Assistant
3. **SALES** — Pipeline, Leads, Groups
4. **CHANNELS** — Unified Inbox, Email, Calls, WhatsApp
5. **ANALYTICS** — Performance, Revenue
6. **SETTINGS** — Calendar, Integrations
7. User avatar block (sticky bottom)

Section labels: Geist Mono, 9.5px, uppercase, `--ink-4` color, 0.1em letter-spacing.

Nav items:
- Icon (14×14, `--ink-2` default, white when active)
- Label (12.5px)
- Optional counter badge (Geist Mono, 10px, rounded pill)
- Counter badge can be `.hot` (red) for urgent counts
- Active state: background `--brand`, text white

### Mobile (< 980px)

Sidebar becomes fixed, slides in from left. Hamburger button appears in topbar. Grids collapse to single column. Pipeline horizontal scroll preserved.

---

## 5 · Page structure

Every view starts with a `<header class="page-head">`:

```html
<header class="page-head">
  <div>
    <h1>Page Name — <em>emphasis</em> supporting phrase</h1>
    <div class="page-sub">One line of context or today's summary.</div>
  </div>
  <div class="page-chips">
    <!-- optional filter chips or CTAs -->
  </div>
</header>
```

- Page-head has `margin-bottom: 22px`
- Chips right-align, wrap on narrow screens
- Don't use more than 4 chips in the header — move to secondary toolbar if more needed

---

## 6 · Core components

### 6.1 Card

```css
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px 20px;
}

.card-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}

.card-t {
  font-family: 'Geist Mono', monospace;
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

Border radius is always 12px for top-level cards, 10px for nested, 7px for rows/chips.

### 6.2 KPI tile

```html
<div class="kpi">
  <div class="kpi-l">Replies · 24h</div>
  <div class="kpi-v">7</div>
  <div class="kpi-d up">↑ 3 vs yesterday</div>
</div>
```

- Label: Geist Mono, 10px, uppercase, ink-3
- Value: Geist 500, 28px (20-22px in KPI pill variant)
- Delta: Geist Mono, 10.5px; `.up` → success green, `.down` → danger red
- Small units (like `%` or `/mo`) wrapped in `<small>` for optical size balance

### 6.3 Button system

```css
.btn        /* default — surface-2 bg, line border */
.btn.primary  /* brand bg, white text */
.btn.sm     /* smaller padding: 4px 9px, 11px font */
```

CTAs use `.btn .primary` only for the ONE action per card. Secondary buttons are default `.btn`. Never more than one primary per visible surface.

### 6.4 Chip / Pill

```css
.chip {
  font-size: 11.5px;
  padding: 5px 10px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line);
}

.chip.active { background: var(--brand); color: white; border-color: var(--brand); }
.chip.live { background: var(--success-soft); color: var(--success); border-color: transparent; }
```

Used for: filter bars, inline tags, period selectors.

### 6.5 Badge (semantic)

For priority queues and pipeline cards. All share base:

```css
.qbadge {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  padding: 3px 9px;
  border-radius: 999px;
  text-align: center;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
```

Color variants:
- `.reply` — danger
- `.mtg` — warn
- `.approve` — brand
- `.cold` — neutral (surface-3 / ink-2)
- `.close` — success

### 6.6 Data table

Grid-based, no `<table>`. Why: responsive collapse is cleaner.

```css
.dt-head, .dt-row {
  display: grid;
  grid-template-columns: /* ... per table */;
  gap: 12px;
  padding: 10px 16px;
  align-items: center;
}

.dt-head {
  background: var(--surface-2);
  font-family: 'Geist Mono', monospace;
  font-size: 10.5px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dt-row { border-bottom: 1px solid var(--line); cursor: pointer; }
.dt-row:hover { background: var(--surface-2); }
```

### 6.7 Bar chart (single metric)

```html
<div class="camp-row">
  <div class="camp-name">Segment name<small>meta</small></div>
  <div class="bar-track"><div class="bar-fill bar-g" style="width: 72%;"></div></div>
  <div class="camp-pct good">7.1%</div>
</div>
```

- `bar-g` green (good), `bar-m` warn, `bar-b` danger
- Track: 6px tall, surface-2 bg
- Fill: CSS transition 0.8s ease-out on width for animation on view load

### 6.8 Donut chart

SVG with two `<circle>` elements. Outer is background track, subsequent circles are segments with `stroke-dasharray`. Rotate -90° so 0% starts at top. Center label always has two lines: value + Geist Mono uppercase label.

Sizing: 130×130 viewbox, stroke-width 18.

### 6.9 Heatmap

Grid of equal-aspect cells. Each cell's background opacity scales with value: `rgba(96, 165, 250, 0.15 + (value/max) * 0.85)`.

Today cell gets `outline: 1.5px solid var(--brand-2); outline-offset: 1px`.

---

## 7 · Page-by-page layout

### 7.1 Today (`/today` — default landing)

Order top to bottom:
1. Page head with warm greeting + em emphasis + context sub
2. Period chip row (Today / Last 2 Days / This Week / This Month)
3. **Priority Queue card** — gradient urgency rail on left edge (red→amber→blue→green), 5 rows with badge + name/sub + CTA
4. **Champion Leads card** — blue gradient, 6 leads in 2-col grid (NEW — see features doc)
5. **3-col row:** Goals + Streak + Daily Digest (NEW)
6. **KPI grid** — 4 tiles (Replies · 24h, Meetings · 7d, Upcoming, Reply Rate · 30d)
7. **2-col:** Touchpoint heatmap + This Week's schedule

### 7.2 AI Assistant (`/assistant`)

`<div class="assistant-wrap">` — grid 240px sidebar + 1fr chat panel, height `calc(100vh - 200px)`.

Conversation sidebar: list of past chats, "New chat" button active. Bottom shows "N conversations saved".

Chat body: centered empty state with sparkle icon + welcome headline + 8 suggested-query chips + input field with send button.

### 7.3 Pipeline (`/pipeline`)

- Toolbar: search + Filter + Properties + "+ Add Lead" (primary, right-aligned)
- Horizontal-scrolling 7-column grid: `grid-template-columns: repeat(7, minmax(200px, 1fr))`, min-width 1400px
- Stages in this order: New · Researched · Email Sent · Follow-up 1 · Follow-up 2 · Responded · Closed
- Each column: header row with stage dot (color per stage) + title + count pill, then lead cards
- Lead card: grab cursor, name in 500 weight, meta rows in mono 10.5px with icon, stage tag at bottom. Heat dot absolute-positioned top-right (red/amber/green)
- Below the columns: **pipe-summary** strip — weighted pipeline, avg deal, close rate, cold pool count, primary CTA
- Below summary: **Lead Leakage Report** card (NEW)

### 7.4 Leads (`/leads`)

Three sub-tabs underline-style:
- Company Data (default) — data table with company, industry, size, country, locations, leads, stage
- Lead Data — data table with contact, title, company, email (valid pill), phone, country, stage
- Analytics — 2 rows of 4 KPI tiles + duplicate detection card + country donut

### 7.5 Groups (`/groups`)

Header + "+ New Group" primary button. Grid of feat-cards: name + status pill + description + 2 action buttons (View, Campaign / Edit rules).

### 7.6 Unified Inbox (`/inbox`)

2-col: 360px thread list + thread pane.

Thread list:
- Filter chips at top (All · Needs reply · Hot · Email · WA · LinkedIn)
- Scrollable list of inbox-rows (36px avatar + preview content)
- Selected row has brand-soft background + 3px brand left border
- Channel badge: `.email .wa .li .call` — Geist Mono, 9px, colored

Thread pane:
- Header: lead name + company/location + CTAs (View lead, Log call)
- Body: message bubbles (in = surface border, out = brand background white text)
- Reply composer: channel switcher chips + textarea + AI hint + Regenerate/Send buttons

Below the grid: **Objection Handler Library** card (NEW).

### 7.7 Email (`/email`)

Tab row (underline-style): Overview · Instantly.ai · ConvertKit · Lemlist · Smartlead

**Overview tab:**
- 4 KPI pills (Sent, Open Rate, Reply Rate, Bounce Rate) with colored icon blocks
- By Campaign card — bar chart rows
- 2-col: Top subject lines + Inbox health (deliverability)

**Instantly.ai tab:**
- Sync status strip + Sync Now button
- 6 KPI pills (Sent, Opens, Replies, Clicks, Bounced, Unsub) — all with colored icons
- Daily Email Activity chart — 30-day bar chart with 4 series (Sent/Opened/Replies/Bounced)
- 2-col: Lead Interest donut + Leads by Country donut

### 7.8 Calls (`/calls`)

3 KPIs top. Calls table: direction icon, lead, outcome, duration (mono), sentiment (colored mono), status pill.

### 7.9 WhatsApp (`/whatsapp`)

4 KPIs. Template Library card — grid of template cards, each with name + template text with `{{variable}}` placeholders.

### 7.10 Performance (`/performance`)

- 4 KPIs (Total outreach, Qualified replies, Meetings booked, Cost per meeting)
- **By Segment card** — bar chart with geo flags in meta
- **2-col:** Winning Patterns card + Best Time Heatmap card (NEW)
- **Subject Line Graveyard card** (NEW, full width)

### 7.11 Revenue (`/revenue`)

- Period chips (This Month / Quarter / Year)
- **Rev Hero 2-col:**
  - Left: gradient brand card with €4,800/mo hero + 3-up ticks (Setup fees, Total QTD, Churn)
  - Right: 6-month forecast chart with past (solid), current (brighter), future (dashed) bars
- **2-col split:** Recurring clients table + Setup fees table
- **Segment P&L table** — proper HTML table, right-aligned numeric columns, total row bolded

### 7.12 Calendar (`/calendar`)

3 KPIs. Upcoming list — flex rows with day/time block + meeting details + action buttons (Prep, Join Meet).

### 7.13 Integrations (`/integrations`)

3-col grid of int-cards. Each shows name + status pill (on/warn/off) + one-line description + stat line. Unconnected ones show a "Connect →" primary button.

---

## 8 · Animations

Kept minimal. Use only these:

- View transition: `opacity + translateY(4px)` fade-in, 0.25s
- Card hover: `translateY(-1px)` lift, 0.12s
- Bar fills: width transition 0.8s ease-out, triggered on view load
- Toast: slide up + fade in, 0.25s
- Cells in heatmap/streak: `scale(1.15-1.3)` on hover, 0.12s

**Never** use:
- Parallax scrolling
- Rotating / spinning elements (except live sync dot pulse)
- Staggered list animations
- Color transitions on theme toggle (instant is better — less jank)

---

## 9 · Interaction patterns

### Toast notifications

```javascript
toast('Reply sent via Instantly', 'To Marisa @ Berman Skin Institute');
```

Positioned bottom-right, auto-dismisses after 2.8s, has optional subtitle in mono. Used for: confirmations, background actions, stub feature acknowledgments.

### Inline editing

Not implemented in the prototype. When building: click-to-edit on any metric with a pencil icon on hover. Save on blur, optimistic update.

### Keyboard shortcuts

Implement as progressive enhancement:
- `⌘K` — global search
- `G then T` — go to Today
- `G then P` — go to Pipeline
- `G then I` — go to Inbox
- `N` — new lead
- `/` — focus search

---

## 10 · Recommended file structure (Vite + Next.js)

```
src/
  styles/
    tokens.css          # CSS variables for both themes
    base.css            # Reset, typography, body
    components.css      # .btn, .chip, .kpi, .card
  lib/
    theme.ts            # Theme toggle + localStorage
    format.ts           # Numbers, dates, currency
    urgency.ts          # Queue scoring logic
  components/
    layout/
      Sidebar.tsx
      Topbar.tsx
      PageHead.tsx
    today/
      PriorityQueue.tsx
      ChampionLeads.tsx       # NEW
      GoalsCard.tsx           # NEW
      ActivityStreak.tsx      # NEW
      DailyDigestCard.tsx     # NEW
      TouchpointHeatmap.tsx
      WeekSchedule.tsx
    pipeline/
      PipelineBoard.tsx
      StageColumn.tsx
      LeadCard.tsx
      LeakageReport.tsx       # NEW
    inbox/
      ThreadList.tsx
      ThreadPane.tsx
      ReplyComposer.tsx
      ObjectionLibrary.tsx    # NEW
    email/
      OverviewTab.tsx
      InstantlyTab.tsx
      EmailChart.tsx
      DonutChart.tsx
    performance/
      SegmentBreakdown.tsx
      WinningPatterns.tsx     # NEW
      BestTimeHeatmap.tsx     # NEW
      SubjectGraveyard.tsx    # NEW
    revenue/
      RevenueHero.tsx
      ForecastChart.tsx
      SegmentPnL.tsx
  pages/  (or app/)
    today.tsx
    assistant.tsx
    pipeline.tsx
    leads.tsx
    groups.tsx
    inbox.tsx
    email.tsx
    calls.tsx
    whatsapp.tsx
    performance.tsx
    revenue.tsx
    calendar.tsx
    integrations.tsx
```

---

## 11 · Supabase schema (core tables)

Already exists in your current CRM. New tables needed for the 9 features are documented in `alainza-crm-new-features.md`.

Key existing tables the design assumes:
- `leads` — with stage, country, industry, company_id, intent_score (computed)
- `companies` — with locations count
- `touchpoints` — every email, call, WA message, LI action
- `meetings` — with booked_at, ended_at, outcome
- `deals` — open/won/lost, amount, monthly_amount
- `campaigns` — with ESP identifier, subject templates
- `mailboxes` — with health score, daily limit

---

## 12 · One-shot prompt for Claude Code

Copy this into Claude Code when ready to build:

```
You are building the Alainza CRM redesign on top of the existing Next.js + Vite + FastAPI + Supabase stack.

Two reference documents are provided:
1. alainza-crm-design-system.md — the complete visual system (tokens, layouts, components)
2. alainza-crm-new-features.md — 9 new features to add (Champion Leads, Goals, Digest, Streak, Winning Patterns, Best Time Heatmap, Subject Graveyard, Lead Leakage, Objection Handler)

Prime directives:
- DO NOT delete or break any existing feature
- Apply the new design system to existing views (dark+light theme, Geist/Instrument Serif typography, CSS variables)
- Add the 9 new features into the views specified in the feature map
- Start with Phase 1: tokens.css + layout shell + theme toggle + Today page (full migration including 4 new Today components)
- Phase 2: Pipeline + Leakage Report
- Phase 3: Performance + Winning Patterns + Best Time + Graveyard
- Phase 4: Inbox + Objection Library
- Phase 5: Revenue rebuild from scratch

For each component you build:
1. Create it with TypeScript types
2. Wire up to the actual Supabase data (not mock data)
3. Test both themes
4. Test mobile responsiveness (375px, 768px, 980px, 1280px)
5. Skip until all prior phases compile clean before moving to the next

Reference the HTML prototype (alainza-crm-v3.html) whenever the written specs are ambiguous. The prototype is the source of truth for visual details like spacing, shadows, exact colors, animation timing, and copy voice.

Ask me before:
- Modifying the Supabase schema of any existing table
- Changing any existing URL route
- Removing an existing feature because you think the new one replaces it
```

---

## Handoff checklist

Before declaring done:

- [ ] `tokens.css` has both themes exported as CSS variables
- [ ] Theme toggle persists in localStorage, syncs on page load before first paint
- [ ] All 13 views render cleanly in both themes
- [ ] Sidebar shows all 11 nav items in correct grouping order
- [ ] Topbar has search (with ⌘K hint), sync pill, theme toggle, notifications icon
- [ ] Page head pattern used consistently (h1 with em + sub)
- [ ] No hardcoded colors anywhere — all via `var(--*)`
- [ ] Font files loaded from Google Fonts CDN
- [ ] Mobile menu works on all pages
- [ ] No console errors, no unused CSS
- [ ] Dark mode is the default (first-time visitor sees dark)
- [ ] Lighthouse score: performance > 85, accessibility > 95

---

**End of design system.** Build with care. Ship to production only when both themes look indistinguishable in quality.
