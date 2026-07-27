# Shared UI Components

## Design System Components (`frontend/src/components/design-system/`)

### Button
**File:** `frontend/src/components/design-system/buttons/Button.tsx`
CVA-based button with variants + sizes + leftIcon/rightIcon + loading spinner.

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-md border border-transparent transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:shadow-hover active:scale-[0.98]',
        secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80',
        outline:   'bg-transparent text-foreground border-border hover:bg-muted',
        ghost:     'bg-transparent text-foreground border-transparent hover:bg-muted',
        danger:    'bg-error text-error-foreground border-error hover:bg-error/90',
        success:   'bg-success text-success-foreground border-success hover:bg-success/90',
        link:      'bg-transparent text-primary border-transparent underline-offset-4 hover:underline h-auto p-0',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-10 px-5 text-base rounded-md',
        xl: 'h-12 px-6 text-base rounded-lg',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  }
)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, size, fullWidth, loading, loadingText, leftIcon, rightIcon, children, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props}>
    {loading ? (
      <><Loader2 className="h-4 w-4 animate-spin" />{loadingText ?? children}</>
    ) : (
      <>{leftIcon && <span className="shrink-0">{leftIcon}</span>}{children}{rightIcon && <span className="shrink-0">{rightIcon}</span>}</>
    )}
  </button>
))
```

---

### StatCard
**File:** `frontend/src/components/design-system/cards/StatCard.tsx`
KPI card with icon, value, label, optional trend arrow.

```tsx
export function StatCard({ label, value, icon, trend, description, loading, color = 'default', onClick }) {
  return (
    <div className={cn(
      'relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card transition-all duration-150',
      onClick && 'cursor-pointer hover:shadow-hover hover:-translate-y-px',
      colorMap[color].border  // e.g. 'border-primary/20'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorMap[color].icon)}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        {trend && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColors[trendDir])}>
            <TrendIcon direction={trendDir} />
            <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
// colorMap: default=bg-muted, primary=bg-primary/10 text-primary border-primary/20, success=bg-success-muted text-success, warning, error
```

---

### StatsWidget
**File:** `frontend/src/components/design-system/widgets/StatsWidget.tsx`
Grid of StatCards (2, 3 or 4 columns).

```tsx
export function StatsWidget({ stats, columns = 4, title, action, className }) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn('grid gap-4', { 2:'grid-cols-1 sm:grid-cols-2', 3:'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4:'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }[columns])}>
        {stats.map((stat, i) => <StatCard key={stat.label + i} {...stat} />)}
      </div>
    </section>
  )
}
```

---

### QuickActions
**File:** `frontend/src/components/design-system/widgets/QuickActions.tsx`
Grid of action cards (cards/list/compact variant). Cards variant: rounded-xl border bg-card p-4, icon in colored circle, label + description.

```tsx
export function QuickActions({ actions, title, columns = 4, variant = 'cards', className }) {
  // cards variant:
  return (
    <section className="space-y-4">
      {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
      <div className={cn('grid gap-3', colClasses[columns])}>
        {actions.map((action) => (
          <button className={cn(
            'group flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-card',
            'hover:shadow-hover hover:-translate-y-px transition-all duration-150',
            colorMap[action.color].hover
          )}>
            <div className="flex items-start justify-between w-full gap-2">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[action.color].icon)}>
                {action.icon}
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
```

---

### DocumentCard
**File:** `frontend/src/components/design-system/cards/DocumentCard.tsx`
Card showing a document with type badge, title, tags, footer (course + date). Types: LECTURE_NOTE, QUESTION_SET, ASSIGNMENT, EXAM, RUBRIC, COURSE_OUTLINE, PRESENTATION, RESEARCH, OTHER.

```tsx
export function DocumentCard({ title, type, excerpt, courseName, updatedAt, tags = [], version, onView, onEdit, onExport, onDelete }) {
  const config = docTypeConfig[type]  // { label, icon, color, bg }
  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card transition-all duration-150 hover:shadow-hover hover:-translate-y-px">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bg, config.color)}>
            <config.icon className="h-4 w-4" />
          </div>
          <div>
            <Badge className={cn('text-[10px] px-1.5 h-4 mb-1', config.bg, config.color, 'border-0')}>{config.label}</Badge>
            <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
          </div>
        </div>
        {/* … 3-dot dropdown: View / Edit / Export / Delete */}
      </div>
      {excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{excerpt}</p>}
      {tags.length > 0 && <div className="flex flex-wrap gap-1">{tags.map(tag => <Badge key={tag} variant="outline" className="h-4 text-[10px]">{tag}</Badge>)}</div>}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">{courseName}</span>
        <time className="text-xs text-muted-foreground">{formatDate(updatedAt)}</time>
      </div>
    </div>
  )
}
```

---

### ActivityTimeline
**File:** `frontend/src/components/design-system/widgets/ActivityTimeline.tsx`
Vertical timeline of activity items with icon, title, and relative time.

---

### WelcomeBanner
**File:** `frontend/src/features/dashboard/components/WelcomeBanner.tsx`
Gradient hero banner at top of Dashboard.

```tsx
export function WelcomeBanner({ name }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-6 text-primary-foreground shadow-md">
      {/* BG decorations: 2 circles bg-white/5, 1 horizontal line bg-white/10 */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute left-1/2 top-0 h-px w-1/2 bg-white/10" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-primary-foreground/70 font-medium">{dayMsg}</p>
          <h1 className="text-2xl font-bold tracking-tight">Good morning, {firstName}!</h1>
          <p className="text-sm text-primary-foreground/80 max-w-md">
            Your AI-powered teaching assistant is ready. Generate academic content, manage courses, and accelerate your workflow.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 sm:items-end">
          <Button className="bg-white text-primary hover:bg-white/90 shadow-sm border-0 font-semibold"
            leftIcon={<Sparkles />} rightIcon={<ArrowRight />}>Open AI Studio</Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:bg-white/10">Create a Course</Button>
        </div>
      </div>
    </div>
  )
}
```

---

## shadcn/ui Primitives (`frontend/src/components/ui/`)

- `button.tsx` — shadcn Button (also uses CVA)
- `card.tsx` — Card, CardHeader, CardContent, CardFooter
- `badge.tsx` — Badge (default/secondary/outline/destructive variants)
- `input.tsx` — Input
- `label.tsx` — Label
- `select.tsx` — Select (Radix)
- `dialog.tsx` — Dialog, DialogContent, DialogHeader, DialogTitle
- `dropdown-menu.tsx` — DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub*
- `avatar.tsx` — Avatar, AvatarImage, AvatarFallback
- `tabs.tsx` — Tabs, TabsList, TabsTrigger, TabsContent
- `table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- `tooltip.tsx` — Tooltip, TooltipContent, TooltipTrigger
- `scroll-area.tsx` — ScrollArea
- `sheet.tsx` — Sheet (slide-in panel)
- `skeleton.tsx` — Skeleton
- `separator.tsx` — Separator
- `checkbox.tsx` — Checkbox
- `textarea.tsx` — Textarea
- `progress.tsx` — Progress
- `switch.tsx` — Switch
- `popover.tsx` — Popover
- `command.tsx` — Command (cmdk)
- `slider.tsx` — Slider
