# Email Module — Build Instructions

## AI Medical CRM — Multi-Channel Email Analytics & Lead Routing

**Version:** 1.0
**Date:** April 2026
**Stack:** React + Node.js + Supabase
**Module location:** `/src/modules/email/`

---

## 1. What this module does

This module connects four email platforms (Instantly.ai, ConvertKit, Lemlist, Smartlead) to a single CRM dashboard. Every email account has one global daily sending limit set by the user. That limit is then allocated across whichever tools use that account. The dashboard fetches real sent counts from each platform's API, combines them per email account, and calculates weighted engagement metrics (open rate, click rate, reply rate, bounce rate, unsubscribe rate) across everything.

The core principle: **one email inbox = one global limit, split across multiple tools**. The CRM is the single source of truth for how many emails any inbox is allowed to send per day, regardless of which platform is doing the sending.

---

## 2. Data model

### 2.1 Core concept

```
email_account (you set global_daily_limit = 100)
├── allocation: Instantly.ai → 60/day
│   └── sent: 38 | opened: 9 | clicked: 3 | replied: 2 | bounced: 1 | unsub: 0
├── allocation: Lemlist → 40/day
│   └── sent: 22 | opened: 6 | clicked: 2 | replied: 1 | bounced: 0 | unsub: 0
└── combined: sent 60 of 100 | 40 remaining | open rate = 15/60 = 25%
```

An email account like `dr.outreach1@aimedical.io` might be connected to both Instantly and Lemlist simultaneously. Each tool gets an allocated portion of the global limit. The sync service fetches actual sent counts from each platform and the CRM calculates the combined usage.

### 2.2 Supabase tables

#### `email_accounts`

This is the master list of all email inboxes. The user sets the global daily limit here.

