import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { SkeletonPage } from '@/components/design-system/feedback/Skeleton'

function PageSuspense() {
  return (
    <div className="mx-auto w-full max-w-[1536px] p-4 sm:p-6">
      <SkeletonPage />
    </div>
  )
}

export default function AppLayout() {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Sidebar — full height, extends to top */}
          <Sidebar />

          {/* Mobile Navigation Drawer */}
          <MobileNav />

          {/* Right column: top nav + scrollable content */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <TopNav />

            <main
              id="main-content"
              className="flex-1 overflow-y-auto scrollbar-thin bg-background"
              tabIndex={-1}
            >
              <Suspense fallback={<PageSuspense />}>
                <Outlet />
              </Suspense>
            </main>

            <Footer />
          </div>
        </div>

        {/* Global overlays */}
        <CommandPalette />
      </SidebarProvider>
    </CommandPaletteProvider>
  )
}
