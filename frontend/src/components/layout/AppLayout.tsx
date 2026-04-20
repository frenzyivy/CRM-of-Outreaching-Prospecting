import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from '../common/CommandPalette'
import { RealtimeSyncProvider } from '../../contexts/RealtimeSyncContext'

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <RealtimeSyncProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((v) => !v)} />
        <main
          className={`flex-1 overflow-y-auto min-h-screen transition-[margin] duration-200 ease-in-out ${
            sidebarExpanded ? 'ml-[220px]' : 'ml-[60px]'
          }`}
          style={{ background: 'var(--bg)' }}
        >
          <Outlet />
        </main>
        <CommandPalette />
      </div>
    </RealtimeSyncProvider>
  )
}