```sql
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  global_daily_limit INTEGER NOT NULL DEFAULT 100,
  warmup_score INTEGER,                    -- nullable, not all platforms report this
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `platform_connections`

Maps which platforms each email account is connected to, and how much of the global limit is allocated to each platform.

```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instantly', 'convertkit', 'lemlist', 'smartlead')),
  allocated_daily_limit INTEGER NOT NULL,
  platform_account_id TEXT,                -- the ID this account has on the external platform
  api_key_ref TEXT,                         -- reference to encrypted API key in vault
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(email_account_id, platform)
);
```

**Validation rule (enforce in application layer):** The sum of `allocated_daily_limit` across all platform_connections for a given `email_account_id` must not exceed the `global_daily_limit` on the parent `email_accounts` row. If it does, show a warning in the UI but don't hard-block — the user may intentionally over-allocate during testing.

#### `email_sync_snapshots`

Every 15-minute sync cycle writes one row per email account per platform with the actual numbers fetched from that platform's API.

```sql
CREATE TABLE email_sync_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  synced_at TIMESTAMPTZ DEFAULT now(),

  -- Capacity
  sent INTEGER NOT NULL DEFAULT 0,

  -- Engagement (fetched from platform API)
  opened INTEGER NOT NULL DEFAULT 0,
  clicked INTEGER NOT NULL DEFAULT 0,
  replied INTEGER NOT NULL DEFAULT 0,
  bounced INTEGER NOT NULL DEFAULT 0,
  unsubscribed INTEGER NOT NULL DEFAULT 0,

  UNIQUE(email_account_id, platform, sync_date)
);
```

The `UNIQUE` constraint on `(email_account_id, platform, sync_date)` means each sync cycle upserts — it overwrites today's row for that account+platform combo with the latest numbers.

#### `email_analytics_daily`

Pre-computed daily aggregates per email account (combined across all platforms). Rebuilt after every sync cycle.

```sql
CREATE TABLE email_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Combined across all platforms
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_replied INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_unsubscribed INTEGER NOT NULL DEFAULT 0,

  -- Calculated rates (stored as decimal 0.0–100.0)
  open_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  reply_rate NUMERIC(5,2),
  bounce_rate NUMERIC(5,2),
  unsub_rate NUMERIC(5,2),

  -- Capacity
  global_limit INTEGER,
  total_allocated INTEGER,
  remaining INTEGER,

  computed_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(email_account_id, analytics_date)
);
```

### 2.3 Rate calculation logic

**All rates are weighted averages, never averages of averages.**

```
open_rate = (total_opened / total_sent) × 100
click_rate = (total_clicked / total_sent) × 100
reply_rate = (total_replied / total_sent) × 100
bounce_rate = (total_bounced / total_sent) × 100
unsub_rate = (total_unsubscribed / total_sent) × 100
```

When aggregating across multiple accounts (for the overview or per-tool view):

```
weighted_open_rate = SUM(opened across all accounts) / SUM(sent across all accounts) × 100
```

Never do `AVG(open_rate)` across accounts — that gives wrong results when accounts have different send volumes.

### 2.4 Remaining capacity calculation

```
remaining = email_account.global_daily_limit - SUM(sent across all platform_connections for today)
```

This is the true remaining capacity for an inbox. Even if Instantly says it has 22 emails left in its allocation, if the global limit is already used up by Lemlist, the inbox is maxed out.

---

## 3. API integration

### 3.1 Platform API endpoints

Each platform gives us two categories of data: account/capacity data and engagement/analytics data.

#### Instantly.ai (API v2, Bearer token auth)

**Account data:**
- `GET /api/v2/accounts` — returns all email accounts with `daily_limit`, `status`, `warmup` object (contains `limit`, `reply_rate`), `stat_warmup_score`
- Each account object contains `daily_limit` (integer) and `email` (string)

**Analytics data:**
- `GET /api/v2/campaigns/analytics/daily?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&emails=user@example.com` — returns per-account per-day: `sent`, `bounced`, `contacted`, `opened`, `unique_opened`, `replies`, `unique_replies`
- `GET /api/v2/campaigns/analytics/overview` — aggregate campaign stats
- `GET /api/v2/campaigns/analytics/steps` — per-step breakdown

**Webhooks available:** email_sent, email_opened, email_clicked, email_bounced, reply_received, lead_unsubscribed

**Auth:** Bearer token via `Authorization: Bearer <API_KEY>`

**Rate limit:** Respect rate limits, implement exponential backoff

#### ConvertKit / Kit (API v3, API secret auth)

**Account data:**
- Subscriber count comes from `GET /v3/subscribers?api_secret=<KEY>` — total count represents your list size
- ConvertKit does not have per-account sending limits in the traditional sense — the limit is your plan's subscriber cap

**Analytics data:**
- `GET /v3/broadcasts` — list all broadcasts
- `GET /v3/broadcasts/{broadcast_id}/stats?api_secret=<KEY>` — returns: `recipients`, `open_rate`, `click_rate`, `unsubscribe_count`, `total_clicks`, `status`, `progress`
- Note: ConvertKit returns `open_rate` and `click_rate` as decimals (0.0–1.0), so multiply by 100 and by recipients to get absolute counts

**Deriving absolute counts from ConvertKit:**
```javascript
const stats = await fetchBroadcastStats(broadcastId);
const opened = Math.round(stats.recipients * stats.open_rate);
const clicked = Math.round(stats.recipients * stats.click_rate);
// replied is not directly available — use webhook events
// bounced = recipients - delivered (if available)
const unsubscribed = stats.unsubscribe_count;
```

**Auth:** API secret as query parameter `?api_secret=<KEY>`

**Rate limit:** 120 requests per rolling 60 seconds

#### Lemlist (REST API, Basic auth)

**Account data:**
- Email accounts/senders are configured per campaign via `GET /api/campaigns/{campaignId}` — the `senders` array lists connected mailboxes

**Analytics data:**
- `GET /api/campaigns/{campaignId}/stats` — campaign-level stats
- `GET /api/activities?type=emailsSent` — per-activity feed, filterable by type
- Activity types: `emailsSent`, `emailsOpened`, `emailsClicked`, `emailsBounced`, `emailsReplied`, `emailsUnsubscribed`
- Each activity includes `sendUserEmail` field — this tells you which email account sent it

**Deriving per-account metrics from Lemlist:**
```javascript
// Fetch activities for each type, group by sendUserEmail
const sentActivities = await fetch(`/api/activities?type=emailsSent&campaignId=${id}`);
const openActivities = await fetch(`/api/activities?type=emailsOpened&campaignId=${id}`);
// Group by sendUserEmail to get per-account counts
```

**Auth:** Basic auth with empty username: `Authorization: Basic base64(':' + API_KEY)`

**Rate limit:** Be conservative, no official documented limit

#### Smartlead (API v1, API key as query param)

**Account data:**
- `GET /api/v1/email-accounts/?api_key=<KEY>&offset=0&limit=100` — returns all email accounts with `max_email_per_day`, SMTP/IMAP config, warmup details
- `GET /api/v1/campaigns/{campaign_id}/email-accounts?api_key=<KEY>` — accounts assigned to a specific campaign

**Analytics data:**
- `GET /api/v1/campaigns/{campaign_id}/statistics?api_key=<KEY>&offset=0&limit=100` — per-lead stats with `sent_time`, `open_time`, `click_time`, `reply_time`, `open_count`, `click_count`, `is_unsubscribed`, `is_bounced`
- `GET /api/v1/campaigns/{campaign_id}/analytics-by-date?api_key=<KEY>&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` — daily: sent, open, click, reply, bounce, unsubscribe counts
- `GET /api/v1/analytics/overview?api_key=<KEY>` — aggregate across all campaigns: sent/open/click/reply totals, lead category distribution, domain health, provider comparison

**Campaigns data:**
- `GET /api/v1/campaigns?api_key=<KEY>` — all campaigns with `max_leads_per_day`, `status`, `min_time_btwn_emails`

**Auth:** API key as query parameter `?api_key=<KEY>`

**Rate limit:** 10 requests per 2 seconds per API key

### 3.2 Sync service architecture

The sync service is a Node.js cron job that runs every 15 minutes.

```
sync_service/
├── index.js                    # Cron scheduler (node-cron)
├── connectors/
│   ├── instantly.js            # Instantly.ai API connector
│   ├── convertkit.js           # ConvertKit API connector
│   ├── lemlist.js              # Lemlist API connector
│   └── smartlead.js            # Smartlead API connector
├── normalizer.js               # Normalizes all platform responses to common schema
├── aggregator.js               # Computes combined metrics + weighted rates
├── db.js                       # Supabase client + upsert helpers
└── config.js                   # API keys (from env vars), sync interval
```

**Sync cycle flow:**

```
1. For each platform:
   a. Fetch all email accounts from platform API
   b. Fetch today's analytics/engagement data
   c. Normalize to common schema: { email, sent, opened, clicked, replied, bounced, unsubscribed }

