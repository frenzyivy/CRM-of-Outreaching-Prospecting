import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from '../common/CommandPalette'

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((v) => !v)} />
      <main
        className={`flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-h-screen transition-[margin] duration-200 ease-in-out ${
          sidebarExpanded ? 'ml-[200px]' : 'ml-[60px]'
        }`}
      >
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
