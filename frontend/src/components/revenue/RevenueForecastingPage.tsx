import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign, Wrench, Cpu, TrendingUp, TrendingDown,
  Plus, Trash2,
} from 'lucide-react'
import Header from '../layout/Header'
import api from '../../api/client'

interface Expense {
  id: string
  category: string
  name: string
  amount: number
  period: string
  created_at: string
}

interface RevenueSummary {
  revenue_generated: number
  total_spent: number
  tool_spend: number
  api_spend: number
  other_spend: number
  roi: number
  profit_loss: number
  expenses: Expense[]
}

const categoryConfig: Record<string, { icon: typeof Wrench; color: string; label: string }> = {
  tool: { icon: Wrench, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30', label: 'Tool' },
  api: { icon: Cpu, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30', label: 'API' },
  salary: { icon: DollarSign, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', label: 'Salary' },
  other: { icon: DollarSign, color: 'text-slate-500 bg-slate-50 dark:bg-slate-700', label: 'Other' },
}

export default function RevenueForecastingPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'tool', amount: '', period: 'monthly' })

  const { data, isLoading } = useQuery<RevenueSummary>({
    queryKey: ['revenue-summary'],
    queryFn: async () => (await api.get('/revenue/summary')).data,
  })

  const addExpense = useMutation({
    mutationFn: async () => {
      await api.post('/revenue/expenses', {
        name: form.name,
        category: form.category,
        amount: parseFloat(form.amount),
        period: form.period,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      setShowAdd(false)
      setForm({ name: '', category: 'tool', amount: '', period: 'monthly' })
    },
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/revenue/expenses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
    },
  })

  if (isLoading) {
    return (
      <div>
        <Header title="Revenue Forecasting" subtitle="Revenue, expenses, and ROI tracking" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const summary = data ?? {
    revenue_generated: 0, total_spent: 0, tool_spend: 0, api_spend: 0,
    other_spend: 0, roi: 0, profit_loss: 0, expenses: [],
  }

  const profitPositive = summary.profit_loss >= 0

  return (
    <div>
      <Header title="Revenue Forecasting" subtitle="Revenue, expenses, and ROI tracking" />

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Revenue Total" value={`$${summary.revenue_generated.toLocaleString()}`} icon={DollarSign} color="bg-emerald-500" />
        <KpiCard label="Spent on Tools" value={`$${summary.tool_spend.toLocaleString()}`} icon={Wrench} color="bg-violet-500" />
        <KpiCard label="Spent on API" value={`$${summary.api_spend.toLocaleString()}`} icon={Cpu} color="bg-blue-500" />
        <KpiCard label="ROI" value={summary.roi > 0 ? `${summary.roi.toFixed(1)}%` : '—'} icon={TrendingUp} color="bg-cyan-500" />
        <KpiCard
          label="Profit / Loss"
          value={`${profitPositive ? '+' : ''}$${summary.profit_loss.toLocaleString()}`}
          icon={profitPositive ? TrendingUp : TrendingDown}
          color={profitPositive ? 'bg-emerald-500' : 'bg-red-500'}
        />
      </div>

      {/* ─── Expenses Table ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Expenses</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus size={13} />
            Add Expense
          </button>
        </div>

        {/* Add expense form */}
        {showAdd && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                placeholder="Name (e.g. Instantly.ai)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="tool">Tool</option>
                <option value="api">API</option>
                <option value="salary">Salary</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                placeholder="Amount ($)"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addExpense.mutate()}
                disabled={!form.name || !form.amount}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Expenses list */}
        {summary.expenses.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
            No expenses tracked yet. Add your first expense to start forecasting.
          </p>
        ) : (
          <div className="space-y-1.5">
            {summary.expenses.map((exp) => {
              const config = categoryConfig[exp.category] ?? categoryConfig.other
              const Icon = config.icon
              return (
                <div key={exp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <div className={`p-1.5 rounded-md ${config.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{exp.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{exp.period}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">${exp.amount.toLocaleString()}</span>
                  <button
                    onClick={() => deleteExpense.mutate(exp.id)}
                    className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof DollarSign; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
      <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
  )
}