2. For each email account in our database:
   a. Match platform data by email address
   b. Upsert into email_sync_snapshots (one row per account per platform per day)

3. For each email account:
   a. Sum all platform snapshots for today
   b. Calculate weighted rates
   c. Calculate remaining capacity (global_limit - total_sent)
   d. Upsert into email_analytics_daily

4. If any account's total_sent >= 90% of global_daily_limit:
   a. Flag as "near_limit" in the response
   b. Optionally trigger webhook/notification to pause sending on platforms that still have allocation remaining
```

**Normalized schema (what every connector must return):**

```typescript
interface PlatformSyncResult {
  platform: 'instantly' | 'convertkit' | 'lemlist' | 'smartlead';
  accounts: Array<{
    email: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
  }>;
}
```

Each connector is responsible for transforming the platform-specific response into this shape. The normalizer doesn't guess — if a platform doesn't provide a metric (e.g., ConvertKit doesn't provide reply count via API), the connector sets it to 0 and the sync service relies on webhooks or manual input for that metric.

### 3.3 Webhook listeners

In addition to the 15-minute polling, set up webhook endpoints for real-time events:

```
POST /api/webhooks/instantly   → handles: email_sent, email_opened, reply_received, email_bounced, lead_unsubscribed
POST /api/webhooks/smartlead   → handles: EMAIL_SENT, EMAIL_OPENED, EMAIL_REPLIED, LEAD_UNSUBSCRIBED
POST /api/webhooks/lemlist     → handles: emailsSent, emailsOpened, emailsClicked, emailsBounced, emailsReplied
```

ConvertKit webhooks (v4 beta): `subscriber.subscriber_activate`, `subscriber.subscriber_unsubscribe`, `subscriber.form_subscribe`

Each webhook handler should:
1. Validate the webhook signature/source
2. Identify which email account sent/received the event
3. Increment the relevant counter in `email_sync_snapshots` for today
4. Recompute `email_analytics_daily` for that account

This gives you near-real-time updates between the 15-minute full syncs.

---

## 4. Frontend architecture

### 4.1 Module structure

```
src/modules/email/
├── EmailPage.jsx                     # Main page with tab navigation
├── tabs/
│   ├── OverviewTab.jsx               # Combined view across all platforms
│   ├── PlatformTab.jsx               # Reusable tab for each platform (parameterized)
├── components/
│   ├── MetricCard.jsx                # Single metric display (label, value, sub-label)
│   ├── RateCard.jsx                  # Engagement rate with benchmark indicator
│   ├── ProgressBar.jsx               # Simple horizontal progress bar
│   ├── StackedBar.jsx                # Multi-color stacked bar (one color per platform)
│   ├── HealthPill.jsx                # Status badge (Healthy / Near limit / Maxed)
│   ├── PlatformPill.jsx              # Colored tag showing platform name
│   ├── AccountRow.jsx                # Expandable table row for one email account
│   ├── ExpandedAccountDetail.jsx     # Expanded breakdown with per-tool metrics
│   ├── PlatformSummaryTable.jsx      # Per-tool aggregation table
│   └── AccountsTable.jsx             # Full accounts table with expand/collapse
├── hooks/
│   ├── useEmailAccounts.js           # Supabase query for email_accounts + joins
│   ├── useAnalytics.js               # Supabase query for email_analytics_daily
│   ├── usePlatformMetrics.js         # Computed metrics per platform
│   └── useGlobalMetrics.js           # Computed metrics across everything
├── utils/
│   ├── calculations.js               # Rate calculation helpers
│   └── constants.js                  # Platform colors, benchmarks, labels
└── api/
    ├── syncService.js                # Trigger manual sync
    └── allocationService.js          # Update allocations
