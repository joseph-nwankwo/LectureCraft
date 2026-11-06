import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  mobileOpen: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
  openMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'lc-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const setCollapsed = useCallback((v: boolean) => setCollapsedState(v), [])
  const toggle = useCallback(() => setCollapsedState((c) => !c), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const value = useMemo(
    () => ({ collapsed, mobileOpen, toggle, setCollapsed, openMobile, closeMobile }),
    [collapsed, mobileOpen, toggle, setCollapsed, openMobile, closeMobile]
  )

  return (
    <SidebarContext value={value}>
      {children}
    </SidebarContext>
  )
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
