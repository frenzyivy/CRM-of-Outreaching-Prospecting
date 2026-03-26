import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from '../common/CommandPalette'

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-[60px] overflow-y-auto bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
