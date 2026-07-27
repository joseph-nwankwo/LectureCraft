# Extractable Components

These are components suitable for extraction as reusable Superdesign DraftComponents.

## Layout Components (appear on every page)

### Sidebar
- Source: `src/layouts/AppLayout/Sidebar.tsx`
- Category: layout
- Description: Left navigation drawer with logo, inline search, favorites/recent, sectioned nav, collapse toggle
- Extractable props:
  - `activeItem` (string, default: "dashboard") — current active nav item id
  - `collapsed` (boolean, default: false) — whether sidebar is collapsed to 60px
- Hardcoded: Logo (Lightbulb icon + "LectureCraft"), all nav items and section labels, Star/Clock icons, all CSS classes

### TopNav
- Source: `src/layouts/AppLayout/TopNav.tsx`
- Category: layout
- Description: Sticky top header with breadcrumbs, search trigger, Generate button, notifications bell, profile avatar
- Extractable props:
  - `pageTitle` (string, default: "Dashboard") — current page label for breadcrumb
  - `userInitials` (string, default: "JD") — avatar fallback text
  - `notificationCount` (number, default: 3) — unread notifications badge
  - `isOnline` (boolean, default: true) — online/offline status dot
- Hardcoded: Sparkles icon, Bell icon, Plus icon, all dropdown contents, search placeholder, date display, CSS

### MobileNav
- Source: `src/layouts/AppLayout/MobileNav.tsx`
- Category: layout
- Description: Mobile slide-in drawer with same nav as Sidebar
- Extractable props:
  - `activeItem` (string, default: "dashboard") — current active nav item
  - `isOpen` (boolean, default: false) — whether drawer is open
- Hardcoded: Logo, all nav sections and items, all icons and labels, CSS

### Footer
- Source: `src/layouts/AppLayout/Footer.tsx`
- Category: layout
- Description: Slim bottom bar with copyright, Privacy/Terms/Support links, version
- Extractable props: none (fully static)
- Hardcoded: "LectureCraft", year, Privacy, Terms, Support, v1.0.0

---

## Basic Components (used across pages)

### WelcomeBanner
- Source: `src/features/dashboard/components/WelcomeBanner.tsx`
- Category: basic
- Description: Gradient primary-colored hero banner with greeting, date, and CTA buttons
- Extractable props:
  - `greeting` (string, default: "Good morning")
  - `name` (string, default: "Professor")
  - `dateLabel` (string, default: "Saturday, July 19, 2026")
- Hardcoded: gradient `from-primary/90 via-primary to-primary/70`, bg decoration circles, button styles, "Open AI Studio" / "Create a Course" labels, Sparkles/ArrowRight icons

### StatCard
- Source: `src/components/design-system/cards/StatCard.tsx`
- Category: basic
- Description: KPI tile with icon, numeric value, label, and optional trend arrow
- Extractable props:
  - `label` (string, default: "Active Courses")
  - `value` (string, default: "12")
  - `color` (string, default: "primary") — one of: default/primary/success/warning/error
  - `trendValue` (number, default: 0) — positive/negative %
  - `trendDirection` (string, default: "up")
- Hardcoded: icon placeholder, CSS, border radius, shadow

### DocumentCard
- Source: `src/components/design-system/cards/DocumentCard.tsx`
- Category: basic
- Description: Document list item card with type badge, title, tags, 3-dot action menu
- Extractable props:
  - `title` (string, default: "Introduction to Machine Learning")
  - `type` (string, default: "LECTURE_NOTE") — controls icon/color
  - `courseName` (string, default: "CS 301")
  - `date` (string, default: "Jul 15, 2026")
- Hardcoded: type→color/icon mapping, dropdown menu items, badge styles, CSS

### QuickActionCard
- Source: `src/components/design-system/widgets/QuickActions.tsx` (cards variant)
- Category: basic
- Description: Action card with colored icon, bold label, description text
- Extractable props:
  - `label` (string, default: "Lecture Note")
  - `description` (string, default: "AI-generated lecture content")
  - `color` (string, default: "primary") — controls icon bg/text color
- Hardcoded: icon placeholder, hover effects, card structure, CSS
