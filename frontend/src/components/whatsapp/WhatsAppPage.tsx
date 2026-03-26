import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Settings, ArrowRight, Users, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../layout/Header'
import api from '../../api/client'

interface WhatsAppAnalytics {
  configured: boolean
  total_sent: number
  total_received: number
  conversations: number
}

interface WhatsAppMessage {
  id: string
  lead_id: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  content: string
  status: string
  wa_message_id: string
  created_at: string
}

export default function WhatsAppPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const { data: analytics } = useQuery<WhatsAppAnalytics>({
    queryKey: ['whatsapp-analytics'],
    queryFn: async () => (await api.get('/whatsapp/analytics')).data,
  })

  const sendMessage = useMutation({
    mutationFn: async () => {
      await api.post('/whatsapp/send', { to_phone: phone, message })
    },
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-analytics'] })
    },
  })

  const configured = analytics?.configured ?? false

  return (
    <div>
      <Header title="WhatsApp" subtitle="WhatsApp Business messaging & analytics" />

      {!configured ? (
        /* Not configured state */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Connect WhatsApp Business API
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Set up your Meta WhatsApp Business API credentials to start sending messages,
            receiving replies, and tracking conversation analytics.
          </p>
          <button
            onClick={() => navigate('/integrations')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <Settings size={14} />
            Configure in Integrations
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Analytics cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Messages Sent" value={analytics?.total_sent ?? 0} icon={Send} color="text-green-500 bg-green-50 dark:bg-green-900/30" />
            <StatCard label="Messages Received" value={analytics?.total_received ?? 0} icon={MessageCircle} color="text-blue-500 bg-blue-50 dark:bg-blue-900/30" />
            <StatCard label="Conversations" value={analytics?.conversations ?? 0} icon={Users} color="text-violet-500 bg-violet-50 dark:bg-violet-900/30" />
            <StatCard label="Delivered" value={analytics?.total_sent ?? 0} icon={CheckCheck} color="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" />
          </div>

          {/* Send message section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Send Message</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number (international format)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 2671"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Free-form messages only work within 24h conversation window. Use templates for cold outreach.
                </p>
                <button
                  onClick={() => sendMessage.mutate()}
                  disabled={!phone || !message || sendMessage.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                  {sendMessage.isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
              {sendMessage.isSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">Message sent successfully!</p>
              )}
              {sendMessage.isError && (
                <p className="text-xs text-red-500">Failed to send. Check your WhatsApp API configuration.</p>
              )}
            </div>
          </div>

          {/* Info about templates */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">WhatsApp Templates</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              For initial outreach, you need approved WhatsApp message templates. Create and manage templates
              in the Meta Business Manager.
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-500">
              <ArrowRight size={12} />
              <span>Template management coming soon</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Send; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}
