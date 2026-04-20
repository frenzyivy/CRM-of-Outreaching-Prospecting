import { useState } from "react";

const PLATFORMS = {
  instantly: { name: "Instantly.ai", color: "#D85A30", bg: "#FAECE7", text: "#712B13" },
  convertkit: { name: "ConvertKit", color: "#BA7517", bg: "#FAEEDA", text: "#412402" },
  lemlist: { name: "Lemlist", color: "#0F6E56", bg: "#E1F5EE", text: "#04342C" },
  smartlead: { name: "Smartlead", color: "#534AB7", bg: "#EEEDFE", text: "#26215C" },
};

const EMAIL_ACCOUNTS = [
  {
    email: "dr.outreach1@aimedical.io", globalLimit: 100, warmupScore: 92,
    allocations: [
      { platform: "instantly", allocated: 60, sent: 38, opened: 9, clicked: 3, replied: 2, bounced: 1, unsubscribed: 0 },
      { platform: "lemlist", allocated: 40, sent: 22, opened: 6, clicked: 2, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
  {
    email: "dr.outreach2@aimedical.io", globalLimit: 100, warmupScore: 88,
    allocations: [
      { platform: "instantly", allocated: 50, sent: 50, opened: 11, clicked: 4, replied: 3, bounced: 2, unsubscribed: 1 },
      { platform: "smartlead", allocated: 50, sent: 48, opened: 8, clicked: 2, replied: 2, bounced: 3, unsubscribed: 0 },
    ],
  },
  {
    email: "contact@aimedical.io", globalLimit: 80, warmupScore: 95,
    allocations: [
      { platform: "instantly", allocated: 50, sent: 32, opened: 8, clicked: 3, replied: 2, bounced: 0, unsubscribed: 0 },
      { platform: "lemlist", allocated: 30, sent: 18, opened: 5, clicked: 1, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
  {
    email: "clinic.reach@aimedical.io", globalLimit: 60, warmupScore: 90,
    allocations: [
      { platform: "instantly", allocated: 60, sent: 41, opened: 7, clicked: 2, replied: 1, bounced: 1, unsubscribed: 0 },
    ],
  },
  {
    email: "dental.outreach@aimedical.io", globalLimit: 80, warmupScore: 87,
    allocations: [
      { platform: "instantly", allocated: 40, sent: 28, opened: 5, clicked: 1, replied: 1, bounced: 1, unsubscribed: 0 },
      { platform: "smartlead", allocated: 40, sent: 24, opened: 4, clicked: 1, replied: 1, bounced: 2, unsubscribed: 0 },
    ],
  },
  {
    email: "derm.outreach@aimedical.io", globalLimit: 60, warmupScore: 91,
    allocations: [
      { platform: "lemlist", allocated: 60, sent: 35, opened: 9, clicked: 3, replied: 2, bounced: 0, unsubscribed: 1 },
    ],
  },
  {
    email: "poland.reach@aimedical.io", globalLimit: 50, warmupScore: 85,
    allocations: [
      { platform: "instantly", allocated: 30, sent: 28, opened: 4, clicked: 1, replied: 1, bounced: 2, unsubscribed: 0 },
      { platform: "smartlead", allocated: 20, sent: 18, opened: 3, clicked: 1, replied: 0, bounced: 1, unsubscribed: 0 },
    ],
  },
  {
    email: "spain.reach@aimedical.io", globalLimit: 50, warmupScore: 89,
    allocations: [
      { platform: "instantly", allocated: 30, sent: 22, opened: 5, clicked: 2, replied: 1, bounced: 0, unsubscribed: 0 },
      { platform: "lemlist", allocated: 20, sent: 14, opened: 4, clicked: 1, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
  {
    email: "newsletter@aimedical.io", globalLimit: 1000, warmupScore: null,
    allocations: [
      { platform: "convertkit", allocated: 1000, sent: 680, opened: 142, clicked: 48, replied: 12, bounced: 3, unsubscribed: 8 },
    ],
  },
  {
    email: "updates@aimedical.io", globalLimit: 500, warmupScore: null,
    allocations: [
      { platform: "convertkit", allocated: 500, sent: 360, opened: 68, clicked: 22, replied: 6, bounced: 2, unsubscribed: 5 },
    ],
  },
  {
    email: "komal@aimedical.io", globalLimit: 60, warmupScore: 93,
    allocations: [
      { platform: "lemlist", allocated: 40, sent: 27, opened: 7, clicked: 2, replied: 2, bounced: 0, unsubscribed: 0 },
      { platform: "instantly", allocated: 20, sent: 12, opened: 3, clicked: 1, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
  {
    email: "sales.de@aimedical.io", globalLimit: 50, warmupScore: 88,
    allocations: [
      { platform: "lemlist", allocated: 30, sent: 19, opened: 5, clicked: 1, replied: 1, bounced: 0, unsubscribed: 0 },
      { platform: "smartlead", allocated: 20, sent: 11, opened: 2, clicked: 0, replied: 0, bounced: 1, unsubscribed: 0 },
    ],
  },
  {
    email: "sales.es@aimedical.io", globalLimit: 40, warmupScore: 91,
    allocations: [
      { platform: "lemlist", allocated: 40, sent: 24, opened: 6, clicked: 2, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
  {
    email: "cold1@aimedical.io", globalLimit: 80, warmupScore: 94,
    allocations: [
      { platform: "smartlead", allocated: 50, sent: 33, opened: 5, clicked: 1, replied: 1, bounced: 2, unsubscribed: 0 },
      { platform: "instantly", allocated: 30, sent: 18, opened: 4, clicked: 1, replied: 1, bounced: 0, unsubscribed: 0 },
    ],
  },
];

function sumField(allocations, field) { return allocations.reduce((s, a) => s + (a[field] || 0), 0); }
function rate(num, den) { return den > 0 ? ((num / den) * 100).toFixed(1) : "0.0"; }

function getAccountMetrics(account) {
  const als = account.allocations;
  const sent = sumField(als, "sent");
  const opened = sumField(als, "opened");
  const clicked = sumField(als, "clicked");
  const replied = sumField(als, "replied");
  const bounced = sumField(als, "bounced");
  const unsub = sumField(als, "unsubscribed");
  const allocated = sumField(als, "allocated");
  const remaining = account.globalLimit - sent;
  const usagePct = account.globalLimit > 0 ? Math.round((sent / account.globalLimit) * 100) : 0;
  return { sent, opened, clicked, replied, bounced, unsub, allocated, remaining, usagePct, openRate: rate(opened, sent), clickRate: rate(clicked, sent), replyRate: rate(replied, sent), bounceRate: rate(bounced, sent), unsubRate: rate(unsub, sent) };
}

function getGlobalMetrics() {
  let totalLimit = 0, sent = 0, opened = 0, clicked = 0, replied = 0, bounced = 0, unsub = 0, allocated = 0;
  EMAIL_ACCOUNTS.forEach(a => {
    totalLimit += a.globalLimit;
    a.allocations.forEach(al => { sent += al.sent; opened += al.opened; clicked += al.clicked; replied += al.replied; bounced += al.bounced; unsub += al.unsubscribed; allocated += al.allocated; });
  });
  return { totalLimit, sent, opened, clicked, replied, bounced, unsub, allocated, remaining: totalLimit - sent, usagePct: totalLimit > 0 ? Math.round((sent / totalLimit) * 100) : 0, openRate: rate(opened, sent), clickRate: rate(clicked, sent), replyRate: rate(replied, sent), bounceRate: rate(bounced, sent), unsubRate: rate(unsub, sent) };
}

function getPlatformMetrics(pk) {
  let allocated = 0, sent = 0, opened = 0, clicked = 0, replied = 0, bounced = 0, unsub = 0, accts = 0;
  EMAIL_ACCOUNTS.forEach(a => { a.allocations.filter(al => al.platform === pk).forEach(al => { allocated += al.allocated; sent += al.sent; opened += al.opened; clicked += al.clicked; replied += al.replied; bounced += al.bounced; unsub += al.unsubscribed; accts++; }); });
  return { allocated, sent, opened, clicked, replied, bounced, unsub, accts, remaining: allocated - sent, openRate: rate(opened, sent), clickRate: rate(clicked, sent), replyRate: rate(replied, sent), bounceRate: rate(bounced, sent), unsubRate: rate(unsub, sent) };
}

function PlatformPill({ platform }) {
  const p = PLATFORMS[platform];
  return <span style={{ padding: "2px 7px", fontSize: 10, borderRadius: 10, background: p.bg, color: p.text, fontWeight: 500, whiteSpace: "nowrap" }}>{p.name}</span>;
}

function HealthPill({ usagePct, remaining }) {
  if (remaining <= 0) return <span style={{ padding: "2px 8px", fontSize: 10, borderRadius: 10, background: "var(--color-background-danger)", color: "var(--color-text-danger)" }}>Maxed</span>;
  if (usagePct >= 90) return <span style={{ padding: "2px 8px", fontSize: 10, borderRadius: 10, background: "var(--color-background-warning)", color: "var(--color-text-warning)" }}>Near limit</span>;
  return <span style={{ padding: "2px 8px", fontSize: 10, borderRadius: 10, background: "var(--color-background-success)", color: "var(--color-text-success)" }}>Healthy</span>;
}

function Bar({ value, max, color, h = 6 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ width: "100%", height: h, background: "var(--color-border-tertiary)", borderRadius: h / 2, overflow: "hidden" }}><div style={{ width: `${Math.round(pct)}%`, height: "100%", background: color, borderRadius: h / 2 }} /></div>;
}

function StackedBar({ allocations, globalLimit }) {
  return <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--color-border-tertiary)", width: "100%" }}>{allocations.map((a, i) => <div key={i} style={{ width: `${globalLimit > 0 ? Math.round((a.sent / globalLimit) * 100) : 0}%`, height: "100%", background: PLATFORMS[a.platform].color }} />)}</div>;
}

function Metric({ label, value, sub, subColor, small }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: small ? "10px 12px" : "14px 16px" }}>
      <div style={{ fontSize: small ? 11 : 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: small ? 18 : 22, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || "var(--color-text-secondary)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function RateCard({ label, value, benchmark, good }) {
  const isGood = good !== undefined ? good : parseFloat(value) > 0;
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>{value}%</div>
      {benchmark && <div style={{ fontSize: 10, color: isGood ? "var(--color-text-success)" : "var(--color-text-danger)", marginTop: 3 }}>{benchmark}</div>}
    </div>
  );
}

function Section({ title, right, children, sub }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sub ? 2 : 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        {right}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 12 }}>{sub}</div>}
      {children}
    </div>
  );
}

function ExpandedRow({ account }) {
  const m = getAccountMetrics(account);
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
        Breakdown for {account.email} — global limit: {account.globalLimit}/day — combined sent: {m.sent}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
        <RateCard label="Open rate" value={m.openRate} benchmark={parseFloat(m.openRate) >= 15 ? "Good (≥15%)" : "Below 15%"} good={parseFloat(m.openRate) >= 15} />
        <RateCard label="Click rate" value={m.clickRate} benchmark={parseFloat(m.clickRate) >= 2 ? "Good (≥2%)" : "Below 2%"} good={parseFloat(m.clickRate) >= 2} />
        <RateCard label="Reply rate" value={m.replyRate} benchmark={parseFloat(m.replyRate) >= 2 ? "Good (≥2%)" : "Below 2%"} good={parseFloat(m.replyRate) >= 2} />
        <RateCard label="Bounce rate" value={m.bounceRate} benchmark={parseFloat(m.bounceRate) <= 2 ? "Healthy (≤2%)" : "High — check list"} good={parseFloat(m.bounceRate) <= 2} />
        <RateCard label="Unsub rate" value={m.unsubRate} benchmark={parseFloat(m.unsubRate) <= 0.5 ? "Healthy (≤0.5%)" : "Watch this"} good={parseFloat(m.unsubRate) <= 0.5} />
      </div>
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "var(--color-text-tertiary)" }}>
            <td style={{ padding: "4px 0" }}>Tool</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Alloc.</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Sent</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Opens</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Clicks</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Replies</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Bounces</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Unsubs</td>
            <td style={{ padding: "4px 0", textAlign: "right" }}>Open %</td>
            <td style={{ padding: "4px 0", width: 70 }}>Usage</td>
          </tr>
        </thead>
        <tbody>
          {account.allocations.map((a, i) => (
            <tr key={i}>
              <td style={{ padding: "5px 0" }}><PlatformPill platform={a.platform} /></td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.allocated}</td>
              <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 500 }}>{a.sent}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.opened}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.clicked}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.replied}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.bounced}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{a.unsubscribed}</td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>{rate(a.opened, a.sent)}%</td>
              <td style={{ padding: "5px 0" }}><Bar value={a.sent} max={a.allocated} color={PLATFORMS[a.platform].color} h={5} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>
            <td style={{ padding: "5px 0" }}>Combined</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.allocated}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.sent}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.opened}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.clicked}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.replied}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.bounced}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.unsub}</td>
            <td style={{ padding: "5px 0", textAlign: "right" }}>{m.openRate}%</td>
            <td style={{ padding: "5px 0" }}><Bar value={m.sent} max={account.globalLimit} color="#378ADD" h={5} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function OverviewTab() {
  const g = getGlobalMetrics();
  const [exp, setExp] = useState(null);
  const pks = ["instantly", "convertkit", "lemlist", "smartlead"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 12 }}>
        <Metric label="Total daily limit (you set)" value={g.totalLimit.toLocaleString()} sub={`${EMAIL_ACCOUNTS.length} email accounts`} />
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>Combined sent today</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{g.sent.toLocaleString()}</div>
          <div style={{ marginTop: 6 }}><Bar value={g.sent} max={g.totalLimit} color="#378ADD" /></div>
          <div style={{ fontSize: 11, color: "var(--color-text-info)", marginTop: 4 }}>{g.usagePct}% of global limit</div>
        </div>
        <Metric label="Remaining today" value={g.remaining.toLocaleString()} sub="Across all accounts" subColor="var(--color-text-success)" />
      </div>

      <Section title="Weighted engagement metrics" sub="Calculated as weighted averages — (total opens ÷ total sent), not average of averages">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10 }}>
          <RateCard label="Open rate" value={g.openRate} benchmark={`${g.opened} opens from ${g.sent} sent`} good={parseFloat(g.openRate) >= 15} />
          <RateCard label="Click rate" value={g.clickRate} benchmark={`${g.clicked} clicks`} good={parseFloat(g.clickRate) >= 2} />
          <RateCard label="Reply rate" value={g.replyRate} benchmark={`${g.replied} replies`} good={parseFloat(g.replyRate) >= 2} />
          <RateCard label="Bounce rate" value={g.bounceRate} benchmark={`${g.bounced} bounces`} good={parseFloat(g.bounceRate) <= 2} />
          <RateCard label="Unsubscribe rate" value={g.unsubRate} benchmark={`${g.unsub} unsubs`} good={parseFloat(g.unsubRate) <= 0.5} />
        </div>
      </Section>

      <Section title="Per-tool allocation & engagement">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 620 }}>
            <thead>
              <tr style={{ color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "8px 4px" }}>Tool</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Accts</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Alloc.</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Sent</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Open %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Click %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Reply %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Bounce %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Unsub %</td>
                <td style={{ padding: "8px 4px" }}>Usage</td>
              </tr>
            </thead>
            <tbody>
              {pks.map((pk, i) => {
                const pm = getPlatformMetrics(pk);
                const p = PLATFORMS[pk];
                return (
                  <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)" }}>
                    <td style={{ padding: "10px 4px" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.color, marginRight: 6, verticalAlign: "middle" }} />{p.name}</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.accts}</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.allocated}</td>
                    <td style={{ padding: "10px 4px", textAlign: "right", fontWeight: 500 }}>{pm.sent}</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.openRate}%</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.clickRate}%</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.replyRate}%</td>
                    <td style={{ padding: "10px 4px", textAlign: "right", color: parseFloat(pm.bounceRate) > 2 ? "var(--color-text-danger)" : "inherit" }}>{pm.bounceRate}%</td>
                    <td style={{ padding: "10px 4px", textAlign: "right" }}>{pm.unsubRate}%</td>
                    <td style={{ padding: "10px 4px", width: 70 }}><Bar value={pm.sent} max={pm.allocated} color={p.color} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid var(--color-border-secondary)", fontWeight: 500 }}>
                <td style={{ padding: "10px 4px" }}>Weighted total</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{EMAIL_ACCOUNTS.length}</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.allocated}</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.sent}</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.openRate}%</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.clickRate}%</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.replyRate}%</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.bounceRate}%</td>
                <td style={{ padding: "10px 4px", textAlign: "right" }}>{g.unsubRate}%</td>
                <td style={{ padding: "10px 4px" }}><Bar value={g.sent} max={g.totalLimit} color="#378ADD" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="All email accounts" right={<span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{EMAIL_ACCOUNTS.length} accounts — click to expand</span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 740 }}>
            <thead>
              <tr style={{ color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "8px 4px" }}>Email (tools connected)</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Limit</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Sent</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Left</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Open %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Click %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Reply %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Bounce %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Unsub %</td>
                <td style={{ padding: "8px 4px" }}>Usage</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Health</td>
                <td style={{ width: 20 }} />
              </tr>
            </thead>
            <tbody style={{ color: "var(--color-text-primary)" }}>
              {EMAIL_ACCOUNTS.map((acct, i) => {
                const m = getAccountMetrics(acct);
                const isExp = exp === i;
                return (
                  <React.Fragment key={i}>
                    <tr onClick={() => setExp(isExp ? null : i)} style={{ cursor: "pointer", borderBottom: isExp ? "none" : "0.5px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "9px 4px" }}>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{acct.email}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>{acct.allocations.map((a, j) => <PlatformPill key={j} platform={a.platform} />)}</div>
                      </td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}>{acct.globalLimit}</td>
                      <td style={{ padding: "9px 4px", textAlign: "right", fontWeight: 500 }}>{m.sent}</td>
                      <td style={{ padding: "9px 4px", textAlign: "right", color: m.remaining > 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{m.remaining}</td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}>{m.openRate}%</td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}>{m.clickRate}%</td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}>{m.replyRate}%</td>
                      <td style={{ padding: "9px 4px", textAlign: "right", color: parseFloat(m.bounceRate) > 2 ? "var(--color-text-danger)" : "inherit" }}>{m.bounceRate}%</td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}>{m.unsubRate}%</td>
                      <td style={{ padding: "9px 4px", width: 70 }}><StackedBar allocations={acct.allocations} globalLimit={acct.globalLimit} /></td>
                      <td style={{ padding: "9px 4px", textAlign: "right" }}><HealthPill usagePct={m.usagePct} remaining={m.remaining} /></td>
                      <td style={{ textAlign: "center", fontSize: 10, color: "var(--color-text-tertiary)" }}>{isExp ? "▾" : "▸"}</td>
                    </tr>
                    {isExp && (
                      <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        <td colSpan={12} style={{ padding: "0 4px 10px 4px" }}><ExpandedRow account={acct} /></td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function PlatformTab({ pk }) {
  const p = PLATFORMS[pk];
  const pm = getPlatformMetrics(pk);
  const accts = EMAIL_ACCOUNTS.filter(a => a.allocations.some(al => al.platform === pk));

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
        {pm.accts} email accounts allocated to {p.name}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 12 }}>
        <Metric label={`Allocated to ${p.name}`} value={pm.allocated.toLocaleString()} sub={`${pm.accts} accounts`} />
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>Sent via {p.name}</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{pm.sent.toLocaleString()}</div>
          <div style={{ marginTop: 6 }}><Bar value={pm.sent} max={pm.allocated} color={p.color} /></div>
          <div style={{ fontSize: 11, color: "var(--color-text-info)", marginTop: 4 }}>{pm.allocated > 0 ? Math.round((pm.sent / pm.allocated) * 100) : 0}% of allocation</div>
        </div>
        <Metric label="Allocation remaining" value={pm.remaining.toLocaleString()} subColor="var(--color-text-success)" />
        <Metric label="Accounts" value={pm.accts.toString()} />
      </div>

      <Section title={`${p.name} engagement metrics`} sub={`Weighted rates from ${pm.sent} emails sent via ${p.name} today`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10 }}>
          <RateCard label="Open rate" value={pm.openRate} benchmark={parseFloat(pm.openRate) >= 15 ? "Good" : "Below avg"} good={parseFloat(pm.openRate) >= 15} />
          <RateCard label="Click rate" value={pm.clickRate} benchmark={parseFloat(pm.clickRate) >= 2 ? "Good" : "Below avg"} good={parseFloat(pm.clickRate) >= 2} />
          <RateCard label="Reply rate" value={pm.replyRate} benchmark={parseFloat(pm.replyRate) >= 2 ? "Good" : "Below avg"} good={parseFloat(pm.replyRate) >= 2} />
          <RateCard label="Bounce rate" value={pm.bounceRate} benchmark={parseFloat(pm.bounceRate) <= 2 ? "Healthy" : "High"} good={parseFloat(pm.bounceRate) <= 2} />
          <RateCard label="Unsub rate" value={pm.unsubRate} benchmark={parseFloat(pm.unsubRate) <= 0.5 ? "Healthy" : "Watch"} good={parseFloat(pm.unsubRate) <= 0.5} />
        </div>
      </Section>

      <Section title={`Accounts on ${p.name}`} right={<span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Showing {p.name} allocation vs global limit</span>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr style={{ color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "8px 4px" }}>Email</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Global lim.</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>{p.name} alloc.</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Sent here</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Others sent</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Open %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Reply %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Bounce %</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>Global left</td>
                <td style={{ padding: "8px 4px" }}>Global usage</td>
              </tr>
            </thead>
            <tbody style={{ color: "var(--color-text-primary)" }}>
              {accts.map((acct, i) => {
                const thisAl = acct.allocations.find(a => a.platform === pk);
                const otherSent = acct.allocations.filter(a => a.platform !== pk).reduce((s, a) => s + a.sent, 0);
                const totalSent = acct.allocations.reduce((s, a) => s + a.sent, 0);
                const globalLeft = acct.globalLimit - totalSent;
                return (
                  <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <td style={{ padding: "9px 4px" }}>
                      <div style={{ fontWeight: 500 }}>{acct.email}</div>
                      {acct.allocations.filter(a => a.platform !== pk).length > 0 && (
                        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 1 }}>
                          Also: {acct.allocations.filter(a => a.platform !== pk).map(a => PLATFORMS[a.platform].name).join(", ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "9px 4px", textAlign: "right" }}>{acct.globalLimit}</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", fontWeight: 500, color: p.text }}>{thisAl.allocated}</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", fontWeight: 500 }}>{thisAl.sent}</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", color: "var(--color-text-secondary)" }}>{otherSent}</td>
                    <td style={{ padding: "9px 4px", textAlign: "right" }}>{rate(thisAl.opened, thisAl.sent)}%</td>
                    <td style={{ padding: "9px 4px", textAlign: "right" }}>{rate(thisAl.replied, thisAl.sent)}%</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", color: thisAl.sent > 0 && (thisAl.bounced / thisAl.sent) > 0.02 ? "var(--color-text-danger)" : "inherit" }}>{rate(thisAl.bounced, thisAl.sent)}%</td>
                    <td style={{ padding: "9px 4px", textAlign: "right", color: globalLeft > 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>{globalLeft}</td>
                    <td style={{ padding: "9px 4px", width: 64 }}><StackedBar allocations={acct.allocations} globalLimit={acct.globalLimit} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "12px 16px", fontSize: 11, color: "var(--color-text-secondary)" }}>
        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>API endpoints used: </span>
        {pk === "instantly" && "GET /api/v2/accounts → daily_limit, status, warmup | GET /api/v2/campaigns/analytics/daily → sent, opened, replied, bounced per account per day | GET /api/v2/campaigns/analytics/overview → clicks, unsubscribes"}
        {pk === "convertkit" && "GET /v3/broadcasts/{id}/stats → recipients, open_rate, click_rate, unsubscribe_count | GET /v3/subscribers → total subscriber count"}
        {pk === "lemlist" && "GET /api/campaigns/{id}/stats → sent, opened, clicked, replied, bounced | GET /api/activities → per-account activity feed with emailsSent, emailsOpened, emailsClicked, emailsBounced"}
        {pk === "smartlead" && "GET /api/v1/email-accounts → max_email_per_day per account | GET /api/v1/campaigns/{id}/statistics → sent, open_count, click_count, reply_time, is_bounced, is_unsubscribed | GET /api/v1/analytics/overview → aggregate metrics"}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "instantly", label: "Instantly.ai" },
    { key: "convertkit", label: "ConvertKit" },
    { key: "lemlist", label: "Lemlist" },
    { key: "smartlead", label: "Smartlead" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 500 }}>Email</span>
        <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Multi-channel email analytics & lead routing</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 16 }}>Last synced: 2 min ago — auto-refreshes every 15 min</div>

      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20, overflowX: "auto" }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            fontWeight: tab === t.key ? 500 : 400,
            color: tab === t.key ? (t.key === "overview" ? "var(--color-text-info)" : PLATFORMS[t.key]?.color) : "var(--color-text-secondary)",
            borderBottom: tab === t.key ? `2px solid ${t.key === "overview" ? "var(--color-text-info)" : PLATFORMS[t.key]?.color}` : "2px solid transparent",
          }}>{t.label}</div>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab /> : <PlatformTab pk={tab} />}
    </div>
  );
}
