import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/app/providers/AuthProvider'
import { useSidebar } from '@/contexts/SidebarContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getNavigationForRole } from './navigation'

export function MobileNav() {
  const { user } = useAuth()
  const { mobileOpen, openMobile, closeMobile } = useSidebar()
  const location = useLocation()
  const navigation = getNavigationForRole(user?.roleSlug)

  useEffect(() => {
    closeMobile()
  }, [location.pathname, closeMobile])

  return (
    <Sheet open={mobileOpen} onOpenChange={(open) => (open ? openMobile() : closeMobile())}>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground [&>button]:hover:bg-sidebar-accent">
        <SheetHeader className="sr-only">
          <SheetTitle>LectureSuite navigation</SheetTitle>
        </SheetHeader>

        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
            <div className="leading-none">
              <div className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">
                Lecture<span className="text-sidebar-primary">Suite</span>
              </div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-brand-gold">
                UAMSATECH · CRAFT SUITE
              </div>
            </div>
            <span className="sr-only">Mobile navigation drawer</span>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <nav className="space-y-0.5 p-3" aria-label="Mobile navigation">
              {navigation.map((section) => (
                <div key={section.id} className="mb-4">
                  <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                    return (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'mb-1 flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                          active ? 'bg-sidebar-primary/15 text-sidebar-primary' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60')} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge && <span className="rounded-full bg-sidebar-primary px-1.5 text-[10px] font-semibold text-sidebar-primary-foreground">{item.badge}</span>}
                      </NavLink>
                    )
                  })}
                </div>
              ))}
            </nav>
          </ScrollArea>

          <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
            <span>LectureSuite</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
