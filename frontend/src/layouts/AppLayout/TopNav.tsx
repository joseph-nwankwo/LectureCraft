import {
  Bell, Plus, ChevronDown, Menu, User, Settings, LogOut,
  CreditCard, Key, Monitor, Moon, Sun, HelpCircle, ExternalLink,
  PanelLeftClose, PanelLeftOpen, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { useSidebar } from '@/contexts/SidebarContext'
import { useCommandPalette } from '@/contexts/CommandPaletteContext'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'

function useGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function TopNav() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { collapsed, toggle, openMobile } = useSidebar()
  const { setOpen: openPalette } = useCommandPalette()
  const navigate = useNavigate()
  const greeting = useGreeting()

  const unreadCount = 3
  const isOnline = navigator.onLine

  const initials = user
    ? ((user as unknown as { name?: string }).name ?? user.email ?? '')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 shadow-nav backdrop-blur-sm sm:px-5"
      style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* Left: shell controls and mobile brand */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={openMobile}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <span className="font-display whitespace-nowrap text-lg font-bold leading-none tracking-tight text-brand-navy lg:hidden">
          Lecture<span className="text-brand-gold">Suite</span>
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 ml-auto">

        {/* Command palette search — desktop */}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="hidden h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-text-placeholder transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:flex"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
          aria-label="Open command palette"
        >
          Search anything…
          <kbd className="rounded border border-border bg-background px-1 text-[10px] text-text-tertiary" style={{ fontFamily: 'inherit' }}>
            ⌘K
          </kbd>
        </button>

        {/* AI Generate */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.AI_STUDIO)}
          className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-md border-none px-3.5 text-xs font-bold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring sm:flex"
          style={{ background: 'var(--brand-gold)', color: 'var(--brand-navy)', fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          <Sparkles size={13} />
          <span className="hidden md:block">Generate</span>
        </button>

        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Quick create"
            >
              <Plus size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.COURSES + '/new')}>New Course</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.LECTURE_NOTES + '/generate')}>Generate Lecture Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.QUESTION_GENERATOR)}>Generate Questions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.ASSIGNMENT_GENERATOR)}>Create Assignment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.EXAM_BUILDER)}>Build Exam</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.AI_STUDIO)}>AI Studio</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${unreadCount} notifications`}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: 'var(--brand-gold)', color: 'var(--brand-navy)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <button type="button" className="text-xs text-primary hover:underline">Mark all read</button>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {[
                { id: '1', title: 'AI Generation Complete', desc: 'Your lecture note for CS 101 is ready.', time: '2m ago', unread: true },
                { id: '2', title: 'Export Finished', desc: 'Assignment PDF downloaded successfully.', time: '15m ago', unread: true },
                { id: '3', title: 'New Course Created', desc: 'Introduction to Data Science added.', time: '1h ago', unread: true },
              ].map((n) => (
                <div key={n.id} className={cn('flex gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer', n.unread && 'bg-primary/5')}>
                  <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'bg-transparent')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-2">
              <button type="button" className="w-full rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Online indicator */}
        <span className="hidden lg:flex items-center gap-1 text-[10px] text-text-tertiary" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: isOnline ? 'var(--success)' : 'var(--error)' }} />
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-1.5 py-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={(user as unknown as { avatarUrl?: string })?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[11px] font-bold"
                  style={{ background: 'oklch(from var(--brand-gold) l c h / 0.15)', color: 'var(--brand-navy)' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown size={12} className="hidden sm:block text-text-tertiary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{greeting}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <User className="mr-2 h-4 w-4" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Settings className="mr-2 h-4 w-4" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <CreditCard className="mr-2 h-4 w-4" />Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Key className="mr-2 h-4 w-4" />API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : theme === 'light' ? <Sun className="mr-2 h-4 w-4" /> : <Monitor className="mr-2 h-4 w-4" />}
                Appearance
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'text-primary font-medium' : ''}>
                  <Sun className="mr-2 h-4 w-4" />Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'text-primary font-medium' : ''}>
                  <Moon className="mr-2 h-4 w-4" />Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'text-primary font-medium' : ''}>
                  <Monitor className="mr-2 h-4 w-4" />System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />Help & Support
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-error focus:text-error focus:bg-error-muted">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
