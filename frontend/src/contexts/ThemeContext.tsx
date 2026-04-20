import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
})

export function useTheme() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'alainza-theme'
const LEGACY_KEY = 'theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(): Theme {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  // Back-compat: migrate from older 'theme' key on first read.
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
    localStorage.setItem(STORAGE_KEY, legacy)
    return legacy as Theme
  }
  // Default: dark.
  return 'dark'
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved: 'light' | 'dark' =
    theme === 'system' ? getSystemTheme() : theme

  const root = document.documentElement
  root.setAttribute('data-theme', resolved)

  // Keep `.dark` class in sync for legacy Tailwind `dark:` utilities.
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')

  return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    applyTheme(readStoredTheme()),
  )

  useEffect(() => {
    const resolved = applyTheme(theme)
    setResolvedTheme(resolved)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setResolvedTheme(applyTheme('system'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
