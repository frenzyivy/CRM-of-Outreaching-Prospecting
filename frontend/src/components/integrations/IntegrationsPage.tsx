import { useState, useRef, useCallback, useEffect } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  Plug,
  CloudUpload,
  AlertTriangle,
  Users,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Unlink,
  Info,
} from 'lucide-react'
import Header from '../layout/Header'
import api from '../../api/client'
import {
  useIntegrationsStatus,
  useConnectIntegration,
  useDisconnectIntegration,
  useIntegrationCredentials,
} from '../../hooks/useIntegrations'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CredentialField {
  envKey: string
  label: string
  placeholder: string
  type: 'text' | 'password'
  hint?: string
}

interface Integration {
  id: string
  name: string
  description: string
  category: string
  logo: string
  canConnect: boolean   // false = coming soon
  docsHint?: string
  credentialFields: CredentialField[]
}

// ─── Integration definitions ─────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  // ── Already active / always-connected ──────────────────────────────────────
  {
    id: 'instantly',
    name: 'Instantly.ai',
    description: 'Cold email automation & campaigns. Bidirectional sync for opens, replies, bounces, and clicks.',
    category: 'outreach',
    logo: '⚡',
    canConnect: true,
    docsHint: 'Get your API key from Instantly → Settings → API',
    credentialFields: [
      {
        envKey: 'INSTANTLY_API_KEY',
        label: 'API Key',
        placeholder: 'inst_xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Found under Instantly → Settings → API Keys',
      },
    ],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'PostgreSQL database powering all lead data, pipeline stages, activities, and company records.',
    category: 'database',
    logo: '🟢',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'SUPABASE_URL',
        label: 'Project URL',
        placeholder: 'https://xxxx.supabase.co',
        type: 'text',
        hint: 'Project Settings → API → Project URL',
      },
      {
        envKey: 'SUPABASE_SERVICE_KEY',
        label: 'Service Role Key',
        placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        type: 'password',
        hint: 'Project Settings → API → service_role (secret key)',
      },
    ],
  },

  // ── Analytics ───────────────────────────────────────────────────────────────
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Track visitor behaviour, traffic sources, and conversion funnels from your CRM outreach.',
    category: 'analytics',
    logo: '📊',
    canConnect: true,
    docsHint: 'GA4 → Admin → Data Streams → Measurement Protocol',
    credentialFields: [
      {
        envKey: 'GA4_MEASUREMENT_ID',
        label: 'Measurement ID',
        placeholder: 'G-XXXXXXXXXX',
        type: 'text',
        hint: 'GA4 → Admin → Data Streams → your stream → Measurement ID',
      },
      {
        envKey: 'GA4_API_SECRET',
        label: 'Measurement Protocol API Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'GA4 → Admin → Data Streams → Measurement Protocol → API Secrets',
      },
    ],
  },
  {
    id: 'google_search',
    name: 'Google Search Console',
    description: 'Monitor search performance, index coverage, and keyword rankings for your landing pages.',
    category: 'analytics',
    logo: '🔎',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'GSC_CLIENT_ID',
        label: 'OAuth Client ID',
        placeholder: 'xxxxxxxxxxxx.apps.googleusercontent.com',
        type: 'text',
        hint: 'Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client',
      },
      {
        envKey: 'GSC_CLIENT_SECRET',
        label: 'OAuth Client Secret',
        placeholder: 'GOCSPX-xxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client',
      },
    ],
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Event-level product analytics to understand how leads interact with your campaigns and pages.',
    category: 'analytics',
    logo: '🍹',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'MIXPANEL_PROJECT_TOKEN',
        label: 'Project Token',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'text',
        hint: 'Mixpanel → Settings → Project Settings → Project Token',
      },
      {
        envKey: 'MIXPANEL_API_SECRET',
        label: 'API Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Mixpanel → Settings → Project Settings → API Secret',
      },
    ],
  },
  {
    id: 'heap',
    name: 'Heap',
    description: 'Automatically capture every user interaction to analyse drop-offs and engagement in your outreach.',
    category: 'analytics',
    logo: '📈',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'HEAP_APP_ID',
        label: 'App ID',
        placeholder: '1234567890',
        type: 'text',
        hint: 'Heap → Account → Privacy & Security → App ID',
      },
    ],
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    description: 'Heatmaps and session recordings to see how prospects navigate your pages after clicking emails.',
    category: 'analytics',
    logo: '🔥',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'HOTJAR_SITE_ID',
        label: 'Site ID',
        placeholder: '1234567',
        type: 'text',
        hint: 'Hotjar → Settings → Tracking Code → Site ID',
      },
      {
        envKey: 'HOTJAR_API_KEY',
        label: 'API Key',
        placeholder: 'hjapi_xxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Hotjar → Settings → API Keys',
      },
    ],
  },
  {
    id: 'segment',
    name: 'Segment',
    description: 'Central customer data platform. Route lead events and traits to any downstream analytics tool.',
    category: 'analytics',
    logo: '🔀',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'SEGMENT_WRITE_KEY',
        label: 'Write Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Segment → Sources → your source → Settings → API Keys → Write Key',
      },
    ],
  },

  // ── Data & Enrichment ────────────────────────────────────────────────────────
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'B2B lead database with 270M+ contacts. Enrich leads with email, phone, title, and firmographics.',
    category: 'prospecting',
    logo: '🚀',
    canConnect: true,
    docsHint: 'Apollo → Settings → Integrations → API Key',
    credentialFields: [
      {
        envKey: 'APOLLO_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Apollo → Settings → Integrations → API',
      },
    ],
  },
  {
    id: 'clay',
    name: 'Clay',
    description: 'AI-powered enrichment with 50+ data sources. Build hyper-personalised outreach at scale.',
    category: 'prospecting',
    logo: '🏺',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'CLAY_API_KEY',
        label: 'API Key',
        placeholder: 'clay_xxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Clay → Settings → API Keys',
      },
    ],
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Find and verify professional email addresses for any company domain in seconds.',
    category: 'prospecting',
    logo: '🎯',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'HUNTER_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Hunter → Dashboard → API Key',
      },
    ],
  },
  {
    id: 'lusha',
    name: 'Lusha',
    description: 'B2B contact data platform to instantly enrich leads with direct dials and work emails.',
    category: 'prospecting',
    logo: '📋',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'LUSHA_API_KEY',
        label: 'API Key',
        placeholder: 'lsh_xxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Lusha → Profile → API Key',
      },
    ],
  },
  {
    id: 'kaspr',
    name: 'Kaspr',
    description: 'LinkedIn-based prospecting tool to extract emails and phone numbers from profiles and lists.',
    category: 'prospecting',
    logo: '👻',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'KASPR_API_KEY',
        label: 'API Key',
        placeholder: 'kpr_xxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Kaspr → Settings → API',
      },
    ],
  },
  {
    id: 'phantombuster',
    name: 'PhantomBuster',
    description: 'Automate LinkedIn scraping, profile visits, and connection requests to build cold lead lists.',
    category: 'prospecting',
    logo: '👾',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'PHANTOMBUSTER_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'PhantomBuster → Settings → API Key',
      },
    ],
  },
  {
    id: 'wiza',
    name: 'Wiza',
    description: 'Export verified emails from LinkedIn Sales Navigator searches directly into your pipeline.',
    category: 'prospecting',
    logo: '🧙',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'WIZA_API_KEY',
        label: 'API Key',
        placeholder: 'wiza_xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Wiza → Account → API Key',
      },
    ],
  },
  {
    id: 'snovio',
    name: 'Snov.io',
    description: 'Email finder, drip campaigns, and lead warming. Find, verify, and convert B2B contacts.',
    category: 'prospecting',
    logo: '❄️',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'SNOVIO_USER_ID',
        label: 'User ID',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'text',
        hint: 'Snov.io → Profile → API',
      },
      {
        envKey: 'SNOVIO_API_SECRET',
        label: 'API Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Snov.io → Profile → API → Secret',
      },
    ],
  },
  {
    id: 'datagma',
    name: 'Datagma',
    description: 'Real-time data enrichment API for phone numbers, emails, and LinkedIn profiles.',
    category: 'prospecting',
    logo: '🔬',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'DATAGMA_API_KEY',
        label: 'API Key',
        placeholder: 'dgm_xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Datagma → Account → API Key',
      },
    ],
  },
  {
    id: 'dropcontact',
    name: 'Dropcontact',
    description: 'GDPR-compliant email finder and data enrichment. No database — uses algorithms only.',
    category: 'prospecting',
    logo: '💧',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'DROPCONTACT_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Dropcontact → Account → API Key',
      },
    ],
  },
  {
    id: 'clearbit',
    name: 'Clearbit',
    description: 'Real-time B2B data enrichment for companies and contacts. Powers personalisation at scale.',
    category: 'prospecting',
    logo: '💎',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'CLEARBIT_API_KEY',
        label: 'API Key / Secret Key',
        placeholder: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Clearbit → Dashboard → API Keys',
      },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Sales Nav',
    description: 'Import saved lead lists and search results from LinkedIn Sales Navigator into your pipeline.',
    category: 'prospecting',
    logo: '💼',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'LINKEDIN_CLIENT_ID',
        label: 'OAuth Client ID',
        placeholder: 'xxxxxxxxxxxxxxxx',
        type: 'text',
        hint: 'LinkedIn Developer Portal → Your App → Auth → Client ID',
      },
      {
        envKey: 'LINKEDIN_CLIENT_SECRET',
        label: 'OAuth Client Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'LinkedIn Developer Portal → Your App → Auth → Client Secret',
      },
    ],
  },
  {
    id: 'zoominfo',
    name: 'ZoomInfo',
    description: 'Enterprise B2B intelligence platform with intent data, org charts, and 100M+ company records.',
    category: 'prospecting',
    logo: '🔍',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'ZOOMINFO_USERNAME',
        label: 'Username / Email',
        placeholder: 'you@company.com',
        type: 'text',
        hint: 'Your ZoomInfo login email',
      },
      {
        envKey: 'ZOOMINFO_PASSWORD',
        label: 'Password',
        placeholder: '••••••••••••',
        type: 'password',
        hint: 'Your ZoomInfo account password',
      },
    ],
  },

  // ── Email Outreach ────────────────────────────────────────────────────────
  {
    id: 'lemlist',
    name: 'Lemlist',
    description: 'Multichannel outreach with personalised images and videos. Sync campaigns and track engagement.',
    category: 'outreach',
    logo: '🍋',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'LEMLIST_API_KEY',
        label: 'API Key',
        placeholder: 'lem_xxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Lemlist → Settings → Integrations → API Key',
      },
    ],
  },
  {
    id: 'smartlead',
    name: 'Smartlead',
    description: 'Unlimited mailboxes for cold email at scale. Rotate sending accounts and track reply rates.',
    category: 'outreach',
    logo: '📧',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'SMARTLEAD_API_KEY',
        label: 'API Key',
        placeholder: 'sl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Smartlead → Settings → API Keys',
      },
    ],
  },
  {
    id: 'woodpecker',
    name: 'Woodpecker',
    description: 'Automated follow-up sequences with human-like sending patterns and reply detection.',
    category: 'outreach',
    logo: '🐦',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'WOODPECKER_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Woodpecker → Settings → API Keys',
      },
    ],
  },
  {
    id: 'reply',
    name: 'Reply.io',
    description: 'AI-powered sales engagement with email, LinkedIn, calls, and SMS in one sequence.',
    category: 'outreach',
    logo: '💬',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'REPLY_API_KEY',
        label: 'API Key',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Reply → Settings → API Keys',
      },
    ],
  },
  {
    id: 'mailshake',
    name: 'Mailshake',
    description: 'Simple cold email tool with A/B testing, mail merge, and LinkedIn automation.',
    category: 'outreach',
    logo: '🤝',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'MAILSHAKE_API_KEY',
        label: 'API Key',
        placeholder: 'msk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Mailshake → Extensions → API',
      },
    ],
  },

  // ── CRM ──────────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot CRM',
    description: 'Two-way sync with HubSpot contacts and deals. Keep your pipeline in lockstep with HubSpot.',
    category: 'crm',
    logo: '🟠',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'HUBSPOT_ACCESS_TOKEN',
        label: 'Private App Access Token',
        placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        type: 'password',
        hint: 'HubSpot → Settings → Account Setup → Integrations → Private Apps',
      },
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM sync for contacts, accounts, and opportunities. Real-time bidirectional updates.',
    category: 'crm',
    logo: '☁️',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'SALESFORCE_CLIENT_ID',
        label: 'Connected App Client ID',
        placeholder: '3MVG9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'text',
        hint: 'Salesforce → Setup → App Manager → your app → Consumer Key',
      },
      {
        envKey: 'SALESFORCE_CLIENT_SECRET',
        label: 'Connected App Client Secret',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Salesforce → Setup → App Manager → your app → Consumer Secret',
      },
      {
        envKey: 'SALESFORCE_USERNAME',
        label: 'Salesforce Username',
        placeholder: 'you@yourorg.com',
        type: 'text',
      },
      {
        envKey: 'SALESFORCE_PASSWORD',
        label: 'Salesforce Password + Security Token',
        placeholder: 'PasswordSecurityToken (concatenated)',
        type: 'password',
        hint: 'Append your security token directly to your password with no space',
      },
    ],
  },
  {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Mirror deal stages and contact data between your AI Medical CRM and Pipedrive.',
    category: 'crm',
    logo: '🎯',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'PIPEDRIVE_API_TOKEN',
        label: 'Personal API Token',
        placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Pipedrive → Settings → Personal Preferences → API',
      },
    ],
  },
  {
    id: 'close',
    name: 'Close CRM',
    description: 'Sales CRM built for speed. Sync leads, calls, and emails between Close and your pipeline.',
    category: 'crm',
    logo: '🔒',
    canConnect: true,
    credentialFields: [
      {
        envKey: 'CLOSE_API_KEY',
        label: 'API Key',
        placeholder: 'api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        type: 'password',
        hint: 'Close → Settings → Your Profile → API Keys',
      },
    ],
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  outreach:    'Email Outreach',
  crm:         'CRM',
  prospecting: 'Prospecting & Enrichment',
  analytics:   'Analytics',
  database:    'Database',
}