```

### 4.2 Tab structure

The page has 5 tabs:

| Tab | Content |
|-----|---------|
| **Overview** | Global capacity gauge, weighted engagement metrics, per-tool summary table, all email accounts table (expandable rows) |
| **Instantly.ai** | Instantly-specific metrics, accounts allocated to Instantly with per-account engagement, shows "also on" other platforms |
| **ConvertKit** | ConvertKit-specific metrics, broadcast-oriented view, subscriber-based capacity |
| **Lemlist** | Lemlist-specific metrics, multi-channel activity view, per-account engagement |
| **Smartlead** | Smartlead-specific metrics, campaign-level stats, per-account engagement |

### 4.3 Overview tab layout (top to bottom)

**Section 1: Capacity gauge (3 cards in a row)**
- Total daily limit (you set): sum of all `email_accounts.global_daily_limit`
- Combined sent today: sum of all `email_sync_snapshots.sent` for today, with progress bar showing % of global limit
- Remaining today: global limit minus combined sent, green text

**Section 2: Weighted engagement metrics (5 cards in a row)**
- Open rate: `(total_opened / total_sent) × 100` with benchmark (green if ≥15%, red if below)
- Click rate: same formula, benchmark ≥2%
- Reply rate: same formula, benchmark ≥2%
- Bounce rate: same formula, benchmark ≤2% is healthy, >2% is red
- Unsubscribe rate: same formula, benchmark ≤0.5% is healthy

Each card shows the rate as a large number, the absolute count below (e.g., "142 opens from 1,247 sent"), and a green/red benchmark indicator.

**Section 3: Per-tool allocation and engagement table**

| Tool | Accounts | Allocated | Sent | Open % | Click % | Reply % | Bounce % | Unsub % | Usage bar |
|------|----------|-----------|------|--------|---------|---------|----------|---------|-----------|

Footer row shows "Weighted total" — calculated as `SUM(metric) / SUM(sent)` across all platforms, not `AVG(platform_rates)`.

**Section 4: All email accounts table (expandable rows)**

Each row shows:
- Email address with platform pills underneath (e.g., [Instantly.ai] [Lemlist])
- Global limit (what you set)
- Total sent today (combined across all platforms)
- Remaining (global limit minus total sent)
- Open %, Click %, Reply %, Bounce %, Unsub % (combined weighted rates for this account)
- Stacked progress bar (each platform's sent as a colored segment)
- Health pill (Healthy / Near limit / Maxed)
- Expand arrow

**When expanded, each row shows:**
- 5 rate cards (open, click, reply, bounce, unsub) for this account combined
- Per-tool breakdown table showing: platform pill, allocated, sent, opens, clicks, replies, bounces, unsubs, open %, usage bar
- Combined footer row
- Warning banner if total allocated exceeds global limit

### 4.4 Platform tab layout (Instantly.ai / ConvertKit / Lemlist / Smartlead)

**Section 1: Capacity for this platform (4 cards)**
- Allocated to [Platform]: sum of all allocations for this platform
- Sent via [Platform]: sum of all sent for this platform, with progress bar
- Allocation remaining: allocated minus sent
- Accounts connected: count of accounts that have this platform

**Section 2: Platform engagement metrics (5 rate cards)**
- Same 5 metrics, but only from data sent through this specific platform
- Benchmarks same as overview

**Section 3: Accounts table for this platform**

Each row shows:
- Email address with "Also on: [other platforms]" subtitle
- Global limit (the account's total limit)
- This platform's allocation
- Sent via this platform
- Other tools' sent count (so you see the full picture)
- Open %, Reply %, Bounce % (for this platform only)
- Global remaining (global limit minus all platforms' sent)
- Stacked progress bar showing global usage

**Section 4: API source note**
Text box at the bottom showing exactly which API endpoints the data comes from. This is for developer reference and transparency.

---

## 5. Engagement metrics benchmarks

These are the benchmarks used in the UI to color-code rates as "good" or "needs attention":

| Metric | Good (green) | Average (neutral) | Poor (red) |
|--------|-------------|-------------------|------------|
| Open rate | ≥ 15% | 10–15% | < 10% |
| Click rate | ≥ 2.5% | 1–2.5% | < 1% |
| Reply rate | ≥ 2% | 1–2% | < 1% |
| Bounce rate | ≤ 2% | 2–5% | > 5% |
| Unsubscribe rate | ≤ 0.5% | 0.5–1% | > 1% |

These benchmarks are for cold email outreach to medical professionals. They may differ from general marketing benchmarks. Store them in `constants.js` so they can be easily adjusted.

---

## 6. Allocation management

### 6.1 Setting global limits

The user sets the global daily limit for each email account via the CRM settings. This is stored in `email_accounts.global_daily_limit`. This number represents how many total emails that inbox should send per day across ALL platforms combined.

**Guidance for setting limits:**
- New/warming accounts: 20–30/day
- Warmed accounts (score > 85): 50–100/day
- Dedicated sending domains: 100–300/day
- ConvertKit broadcast accounts: matches subscriber plan limit

### 6.2 Allocating to platforms

The user allocates portions of the global limit to each connected platform. Stored in `platform_connections.allocated_daily_limit`.

**Example:**
```
dr.outreach1@aimedical.io → global_daily_limit: 100
├── Instantly.ai: allocated 60
├── Lemlist: allocated 40
└── Total allocated: 100 (100% of limit — healthy)
```

**Validation rules:**
- Warn (yellow) if total allocated = 100% of global limit (no buffer)
- Warn (orange) if total allocated > global limit (over-allocated)
- Block if any single allocation > global limit

### 6.3 Auto-pause logic

When the sync service detects that an email account has sent ≥ 90% of its global daily limit:

1. Mark the account as "near_limit" in the UI
2. Calculate which platform(s) still have allocation remaining
3. Optionally trigger a pause via each platform's API:
   - Instantly: `POST /api/v2/accounts/{email}/pause`
   - Smartlead: `PATCH /api/v1/campaigns/{id}/status` with `status: "PAUSED"`
   - Lemlist: `POST /api/campaigns/{id}/pause`
   - ConvertKit: Cannot auto-pause mid-broadcast

This prevents over-sending even if individual platform limits are set higher than the CRM allocation.

---

## 7. API routes (Node.js backend)

```
GET    /api/email/accounts                    → List all email accounts with allocations and today's metrics
GET    /api/email/accounts/:id                → Single account detail with per-platform breakdown
PUT    /api/email/accounts/:id                → Update global_daily_limit
POST   /api/email/accounts                    → Add new email account

