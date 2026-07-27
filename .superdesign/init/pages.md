# Pages & Component Dependency Trees

## /dashboard (DashboardPage) ★ PRIMARY TARGET

**Entry:** `frontend/src/features/dashboard/pages/DashboardPage.tsx`

```
DashboardPage.tsx
├── WelcomeBanner                       src/features/dashboard/components/WelcomeBanner.tsx
│   └── Button                          src/components/design-system/buttons/Button.tsx
├── StatsWidget                         src/components/design-system/widgets/StatsWidget.tsx
│   └── StatCard                        src/components/design-system/cards/StatCard.tsx
│       └── Spinner                     src/components/design-system/feedback/Spinner.tsx
├── QuickActions                        src/components/design-system/widgets/QuickActions.tsx
├── AIUsageChart                        src/features/dashboard/components/ChartWidgets.tsx
├── WeeklyActivityChart                 src/features/dashboard/components/ChartWidgets.tsx
├── DocumentsBarChart                   src/features/dashboard/components/ChartWidgets.tsx
├── StorageWidget                       src/features/dashboard/components/ChartWidgets.tsx
├── ProductivityWidget                  src/features/dashboard/components/ChartWidgets.tsx
├── ActivityTimeline                    src/components/design-system/widgets/ActivityTimeline.tsx
├── DocumentCard                        src/components/design-system/cards/DocumentCard.tsx
│   ├── Badge                           src/components/ui/badge.tsx
│   └── DropdownMenu*                   src/components/ui/dropdown-menu.tsx
├── AIGenerationCard                    src/components/design-system/cards/AIGenerationCard.tsx
│   └── Badge                           src/components/ui/badge.tsx
├── Button                              src/components/design-system/buttons/Button.tsx
└── Skeleton                            src/components/design-system/feedback/Skeleton.tsx
```

**Layout shell (always included):**
```
AppLayout.tsx                           src/layouts/AppLayout/AppLayout.tsx
├── Sidebar.tsx                         src/layouts/AppLayout/Sidebar.tsx
├── TopNav.tsx                          src/layouts/AppLayout/TopNav.tsx
│   ├── Button                          src/components/design-system/buttons/Button.tsx
│   ├── Avatar*                         src/components/ui/avatar.tsx
│   └── DropdownMenu*                   src/components/ui/dropdown-menu.tsx
├── MobileNav.tsx                       src/layouts/AppLayout/MobileNav.tsx
└── Footer.tsx                          src/layouts/AppLayout/Footer.tsx
```

**Context files to pass for Dashboard design:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/layouts/AppLayout/MobileNav.tsx`
- `src/layouts/AppLayout/Footer.tsx`
- `src/features/dashboard/pages/DashboardPage.tsx:121` (skip first 120 lines of logic/data fetching, start at JSX)
- `src/features/dashboard/components/WelcomeBanner.tsx`
- `src/components/design-system/widgets/StatsWidget.tsx`
- `src/components/design-system/cards/StatCard.tsx`
- `src/components/design-system/widgets/QuickActions.tsx`
- `src/components/design-system/cards/DocumentCard.tsx`
- `src/components/design-system/widgets/ActivityTimeline.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`

---

## /ai-studio (AIStudioPage)

**Entry:** `frontend/src/features/ai-engine/pages/AIStudioPage.tsx`

Hub page for all AI generation tools. Contains feature cards for each generator.

**Context files:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/features/ai-engine/pages/AIStudioPage.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`

---

## /courses (CoursesPage)

**Entry:** `frontend/src/features/courses/pages/CoursesPage.tsx`

Lists educator's courses. Likely has course cards in a grid, create button, search/filter.

**Context files:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/features/courses/pages/CoursesPage.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`

---

## /document-library (DocumentLibraryPage)

**Entry:** `frontend/src/features/library/pages/DocumentLibraryPage.tsx`

Document management. Has folder tree, document list/grid, filters by type.

**Context files:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/features/library/pages/DocumentLibraryPage.tsx`
- `src/components/design-system/cards/DocumentCard.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`

---

## /analytics (AnalyticsDashboardPage)

**Entry:** `frontend/src/features/analytics/pages/AnalyticsDashboardPage.tsx`

Analytics charts and metrics. Similar chart widgets to Dashboard.

**Context files:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/features/analytics/pages/AnalyticsDashboardPage.tsx`
- `src/components/design-system/widgets/StatsWidget.tsx`
- `src/components/design-system/cards/StatCard.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`

---

## /settings (SettingsPage)

**Entry:** `frontend/src/features/settings/pages/SettingsPage.tsx`

Tabbed settings: Profile, AI Providers, Notifications, Appearance, Institution, Grading System.

**Context files:**
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/layouts/AppLayout/Sidebar.tsx`
- `src/layouts/AppLayout/TopNav.tsx`
- `src/features/settings/pages/SettingsPage.tsx`
- `src/components/design-system/buttons/Button.tsx`
- `src/components/ui/tabs.tsx`
- `src/styles/globals.css`
- `.superdesign/design-system.md`
