import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Gift, Sparkles, Bell, HelpCircle, Globe,
  Settings, LogOut, ChevronRight, Sun, Moon, Monitor,
} from 'lucide-react'
import { useTheme, type Theme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import NotificationsPanel from '../profile/NotificationsPanel'
import WhatsNewModal from '../profile/WhatsNewModal'
import InviteModal from '../profile/InviteModal'
import HelpCenterModal from '../profile/HelpCenterModal'
import LanguageModal from '../profile/LanguageModal'
import SettingsModal from '../profile/SettingsModal'
import LogoutModal from '../profile/LogoutModal'

type Modal = 'notifications' | 'whatsNew' | 'invite' | 'help' | 'language' | 'settings' | 'logout' | null

export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<Modal>(null)
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null)

  const updatePosition = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ bottom: rect.bottom, left: rect.right + 12 })
    }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Also check if click is inside the portal dropdown
        const portal = document.getElementById('profile-dropdown')
        if (portal && portal.contains(e.target as Node)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) updatePosition()
  }, [open, updatePosition])

  const userEmail = user?.email ?? ''
  const userName = user?.user_metadata?.full_name ?? userEmail.split('@')[0] ?? 'User'
  const userInitials = userName.charAt(0).toUpperCase()

  const openModal = (modal: Modal) => {
    setOpen(false)
    setActiveModal(modal)
  }

  const closeModal = () => setActiveModal(null)

  const handleLogoutConfirm = async () => {
    closeModal()
    await signOut()
  }

  const menuItems = [
    { icon: Gift, label: 'Invite a Friend & Earn', modal: 'invite' as Modal },
    { icon: Sparkles, label: "See what's new", modal: 'whatsNew' as Modal },
    { icon: Bell, label: 'Notifications', modal: 'notifications' as Modal, hasArrow: true },
    { icon: HelpCircle, label: 'Help Center', modal: 'help' as Modal, hasArrow: true },
    { icon: Globe, label: 'Language', modal: 'language' as Modal, hasArrow: true },
  ]

  const themeOptions: { key: Theme; label: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'system', label: 'System', Icon: Monitor },
  ]

  return (
    <>
      <div ref={ref} className="relative">
        {/* Profile Avatar Button - icon only for narrow sidebar */}
        <button
          ref={btnRef}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors group relative"
          aria-label="Open profile menu"
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {userInitials}
          </div>
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-700 shadow-lg">
            {userName}
          </span>
        </button>
      </div>

      {/* Dropdown - rendered via portal to escape sidebar overflow-hidden */}
      {open && pos && createPortal(
        <div
          id="profile-dropdown"
          style={{ position: 'fixed', bottom: window.innerHeight - pos.bottom, left: pos.left }}
          className="w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100]"
        >
          {/* Profile Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-base font-bold text-white shrink-0">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {menuItems.map(({ icon: Icon, label, modal, hasArrow }) => (
              <button
                key={label}
                onClick={() => openModal(modal)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Icon size={16} className="text-slate-400 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {hasArrow && <ChevronRight size={14} className="text-slate-400" />}
              </button>
            ))}
          </div>

          {/* Theme Switcher */}
          <div className="px-4 py-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">Theme</p>
            <div className="flex rounded-lg overflow-hidden border border-slate-200">
              {themeOptions.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                    theme === key
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="py-1 border-t border-slate-100">
            <button
              onClick={() => openModal('settings')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings size={16} className="text-slate-400" />
              Settings
            </button>
            <button
              onClick={() => openModal('logout')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} className="text-red-400" />
              Logout
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modals */}
      {activeModal === 'notifications' && <NotificationsPanel onClose={closeModal} />}
      {activeModal === 'whatsNew' && <WhatsNewModal onClose={closeModal} />}
      {activeModal === 'invite' && <InviteModal onClose={closeModal} />}
      {activeModal === 'help' && <HelpCenterModal onClose={closeModal} />}
      {activeModal === 'language' && <LanguageModal onClose={closeModal} />}
      {activeModal === 'settings' && <SettingsModal onClose={closeModal} />}
      {activeModal === 'logout' && (
        <LogoutModal onClose={closeModal} onConfirm={handleLogoutConfirm} />
      )}
    </>
  )
}
