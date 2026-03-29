import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IndianRupee, Wrench, Cpu, TrendingUp, TrendingDown,
  Plus, Trash2, Pencil, Calendar,
} from 'lucide-react'
import Header from '../layout/Header'
import api from '../../api/client'

interface Expense {
  id: string
  category: string
  name: string
  base_amount: number
  tax: number
  commission: number
  total_inr: number
  original_usd: number | null
  payment_date: string | null
  amount?: number
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
  salary: { icon: IndianRupee, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30', label: 'Salary' },
  other: { icon: IndianRupee, color: 'text-slate-500 bg-slate-50 dark:bg-slate-700', label: 'Other' },
}

const inr = (v: number) => `₹${v.toLocaleString('en-IN')}`

const inputClass = 'px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20'
const selectClass = 'px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none'

const emptyForm = {
  name: '',
  category: 'tool',
  base_amount: '',
  tax: '',
  commission: '',
  original_usd: '',
  payment_date: '',
  period: 'monthly',
}

export default function RevenueForecastingPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery<RevenueSummary>({
    queryKey: ['revenue-summary'],
    queryFn: async () => (await api.get('/revenue/summary')).data,
  })

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowAdd(false)
    setError('')
  }

  const addExpense = useMutation({
    mutationFn: async () => {
      await api.post('/revenue/expenses', {
        name: form.name,
        category: form.category,
        base_amount: parseFloat(form.base_amount),
        tax: parseFloat(form.tax) || 0,
        commission: parseFloat(form.commission) || 0,
        original_usd: form.original_usd ? parseFloat(form.original_usd) : null,
        payment_date: form.payment_date,
        period: form.period,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      resetForm()
    },
    onError: (err: any) => {
      const d = err?.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map((e: any) => e.msg).join(', ') : err?.message || 'Failed to save expense')
    },
  })

  const updateExpense = useMutation({
    mutationFn: async () => {
      await api.put(`/revenue/expenses/${editingId}`, {
        name: form.name,
        category: form.category,
        base_amount: parseFloat(form.base_amount),
        tax: parseFloat(form.tax) || 0,
        commission: parseFloat(form.commission) || 0,
        original_usd: form.original_usd ? parseFloat(form.original_usd) : null,
        payment_date: form.payment_date || undefined,
        period: form.period,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      resetForm()
    },
    onError: (err: any) => {
      const d = err?.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map((e: any) => e.msg).join(', ') : err?.message || 'Failed to update expense')
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

  const startEdit = (exp: Expense) => {
    setForm({
      name: exp.name,
      category: exp.category,
      base_amount: String(exp.base_amount ?? exp.amount ?? 0),
      tax: String(exp.tax ?? 0),
      commission: String(exp.commission ?? 0),
      original_usd: exp.original_usd ? String(exp.original_usd) : '',
      payment_date: exp.payment_date ?? '',
      period: exp.period,
    })
    setEditingId(exp.id)
    setShowAdd(true)
    setError('')
  }

  const handleSave = () => {
    setError('')
    if (editingId) {
      updateExpense.mutate()
    } else {
      addExpense.mutate()
    }
  }

  const isSaving = addExpense.isPending || updateExpense.isPending
  const computedTotal = (parseFloat(form.base_amount) || 0) + (parseFloat(form.tax) || 0) + (parseFloat(form.commission) || 0)

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
        <KpiCard label="Revenue Total" value={inr(summary.revenue_generated)} icon={IndianRupee} color="bg-emerald-500" />
        <KpiCard label="Spent on Tools" value={inr(summary.tool_spend)} icon={Wrench} color="bg-violet-500" />
        <KpiCard label="Spent on API" value={inr(summary.api_spend)} icon={Cpu} color="bg-blue-500" />
        <KpiCard label="ROI" value={summary.roi > 0 ? `${summary.roi.toFixed(1)}%` : '—'} icon={TrendingUp} color="bg-cyan-500" />
        <KpiCard
          label="Profit / Loss"
          value={`${profitPositive ? '+' : ''}${inr(summary.profit_loss)}`}
          icon={profitPositive ? TrendingUp : TrendingDown}
          color={profitPositive ? 'bg-emerald-500' : 'bg-red-500'}
        />
      </div>

      {/* ─── Expenses Table ─── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Expenses</h3>
          <button
            onClick={() => { resetForm(); setShowAdd(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus size={13} />
            Add Expense
          </button>
        </div>

        {/* Add / Edit expense form */}
        {showAdd && (
          <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {editingId ? 'Edit Expense' : 'New Expense'}
            </h4>

            {/* Row 1: Name, Category, Period */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Expense Name</label>
                <input
                  type="text"
                  placeholder="e.g. Claude API, Instantly.ai"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={`w-full ${selectClass}`}
                >
                  <option value="tool">Tool</option>
                  <option value="api">API</option>
                  <option value="salary">Salary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Billing Cycle</label>
                <select
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  className={`w-full ${selectClass}`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
            </div>

            {/* Row 2: INR breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Base Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.base_amount}
                  onChange={(e) => setForm({ ...form, base_amount: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Tax / GST (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.tax}
                  onChange={(e) => setForm({ ...form, tax: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Bank Commission / Fees (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.commission}
                  onChange={(e) => setForm({ ...form, commission: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
            </div>

            {/* Row 3: Payment date, Original USD, Total preview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Price in USD (optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 17"
                  value={form.original_usd}
                  onChange={(e) => setForm({ ...form, original_usd: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Total Billed (₹)</label>
                <div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-600/50 rounded-lg h-[38px]">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{inr(computedTotal)}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!form.name || !form.base_amount || !form.payment_date || isSaving}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isSaving
                  ? (editingId ? 'Updating...' : 'Saving...')
                  : (editingId ? 'Update' : 'Save')
                }
              </button>
              <button
                onClick={resetForm}
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
              const total = exp.total_inr ?? exp.amount ?? 0
              return (
                <div key={exp.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                  <div className={`p-1.5 rounded-md ${config.color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{exp.name}</span>
                    <span className="text-xs text-slate-400 ml-2">{exp.period}</span>
                    {exp.payment_date && (
                      <span className="text-xs text-slate-400 ml-2">
                        <Calendar size={10} className="inline mr-0.5 -mt-0.5" />
                        {exp.payment_date}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{inr(total)}</span>
                    {exp.original_usd != null && exp.original_usd > 0 && (
                      <span className="text-[10px] text-slate-400 block">${exp.original_usd}</span>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(exp)}
                    className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Pencil size={14} />
                  </button>
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

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof IndianRupee; color: string }) {
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