GET    /api/email/accounts/:id/connections     → List platform connections for an account
POST   /api/email/accounts/:id/connections     → Add platform connection with allocation
PUT    /api/email/connections/:id              → Update allocation
DELETE /api/email/connections/:id              → Remove platform connection

GET    /api/email/analytics/overview           → Global metrics (today or date range)
GET    /api/email/analytics/platform/:platform → Platform-specific metrics
GET    /api/email/analytics/account/:id        → Per-account time-series

POST   /api/email/sync/trigger                 → Manually trigger a sync cycle
GET    /api/email/sync/status                  → Last sync time, errors

POST   /api/webhooks/instantly                 → Instantly webhook receiver
POST   /api/webhooks/smartlead                 → Smartlead webhook receiver
POST   /api/webhooks/lemlist                   → Lemlist webhook receiver
POST   /api/webhooks/convertkit                → ConvertKit webhook receiver
```

---

## 8. Environment variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Instantly.ai
INSTANTLY_API_KEY=your_instantly_bearer_token

# ConvertKit
CONVERTKIT_API_SECRET=your_convertkit_api_secret

# Lemlist
LEMLIST_API_KEY=your_lemlist_api_key

# Smartlead
SMARTLEAD_API_KEY=your_smartlead_api_key

# Sync
SYNC_INTERVAL_MINUTES=15
SYNC_TIMEZONE=UTC
AUTO_PAUSE_THRESHOLD=0.9
```

