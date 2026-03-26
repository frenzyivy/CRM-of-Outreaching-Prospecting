import { RefreshCw, Sun, Moon, Search } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import NotificationBell from './NotificationBell'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const queryClient = useQueryClient()
  const [spinning, setSpinning] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  const handleRefresh = () => {
    setSpinning(true)
    queryClient.invalidateQueries()
    setTimeout(() => setSpinning(false), 1000)
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        {action}
        {/* Ctrl+K search hint */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Search size={13} />
          <span className="text-xs">Search</span>
          <kbd className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">⌘K</kbd>
        </button>
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors shadow-sm"
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={spinning ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  )
}
