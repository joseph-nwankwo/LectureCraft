import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronsLeft, ChevronRight, Clock, Search, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/app/providers/AuthProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getNavigationForRole, type NavItem } from './navigation'

const RECENT_STORAGE_KEY = 'lc-recent-pages'
const FAVORITES_STORAGE_KEY = 'lc-favorites'
const MAX_RECENT = 5

function loadJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

const badgeColors = {
  primary: 'bg-sidebar-primary text-sidebar-primary-foreground',
  success: 'bg-success text-white',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-error text-error-foreground',
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { user } = useAuth()
  const location = useLocation()
  const navigation = getNavigationForRole(user?.roleSlug)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => loadJson(FAVORITES_STORAGE_KEY, []))
  const [recent, setRecent] = useState<string[]>(() => loadJson(RECENT_STORAGE_KEY, []))
  const [showFavorites, setShowFavorites] = useState(false)

  useEffect(() => {
    const current = location.pathname
    setRecent((prev) => {
      const next = [current, ...prev.filter((page) => page !== current)].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [location.pathname])

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((favorite) => favorite !== id) : [...prev, id]
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const allItems = navigation.flatMap((section) => section.items)
  const filteredNavigation = search
    ? [{ id: 'search', title: 'Results', items: allItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())) }]
    : navigation
  const favoriteItems = allItems.filter((item) => favorites.includes(item.id))
  const recentItems = recent
    .map((href) => allItems.find((item) => item.href === href))
    .filter(Boolean) as NavItem[]

  function isActive(href: string) {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <aside
      data-sidebar
      className={cn(
        'relative hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sidebar transition-[width] duration-200 ease-in-out lg:flex',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-0' : 'px-4')}>
        {collapsed ? (
          <span className="font-display text-lg font-bold text-sidebar-foreground" aria-label="LectureSuite">L<span className="text-sidebar-primary">S</span></span>
        ) : (
          <div className="leading-none">
            <div className="font-display text-[19px] font-bold tracking-tight text-sidebar-foreground">
              Lecture<span className="text-sidebar-primary">Suite</span>
            </div>
            <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-brand-gold">
              UAMSATECH · CRAFT SUITE
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="shrink-0 px-3 pb-1 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/50" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search navigation"
              className="h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent pl-8 pr-7 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
              aria-label="Search navigation"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/60 hover:text-sidebar-foreground" aria-label="Clear navigation search">
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-0.5 p-2" aria-label="Main navigation">
          {!collapsed && !search && favoriteItems.length > 0 && (
            <div className="mb-2">
              <button type="button" onClick={() => setShowFavorites((value) => !value)} className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <Star className="h-3 w-3" aria-hidden />
                Favorites
              </button>
              {showFavorites && favoriteItems.map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={false} active={isActive(item.href)} onToggleFavorite={toggleFavorite} isFavorite />
              ))}
            </div>
          )}

          {!collapsed && !search && recentItems.length > 0 && (
            <div className="mb-2">
              <div className="flex h-7 items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                <Clock className="h-3 w-3" aria-hidden />
                Recent
              </div>
              {recentItems.slice(0, 3).map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={false} active={isActive(item.href)} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(item.id)} recent />
              ))}
            </div>
          )}

          {filteredNavigation.map((section) => (
            <div key={section.id} className={cn(!collapsed && 'mb-3')}>
              {!collapsed && <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">{section.title}</div>}
              {section.items.map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={collapsed} active={isActive(item.href)} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(item.id)} />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className={cn('shrink-0 border-t border-sidebar-border p-2', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={toggle}
          className={cn('flex h-9 items-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring', collapsed ? 'w-9 justify-center' : 'w-full gap-2 px-2')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <><ChevronsLeft className="h-4 w-4" aria-hidden /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  item: NavItem
  collapsed: boolean
  active: boolean
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
  recent?: boolean
}

function SidebarItem({ item, collapsed, active, onToggleFavorite, isFavorite, recent }: SidebarItemProps) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-w-0 items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        active ? 'bg-sidebar-primary/15 font-medium text-sidebar-primary' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'h-9 w-9 justify-center px-0',
        recent && !active && 'opacity-85'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground')} aria-hidden />
      {!collapsed && (
        <span className="min-w-0 flex-1 truncate text-[13px] leading-tight">
          {item.label}
          {item.badge !== undefined && <span className={cn('ml-2 inline-flex rounded-full px-1.5 py-0 text-[9px] font-semibold leading-4', badgeColors[item.badgeColor ?? 'primary'])}>{item.badge}</span>}
        </span>
      )}
      {!collapsed && item.shortcut && <kbd className="hidden shrink-0 font-mono text-[9px] text-sidebar-foreground/45 group-hover:inline">{item.shortcut}</kbd>}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center py-0.5">{link}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
          {item.label}
          {item.shortcut && <kbd className="font-mono text-[10px] text-muted-foreground">{item.shortcut}</kbd>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="group/item flex items-center gap-0.5 py-0.5">
      <div className="min-w-0 flex-1">{link}</div>
      <button
        type="button"
        onClick={() => onToggleFavorite(item.id)}
        className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/35 opacity-0 transition-opacity hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/item:opacity-100', isFavorite && 'opacity-100 text-brand-gold')}
        aria-label={isFavorite ? `Remove ${item.label} from favorites` : `Add ${item.label} to favorites`}
      >
        <Star className={cn('h-3 w-3', isFavorite && 'fill-current')} aria-hidden />
      </button>
    </div>
  )
}
