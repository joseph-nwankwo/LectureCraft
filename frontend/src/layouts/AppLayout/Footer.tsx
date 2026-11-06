import { cn } from '@/lib/utils'

export function Footer({ className }: { className?: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className={cn('flex shrink-0 flex-col gap-1 border-t border-border bg-card px-4 py-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6', className)}>
      <span>© {year} LectureSuite. All rights reserved.</span>
      <div className="flex items-center gap-3">
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        <a href="#" className="hover:text-foreground transition-colors">Support</a>
        <span className="text-muted-foreground/50">v1.0.0</span>
      </div>
    </footer>
  )
}
