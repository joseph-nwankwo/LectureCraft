# LectureCraft Design System

## Product Context
LectureCraft is an AI-powered academic content platform for university/polytechnic/college educators in the UAMSATech suite. Key features: AI content generation (lecture notes, exams, assignments, rubrics), course management, analytics, document library, plagiarism detection. Target users: Nigerian/African university lecturers.

## Visual Brand
- **Brand name:** LectureCraft by UAMSATech
- **Logo mark:** Lightbulb icon (lucide `Lightbulb`) in a small rounded square `bg-primary`
- **Feel:** Professional, clean, academic, productivity-focused
- **Tone:** Calm, trustworthy, intelligent — not flashy or playful

## Color Palette

### Primary
- Blue-Grey `#334E68` (light mode) / `#829AB1` (dark mode)
- Use: buttons, active nav items, links, badges, brand accents
- oklch: `oklch(0.440 0.058 225)` / `oklch(0.718 0.044 225)`

### Backgrounds (light mode)
- Page: `#FFFFFF` (pure white)
- Sidebar: off-white `oklch(0.965 0.006 248)` (~#F3F6F9)
- Card: `#FFFFFF`
- Muted: `oklch(0.972 0.004 248)` (~#F8FAFC)
- Surface-1/2/3: subtle layering `oklch(0.978…0.948 …)`

### Backgrounds (dark mode)
- Page: `oklch(0.185 0.040 225)` (~#1B2432)
- Sidebar: `oklch(0.208 0.042 225)` (slightly lighter than page)
- Card: `oklch(0.235 0.046 225)`

### Text
- Foreground: `#1F2937` (gray-800) / `#F1F5F9` (dark)
- Muted: `#6B7280` (gray-500) / `oklch(0.760 0.028 248)` (dark)

### Status
- Success: Emerald-600 `oklch(0.527 0.154 155.0)` — with `-muted` bg tint
- Warning: Amber-500 `oklch(0.769 0.188 70.08)` — with `-muted` bg tint
- Error: Red-600 `oklch(0.577 0.245 27.325)` — with `-muted` bg tint
- Info: same hue as primary `oklch(0.535 0.056 225)`

### Borders
- Light: `oklch(0.914 0.008 248)` (slate-200, ~#E2E8F0) — very subtle
- Dark: `oklch(0.305 0.042 225)`

## Typography
- **Font family:** Inter (weights 400, 500, 600, 700), system-ui fallback
- **Mono:** JetBrains Mono
- **Scale:**
  - H1: 36px / 700 / ls -0.03em
  - H2: 30px / 600 / ls -0.025em
  - Body-md: 16px / 400
  - Body-sm: 14px / 400
  - Caption: 12px / 400
  - Label: 13px / 500
- **Rendering:** antialiased, `text-rendering: optimizeLegibility`

## Spacing
8pt grid system: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

## Border Radius
- Base: 8px (`0.5rem`)
- Cards/panels: 12px (`rounded-xl`) or 16px (`rounded-2xl`)
- Buttons sm: 6px, md: 8px, lg: 8px
- Small badges: 4px, pills: 9999px

## Shadows
Feather-light in light mode:
- Card: `0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.03)`
- Hover: `0 4px 12px rgba(0,0,0,0.06)` (card lifts on hover)
- Dropdown: `0 4px 6px … 0 10px 15px …`
- Sidebar: `2px 0 8px rgba(0,0,0,0.04)`

## Layout
- Sidebar: 240px expanded, 60px collapsed
- TopNav: 56px (h-14) — sticky, `bg-background/95 backdrop-blur-sm`
- Page container max-width: 1600px, padding 24px
- Main area background: `bg-muted/20` (very subtle off-white wash)
- Dashboard grid: 12-col equivalent using Tailwind grid utilities

## Component Patterns

### Cards
- `rounded-xl border bg-card p-4 shadow-card` (compact — document cards, quick action cards)
- `rounded-xl border bg-card p-5 shadow-card` (stat cards — slightly more padding)
- Hover: `hover:shadow-hover hover:-translate-y-px` — subtle lift
- No heavy shadows — the border alone gives enough separation

### Buttons
- Primary: `bg-primary text-white` — solid blue-grey
- Secondary: `bg-secondary border-border`
- Ghost: `bg-transparent hover:bg-muted`
- Outline: transparent + border
- Sizes: xs(h-7) sm(h-8) md(h-9) lg(h-10) xl(h-12)
- Loading: Loader2 spinner replaces icon

### Nav Active State
- Active item: `bg-primary/10 text-primary` (subtle primary bg tint)
- Inactive: `text-muted-foreground hover:bg-muted/60 hover:text-foreground`
- Height: h-8 (compact), px-2, rounded-lg

### Badges
- Type badges: 10px text, h-4, colored bg matching doc type
- Nav badges: rounded-full `bg-primary text-primary-foreground` 10px

### Section Headers (in widgets/cards)
- `text-base font-semibold text-foreground` — 16px/600
- Section labels in sidebar: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70`

### Forms
- Input: `h-9 rounded-md border border-input bg-background` (md size)
- Focus: `ring-1 ring-ring`
- Label: 13px/500

## Motion / Animation
- Card hover: `transition-all duration-150 ease-out` — subtle and fast
- Sidebar collapse: `transition-[width] duration-200 ease-in-out`
- Fade-in pages: `animation: fade-in 0.2s ease-out`
- Fade-in-up: `animation: fade-in-up 0.25s ease-out`
- Skeleton shimmer: gradient sweep 1.5s

## Dashboard Layout (the target page)
```
[WelcomeBanner - full width gradient card]
[4× StatCards grid]
[4× QuickAction cards]
[AIUsageChart (2/3) | WeeklyActivityChart (1/3)]
[DocumentCard list (1/2) | AIGenerationCard list (1/2)]
[ActivityTimeline (2/3) | StorageWidget + ProductivityWidget (1/3)]
[DocumentsBarChart (conditional)]
```

## Do NOT Use
- Bright neon or saturated gradients (not brand)
- Serif or decorative fonts (Inter only)
- Heavy drop shadows (feather-light only)
- Rounded-none or sharp corners (always use border-radius)
- Dense text-heavy layouts without whitespace