---

## 9. Build order

Build in this sequence. Each step should be independently testable.

**Phase 1: Database and data layer**
1. Create Supabase tables (email_accounts, platform_connections, email_sync_snapshots, email_analytics_daily)
2. Add Row Level Security policies
3. Seed with test email accounts and platform connections
4. Write the aggregation query that computes weighted metrics

**Phase 2: API connectors**
5. Build the Instantly.ai connector (highest volume, most complete API)
6. Build the Smartlead connector
7. Build the Lemlist connector
8. Build the ConvertKit connector
9. Build the normalizer that converts all platform responses to the common schema

**Phase 3: Sync service**
10. Build the cron scheduler with node-cron
11. Wire up all connectors → normalizer → Supabase upsert
12. Build the aggregator that computes email_analytics_daily
13. Add webhook endpoints for real-time updates
14. Add auto-pause logic

**Phase 4: Frontend — Overview tab**
15. Build MetricCard, RateCard, ProgressBar, StackedBar, HealthPill, PlatformPill components
16. Build the capacity gauge section (3 cards)
17. Build the weighted engagement metrics section (5 rate cards)
18. Build the per-tool summary table
19. Build the expandable accounts table with AccountRow and ExpandedAccountDetail
20. Wire up Supabase realtime subscriptions for live updates

**Phase 5: Frontend — Platform tabs**
21. Build the reusable PlatformTab component (parameterized by platform key)
22. Add platform-specific capacity cards
23. Add platform-specific engagement rate cards
24. Add per-account table with "also on" and global remaining columns
25. Add API source note at the bottom of each tab

**Phase 6: Allocation management**
26. Build the allocation editor UI (set global limits, allocate to platforms)
27. Add validation warnings (over-allocation, no buffer)
28. Wire up auto-pause triggers
29. Add notification system for near-limit alerts

---

## 10. Key formulas reference

```javascript
// Weighted open rate across multiple accounts or platforms
function weightedRate(items, metricField, sentField = 'sent') {
  const totalMetric = items.reduce((sum, item) => sum + item[metricField], 0);
  const totalSent = items.reduce((sum, item) => sum + item[sentField], 0);
  return totalSent > 0 ? ((totalMetric / totalSent) * 100).toFixed(1) : '0.0';
}

// Usage:
const openRate = weightedRate(allAccountSnapshots, 'opened');   // correct
const openRate = average(allAccountSnapshots.map(a => a.openRate));  // WRONG — never do this

// Remaining capacity for one email account
function remainingCapacity(account, todaySnapshots) {
  const totalSent = todaySnapshots
    .filter(s => s.email_account_id === account.id)
    .reduce((sum, s) => sum + s.sent, 0);
  return account.global_daily_limit - totalSent;
}

// Health status
function getHealth(account, totalSent) {
  const remaining = account.global_daily_limit - totalSent;
  const usagePct = (totalSent / account.global_daily_limit) * 100;
  if (remaining <= 0) return 'maxed';
  if (usagePct >= 90) return 'near_limit';
  return 'healthy';
}
```

---

## 11. Design tokens

Platform colors used throughout the UI:

| Platform | Primary | Light BG | Dark text |
|----------|---------|----------|-----------|
| Instantly.ai | `#D85A30` | `#FAECE7` | `#712B13` |
| ConvertKit | `#BA7517` | `#FAEEDA` | `#412402` |
| Lemlist | `#0F6E56` | `#E1F5EE` | `#04342C` |
| Smartlead | `#534AB7` | `#EEEDFE` | `#26215C` |

Rate benchmark colors:
- Good: use the app's existing success color
- Warning: use the app's existing warning color
- Danger: use the app's existing danger color

The dashboard should match the existing CRM design system — dark navy/charcoal sidebar, white/light content area, consistent with the rest of the AI Medical CRM.

---

## 12. Reference mockup

The interactive mockup for this module is available at:

**File:** `email-full-dashboard.jsx`

This React artifact contains the complete working UI with sample data for all 14 email accounts, all 4 platforms, expandable rows, all 5 engagement metrics, per-tool breakdowns, and all 5 tabs. Use it as the visual specification for building the production version.

The mockup data structure mirrors the Supabase schema — each email account has allocations with sent/opened/clicked/replied/bounced/unsubscribed counts per platform. The production version replaces the hardcoded data with Supabase queries.
