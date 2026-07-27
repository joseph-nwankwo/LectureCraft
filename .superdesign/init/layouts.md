# Layout Components

## AppLayout
**File:** `frontend/src/layouts/AppLayout/AppLayout.tsx`
Top-level shell: Sidebar (desktop) + MobileNav (drawer) + TopNav (header) + scrollable main + Footer. Uses SidebarProvider + CommandPaletteProvider.

```tsx
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'

export default function AppLayout() {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileNav />
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <TopNav />
            <main id="main-content" className="flex-1 overflow-y-auto scrollbar-thin bg-muted/20" tabIndex={-1}>
              <Suspense fallback={<PageSuspense />}>
                <Outlet />
              </Suspense>
            </main>
            <Footer />
          </div>
        </div>
        <CommandPalette />
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
```

---

## Sidebar
**File:** `frontend/src/layouts/AppLayout/Sidebar.tsx`
Desktop left nav (hidden on mobile). Width: 240px expanded, 60px collapsed. Has logo, inline search, Favorites/Recent sections, sectioned nav, collapse toggle. Each nav item has hover-reveal favorite star. Active state: `bg-primary/10 text-primary`.

```tsx
export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  // ...search, favorites, recent state...

  return (
    <aside className={cn(
      'relative hidden lg:flex flex-col h-full border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out',
      collapsed ? 'w-[60px]' : 'w-[240px]'
    )}>
      {/* Logo */}
      <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'
      )}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Lightbulb className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="text-[15px] font-bold tracking-tight text-foreground truncate">LectureCraft</span>}
      </div>

      {/* Search (expanded only) */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search…"
              className="h-8 w-full rounded-lg border border-input bg-background/60 pl-8 pr-7 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <nav className="p-2 space-y-0.5">
          {/* Favorites section (when expanded + have favorites) */}
          {!collapsed && favoriteItems.length > 0 && (
            <div className="mb-2">
              <button className="flex w-full items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Star className="h-3 w-3" /> Favorites
              </button>
              {/* favorite items */}
            </div>
          )}

          {/* Recent pages */}
          {!collapsed && recentItems.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Recent
              </div>
              {/* recent items */}
            </div>
          )}

          {/* Main nav sections */}
          {filteredNav.map((section) => (
            <div key={section.id} className={cn(!collapsed && 'mb-3')}>
              {!collapsed && (
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={collapsed} active={isActive(item.href)} />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className={cn('shrink-0 border-t border-sidebar-border p-2', collapsed && 'flex justify-center')}>
        <button onClick={toggle} className="flex h-8 items-center rounded-lg text-muted-foreground hover:bg-muted/60">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
```

### SidebarItem
```tsx
function SidebarItem({ item, collapsed, active, onToggleFavorite, isFavorite }) {
  return (
    <NavLink to={item.href} className={cn(
      'group flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-sm font-medium transition-all duration-100',
      active ? 'bg-primary/10 text-primary dark:bg-primary/15'
             : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      collapsed && 'justify-center px-0 w-8 mx-auto'
    )}>
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && <span className={cn('shrink-0 rounded-full px-1.5 text-[10px] font-semibold leading-4', badgeColors[item.badgeColor])}>{item.badge}</span>}
          {item.shortcut && <kbd className="shrink-0 text-[9px] text-muted-foreground/60 hidden group-hover:inline">{item.shortcut}</kbd>}
          <button onClick={toggleFavorite} className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100">
            <Star className={cn('h-3 w-3', isFavorite ? 'fill-warning text-warning' : 'text-muted-foreground/60')} />
          </button>
        </>
      )}
    </NavLink>
  )
}
```

### Nav Sections (Desktop)
```
Main        → Dashboard (⌘D)
Teaching    → Courses (⌘C) | Lecture Notes | Teaching Assistant
AI Tools    → AI Studio [AI badge] (⌘A) | Question Generator | Assignment Generator | Exam Builder | Rubric Generator | AI Grading Assistant | AI Marking Assistant | Mark Sheet Generator | Plagiarism & AI Check | Course Outline | Presentation AI | Research Assistant
Content     → Document Library | Exports
Insights    → Analytics Dashboard | Teaching Analytics | Assessment Analytics | AI Insights | Reports | Scheduled Reports
System      → Settings (⌘,)
```

---

## TopNav
**File:** `frontend/src/layouts/AppLayout/TopNav.tsx`
Sticky header, h-14, `bg-background/95 backdrop-blur-sm`. Left: hamburger (mobile) + breadcrumbs. Right: date, search trigger (⌘K), Generate button (primary), Quick Create (+) dropdown, Notifications bell (badge), online indicator, profile avatar dropdown.

```tsx
export function TopNav() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 z-20">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={openMobile} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden">
          <Menu className="h-4.5 w-4.5" />
        </button>
        <Breadcrumbs />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Date */}
        <span className="hidden xl:block text-xs text-muted-foreground mr-1 tabular-nums">{today}</span>

        {/* Search trigger */}
        <button onClick={() => openPalette(true)}
          className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 text-xs text-muted-foreground hover:bg-muted">
          <span className="hidden md:block">Search anything…</span>
          <kbd className="rounded border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* Generate button */}
        <Button variant="primary" size="sm" leftIcon={<Sparkles />} className="hidden sm:flex">
          <span className="hidden md:block">Generate</span>
        </Button>

        {/* Quick Create dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-muted">
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            {/* New Course, Generate Lecture Note, Generate Questions, Create Assignment, Build Exam, AI Studio */}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
              {/* Badge: absolute -right-0.5 -top-0.5 h-4 w-4 bg-primary rounded-full text-[9px] */}
            </button>
          </DropdownMenuTrigger>
          {/* Notification panel w-80 */}
        </DropdownMenu>

        {/* Online indicator */}
        <span className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
        </span>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-muted">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          {/* Profile/Settings/Billing/API Keys/Appearance/Help/Sign out */}
        </DropdownMenu>
      </div>
    </header>
  )
}
```

---

## MobileNav
**File:** `frontend/src/layouts/AppLayout/MobileNav.tsx`
Slide-in drawer (w-72) for mobile. Same sections as sidebar. Logo + X close in header. Backdrop blur overlay.

```tsx
export function MobileNav() {
  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden',
        mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )} onClick={closeMobile} />

      <div className={cn('fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar border-r border-sidebar-border shadow-sidebar transition-transform duration-200 ease-in-out lg:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Lightbulb className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">LectureCraft</span>
          </div>
          <button onClick={closeMobile} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          {/* Same sections as Sidebar */}
        </ScrollArea>
      </div>
    </>
  )
}
```

---

## Footer
**File:** `frontend/src/layouts/AppLayout/Footer.tsx`
Slim footer row inside main column (below page content). `h-auto py-2`, border-top.

```tsx
export function Footer() {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-border bg-background/80 px-6 py-2 text-[11px] text-muted-foreground">
      <span>© {year} LectureCraft. All rights reserved.</span>
      <div className="flex items-center gap-3">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Support</a>
        <span className="text-muted-foreground/50">v1.0.0</span>
      </div>
    </footer>
  )
}
```