const CATEGORY_ORDER = ['database', 'outreach', 'analytics', 'prospecting', 'crm']

// ─── Connect Modal ────────────────────────────────────────────────────────────

function ConnectModal({
  integration,
  isConnected,
  onClose,
}: {
  integration: Integration
  isConnected: boolean
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(integration.credentialFields.map((f) => [f.envKey, '']))
  )
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const connectMutation = useConnectIntegration()
  const disconnectMutation = useDisconnectIntegration()
  const [success, setSuccess] = useState(false)

  // Pre-fill masked values when the integration is already connected
  const { data: savedCreds, isLoading: credsLoading } = useIntegrationCredentials(
    integration.id,
    isConnected,
  )
  // Populate fields once creds arrive (only the first time)
  const prefilled = useRef(false)
  useEffect(() => {
    if (savedCreds && !prefilled.current) {
      prefilled.current = true
      setValues(Object.fromEntries(
        integration.credentialFields.map((f) => [f.envKey, savedCreds[f.envKey] ?? ''])
      ))
    }
  }, [savedCreds, integration.credentialFields])

  const handleChange = (envKey: string, val: string) => {
    setValues((prev) => ({ ...prev, [envKey]: val }))
  }

  const handleConnect = async () => {
    setSuccess(false)
    // Strip out masked placeholder values — only send real new values
    const realCredentials = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v.trim() && !isMasked(v))
    )
    try {
      await connectMutation.mutateAsync({
        integration_id: integration.id,
        credentials: realCredentials,
      })
      setSuccess(true)
    } catch {
      // error shown below
    }
  }

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync(integration.id)
    onClose()
  }

  // A masked placeholder like "***x1a2b" is not a real new value — don't re-save it unchanged
  const isMasked = (v: string) => v.startsWith('***')
  const hasRealChange = integration.credentialFields.some(
    (f) => values[f.envKey]?.trim() && !isMasked(values[f.envKey])
  )
  const allFilled = isConnected
    ? hasRealChange || integration.credentialFields.every((f) => values[f.envKey]?.trim())
    : integration.credentialFields.every((f) => values[f.envKey]?.trim())
  const canSave = isConnected ? hasRealChange : allFilled
  const isPending = connectMutation.isPending || disconnectMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">
              {integration.logo}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">{integration.name}</h2>
              <p className="text-xs text-slate-400">{CATEGORY_LABELS[integration.category]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Docs hint */}
          {integration.docsHint && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              <Info size={13} className="shrink-0 mt-0.5" />
              {integration.docsHint}
            </div>
          )}

          {/* Credential fields */}
          {credsLoading ? (
            <div className="space-y-4">
              {integration.credentialFields.map((f) => (
                <div key={f.envKey}>
                  <div className="w-32 h-3 rounded bg-slate-100 animate-pulse mb-2" />
                  <div className="w-full h-9 rounded-lg bg-slate-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            integration.credentialFields.map((field) => (
              <div key={field.envKey}>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {field.label}
                  <span className="ml-1.5 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {field.envKey}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={
                      field.type === 'password' && !showPassword[field.envKey]
                        ? 'password'
                        : 'text'
                    }
                    value={values[field.envKey]}
                    onChange={(e) => handleChange(field.envKey, e.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono placeholder:font-sans placeholder:text-slate-300 ${
                      isMasked(values[field.envKey])
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200'
                    }`}
                  />
                  {field.type === 'password' && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((p) => ({ ...p, [field.envKey]: !p[field.envKey] }))
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword[field.envKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
                {isMasked(values[field.envKey]) && (
                  <p className="text-[11px] text-emerald-600 mt-1">Credential set — clear and type a new value to update.</p>
                )}
                {!isMasked(values[field.envKey]) && field.hint && (
                  <p className="text-[11px] text-slate-400 mt-1">{field.hint}</p>
                )}
              </div>
            ))
          )}

          {/* Security note */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500">
            <Database size={12} className="shrink-0 mt-0.5 text-slate-400" />
            Credentials are saved directly to your server's <code className="bg-slate-100 px-1 rounded">.env</code> file and never stored in the browser or database.
          </div>

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              <CheckCircle2 size={14} />
              Credentials saved to <code className="text-xs bg-emerald-100 px-1 rounded">.env</code> successfully.
            </div>
          )}

          {/* Error */}
          {connectMutation.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {(connectMutation.error as { response?: { data?: { detail?: string } } })
                ?.response?.data?.detail ?? 'Failed to save credentials. Check the server is running.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-3">
          <button
            onClick={handleConnect}
            disabled={!canSave || isPending || credsLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && !disconnectMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plug size={14} />
            )}
            {isPending && !disconnectMutation.isPending ? 'Saving...' : 'Save & Connect'}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {disconnectMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Unlink size={13} />
              )}
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  statusMap,
}: {
  integration: Integration
  statusMap: Record<string, { connected: boolean; partial: boolean }>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const status = statusMap[integration.id]
  const isConnected = status?.connected ?? false
  const isPartial = status?.partial ?? false

  const badgeClass = isConnected
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : !integration.canConnect
      ? 'bg-slate-100 text-slate-400 border border-slate-200'
      : isPartial
        ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-200'
        : 'bg-blue-50 text-blue-600 border border-blue-200 cursor-pointer hover:bg-blue-100'

  const badgeDot = isConnected
    ? 'bg-emerald-500'
    : !integration.canConnect
      ? 'bg-slate-300'
      : isPartial
        ? 'bg-amber-500'
        : 'bg-blue-400'

  const badgeLabel = isConnected
    ? 'Connected'
    : !integration.canConnect
      ? 'Coming Soon'
      : isPartial
        ? 'Incomplete'
        : 'Connect'

  return (
    <>
      <div
        className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md ${
          isConnected
            ? 'border-emerald-200 shadow-sm shadow-emerald-50'
            : isPartial
              ? 'border-amber-200'
              : 'border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${
                isConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
              }`}
            >
              {integration.logo}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{integration.name}</h3>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                {CATEGORY_LABELS[integration.category]}
              </span>
            </div>
          </div>

          <button
            onClick={() => integration.canConnect && setModalOpen(true)}
            disabled={!integration.canConnect}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
            {badgeLabel}
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed flex-1">{integration.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
              <CheckCircle2 size={12} />
              Active
            </div>
          ) : integration.canConnect ? (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
            >
              <ExternalLink size={11} />
              Set up credentials
            </button>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <AlertCircle size={11} />
              In development
            </span>
          )}
        </div>
      </div>

      {modalOpen && (
        <ConnectModal
          integration={integration}
          isConnected={isConnected}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}

// ─── Upload Tab ───────────────────────────────────────────────────────────────

interface UploadResult {
  inserted: number
  skipped_duplicates: number
  failed: number
  errors?: string[]
}

function UploadTab() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_MB = 20

  const handleFile = (f: File) => { setFile(f); setResult(null); setError(null) }
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const onDragLeave = useCallback(() => setIsDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [])
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }
  const clearFile = () => {
    setFile(null); setResult(null); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_MB} MB.`); return }
    setUploading(true); setError(null); setResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post<UploadResult>('/leads/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          ?? 'Upload failed. Check the file format and try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Database size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">How it works</p>
          <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
            <li>Upload CSV, Excel (.xlsx / .xls), or PDF files</li>
            <li>New leads are automatically added to your database</li>
            <li>Duplicate leads (matched by email) are <strong>skipped</strong> — no double entries</li>
            <li>Existing leads keep all their existing data — only new fields are merged in</li>
          </ul>
        </div>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : file
              ? 'border-slate-200 bg-slate-50 cursor-default'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={onFileChange} className="hidden" />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            {file.name.endsWith('.pdf')
              ? <FileText size={18} className="text-red-400" />
              : <FileSpreadsheet size={18} className="text-emerald-500" />}
            <div className="text-left">
              <p className="text-sm font-medium text-slate-800 max-w-xs truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); clearFile() }} className="ml-2 p-1 rounded-full hover:bg-slate-200">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <CloudUpload size={28} className={isDragging ? 'text-blue-500' : 'text-slate-400'} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              {isDragging ? 'Drop your file here' : 'Drag & drop or click to browse'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-slate-400">
              {['CSV', 'XLSX', 'XLS', 'PDF'].map((ext) => (
                <span key={ext} className="px-2 py-0.5 bg-slate-100 rounded-full">{ext}</span>
              ))}
              <span className="text-slate-300">•</span>
              <span>Max {MAX_MB} MB</span>
            </div>
          </>
        )}
      </div>

      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Upload size={15} className={uploading ? 'animate-bounce' : ''} />
          {uploading ? 'Uploading & Processing...' : `Upload ${file.name}`}
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Import Complete</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="p-5 text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.inserted ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Users size={11} />New leads</p>
            </div>
            <div className="p-5 text-center">
              <p className="text-2xl font-bold text-amber-500">{result.skipped_duplicates ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Duplicates skipped</p>
            </div>
            <div className="p-5 text-center">
              <p className={`text-2xl font-bold ${(result.failed ?? 0) > 0 ? 'text-red-500' : 'text-slate-300'}`}>{result.failed ?? 0}</p>
              <p className="text-xs text-slate-500 mt-1">Failed rows</p>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="px-5 pb-4 space-y-1">
              {result.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">{e}</p>
              ))}
            </div>
          )}
          <div className="px-5 pb-4">
            <button onClick={clearFile} className="text-xs text-blue-600 hover:underline">Upload another file</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'platforms' | 'upload'
type FilterStatus = 'all' | 'connected' | 'available'

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('platforms')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const { data: statusMap = {} } = useIntegrationsStatus()

  const connectedCount = INTEGRATIONS.filter((i) => statusMap[i.id]?.connected).length

  const filtered = INTEGRATIONS.filter((i) => {
    if (filterStatus === 'connected') return statusMap[i.id]?.connected
    if (filterStatus === 'available') return !statusMap[i.id]?.connected && i.canConnect
    return true
  })

  // Group by category in a fixed order
  const grouped = CATEGORY_ORDER.reduce<Record<string, Integration[]>>((acc, cat) => {
    const items = filtered.filter((i) => i.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div>
      <Header title="Integrations" subtitle="Connect your tools and sync data" />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {([
          { id: 'platforms', icon: Plug, label: 'Connected Platforms' },
          { id: 'upload',    icon: CloudUpload, label: 'Upload CSV / File' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'platforms' && connectedCount > 0 && (
              <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                {connectedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'upload' ? (
        <UploadTab />
      ) : (
        <>
          {/* Summary + filter bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <strong className="text-slate-800">{connectedCount}</strong> connected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <strong className="text-slate-800">{INTEGRATIONS.filter((i) => i.canConnect && !statusMap[i.id]?.connected).length}</strong> available
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              {([
                { id: 'all',       label: 'All' },
                { id: 'connected', label: 'Connected' },
                { id: 'available', label: 'Available' },
              ] as { id: FilterStatus; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFilterStatus(id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterStatus === id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                {CATEGORY_LABELS[cat]}
                <span className="text-slate-300 font-normal">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    statusMap={statusMap}
                  />
                ))}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Plug size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No integrations match this filter.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
