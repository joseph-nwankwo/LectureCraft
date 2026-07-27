# Theme & Design Tokens

## Framework
- React 18 + TypeScript + Vite 8
- Tailwind CSS v4 (CSS-first, no tailwind.config.ts — config is in globals.css via `@theme inline`)
- shadcn/ui radix primitives
- Font: Inter (sans), JetBrains Mono (mono)

## globals.css (full content)

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Semantic colors */
  --color-background:             var(--background);
  --color-foreground:             var(--foreground);
  --color-card:                   var(--card);
  --color-card-foreground:        var(--card-foreground);
  --color-popover:                var(--popover);
  --color-popover-foreground:     var(--popover-foreground);
  --color-primary:                var(--primary);
  --color-primary-foreground:     var(--primary-foreground);
  --color-secondary:              var(--secondary);
  --color-secondary-foreground:   var(--secondary-foreground);
  --color-muted:                  var(--muted);
  --color-muted-foreground:       var(--muted-foreground);
  --color-accent:                 var(--accent);
  --color-accent-foreground:      var(--accent-foreground);
  --color-destructive:            var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border:                 var(--border);
  --color-input:                  var(--input);
  --color-ring:                   var(--ring);

  /* Status colors */
  --color-success:                var(--success);
  --color-success-foreground:     var(--success-foreground);
  --color-warning:                var(--warning);
  --color-warning-foreground:     var(--warning-foreground);
  --color-info:                   var(--info);
  --color-info-foreground:        var(--info-foreground);
  --color-error:                  var(--error);
  --color-error-foreground:       var(--error-foreground);

  /* Surface layers */
  --color-surface-1:              var(--surface-1);
  --color-surface-2:              var(--surface-2);
  --color-surface-3:              var(--surface-3);

  /* Charts */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* Sidebar */
  --color-sidebar:                     var(--sidebar);
  --color-sidebar-foreground:          var(--sidebar-foreground);
  --color-sidebar-primary:             var(--sidebar-primary);
  --color-sidebar-primary-foreground:  var(--sidebar-primary-foreground);
  --color-sidebar-accent:              var(--sidebar-accent);
  --color-sidebar-accent-foreground:   var(--sidebar-accent-foreground);
  --color-sidebar-border:              var(--sidebar-border);
  --color-sidebar-ring:                var(--sidebar-ring);

  /* Typography */
  --font-sans: var(--font-family-sans);
  --font-mono: var(--font-family-mono);

  /* Radii */
  --radius-xs: calc(var(--radius) - 6px);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card:     var(--shadow-card-value);
  --shadow-dropdown: var(--shadow-dropdown-value);
  --shadow-modal:    var(--shadow-modal-value);
  --shadow-sidebar:  var(--shadow-sidebar-value);
  --shadow-nav:      var(--shadow-nav-value);
  --shadow-hover:    var(--shadow-hover-value);

  /* Spacing scale (8pt system) */
  --spacing-1: 4px;  --spacing-2: 8px;   --spacing-3: 12px;
  --spacing-4: 16px; --spacing-5: 20px;  --spacing-6: 24px;
  --spacing-8: 32px; --spacing-10: 40px; --spacing-12: 48px;
}

@layer base {
  :root {
    --font-family-sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-family-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;

    /* LIGHT MODE */
    --background: oklch(1 0 0);                    /* #FFFFFF */
    --foreground: oklch(0.210 0.026 258);          /* #1F2937 gray-800 */
    --surface-1:  oklch(0.978 0.004 248);
    --surface-2:  oklch(0.965 0.006 248);
    --surface-3:  oklch(0.948 0.009 248);
    --card:       oklch(1 0 0);
    --card-foreground: oklch(0.210 0.026 258);
    --popover:    oklch(1 0 0);
    --popover-foreground: oklch(0.210 0.026 258);

    /* Primary: Blue-Grey #334E68 */
    --primary:            oklch(0.440 0.058 225);
    --primary-foreground: oklch(1 0 0);

    --secondary:            oklch(0.965 0.006 248);
    --secondary-foreground: oklch(0.350 0.030 252);
    --muted:                oklch(0.972 0.004 248);
    --muted-foreground:     oklch(0.503 0.012 252); /* #6B7280 */
    --accent:               oklch(0.965 0.006 248);
    --accent-foreground:    oklch(0.440 0.058 225);

    /* Status */
    --success:              oklch(0.527 0.154 155.0);  /* Emerald-600 */
    --success-foreground:   oklch(0.99 0 0);
    --success-muted:        oklch(0.961 0.031 155.0);
    --warning:              oklch(0.769 0.188 70.08);  /* Amber-500 */
    --warning-foreground:   oklch(0.2 0.02 70);
    --warning-muted:        oklch(0.973 0.052 80);
    --error:                oklch(0.577 0.245 27.325); /* Red-600 */
    --error-foreground:     oklch(0.99 0 0);
    --error-muted:          oklch(0.971 0.048 23);
    --info:                 oklch(0.535 0.056 225);
    --info-foreground:      oklch(0.99 0 0);
    --info-muted:           oklch(0.965 0.006 248);
    --destructive:          oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.99 0 0);

    --border: oklch(0.914 0.008 248);  /* slate-200 */
    --input:  oklch(0.914 0.008 248);
    --ring:   oklch(0.535 0.056 225);
    --radius: 0.5rem; /* 8px */

    /* Charts */
    --chart-1: oklch(0.440 0.058 225);
    --chart-2: oklch(0.718 0.044 225);
    --chart-3: oklch(0.527 0.154 155.0);
    --chart-4: oklch(0.769 0.188 70.08);
    --chart-5: oklch(0.255 0.068 225);

    /* Sidebar (off-white) */
    --sidebar:                    oklch(0.965 0.006 248);
    --sidebar-foreground:         oklch(0.210 0.026 258);
    --sidebar-primary:            oklch(0.440 0.058 225);
    --sidebar-primary-foreground: oklch(1 0 0);
    --sidebar-accent:             oklch(0.950 0.009 248);
    --sidebar-accent-foreground:  oklch(0.350 0.030 252);
    --sidebar-border:             oklch(0.930 0.010 248);
    --sidebar-ring:               oklch(0.535 0.056 225);

    /* Shadows (feather-light) */
    --shadow-card-value:     0 1px 3px oklch(0 0 0 / 0.03), 0 1px 2px oklch(0 0 0 / 0.03);
    --shadow-dropdown-value: 0 4px 6px -2px oklch(0 0 0 / 0.04), 0 10px 15px -3px oklch(0 0 0 / 0.06);
    --shadow-modal-value:    0 20px 25px -5px oklch(0 0 0 / 0.08), 0 10px 10px -5px oklch(0 0 0 / 0.03);
    --shadow-sidebar-value:  2px 0 8px oklch(0 0 0 / 0.04);
    --shadow-nav-value:      0 1px 0 oklch(0 0 0 / 0.05);
    --shadow-hover-value:    0 4px 12px oklch(0 0 0 / 0.06);
  }

  .dark {
    --background:   oklch(0.185 0.040 225); /* ~#1B2432 */
    --foreground:   oklch(0.958 0.006 248); /* ~#F1F5F9 */
    --surface-1:    oklch(0.220 0.044 225);
    --surface-2:    oklch(0.268 0.048 225);
    --surface-3:    oklch(0.340 0.050 225);
    --card:         oklch(0.235 0.046 225);
    --card-foreground: oklch(0.958 0.006 248);
    --popover:      oklch(0.235 0.046 225);
    --popover-foreground: oklch(0.958 0.006 248);

    /* Primary dark: Blue-Grey #829AB1 */
    --primary:            oklch(0.718 0.044 225);
    --primary-foreground: oklch(0.185 0.040 225);

    --secondary:            oklch(0.285 0.044 225);
    --secondary-foreground: oklch(0.958 0.006 248);
    --muted:                oklch(0.285 0.044 225);
    --muted-foreground:     oklch(0.760 0.028 248);
    --accent:               oklch(0.305 0.042 225);
    --accent-foreground:    oklch(0.914 0.008 248);

    --success:            oklch(0.696 0.17 155.0);
    --success-foreground: oklch(0.185 0.040 225);
    --success-muted:      oklch(0.208 0.065 155.0);
    --warning:            oklch(0.862 0.165 75);
    --warning-foreground: oklch(0.2 0.02 70);
    --warning-muted:      oklch(0.248 0.07 75);
    --error:              oklch(0.704 0.191 22.216);
    --error-foreground:   oklch(0.185 0.040 225);
    --error-muted:        oklch(0.248 0.08 22);
    --info:               oklch(0.718 0.044 225);
    --info-foreground:    oklch(0.185 0.040 225);
    --info-muted:         oklch(0.285 0.044 225);
    --destructive:        oklch(0.704 0.191 22.216);
    --destructive-foreground: oklch(0.185 0.040 225);

    --border: oklch(0.305 0.042 225);
    --input:  oklch(0.305 0.042 225);
    --ring:   oklch(0.718 0.044 225);

    --chart-1: oklch(0.718 0.044 225);
    --chart-2: oklch(0.800 0.038 225);
    --chart-3: oklch(0.696 0.17  155.0);
    --chart-4: oklch(0.862 0.165 75);
    --chart-5: oklch(0.875 0.028 225);

    --sidebar:                    oklch(0.208 0.042 225);
    --sidebar-foreground:         oklch(0.958 0.006 248);
    --sidebar-primary:            oklch(0.718 0.044 225);
    --sidebar-primary-foreground: oklch(0.185 0.040 225);
    --sidebar-accent:             oklch(0.285 0.044 225);
    --sidebar-accent-foreground:  oklch(0.958 0.006 248);
    --sidebar-border:             oklch(0.305 0.042 225);
    --shadow-card-value:     0 1px 3px oklch(0 0 0 / 0.15), 0 1px 2px oklch(0 0 0 / 0.12);
    --shadow-hover-value:    0 4px 12px oklch(0 0 0 / 0.28);
  }
}
```

## Design Summary

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| Background | #FFFFFF | ~#1B2432 | White / dark blue-grey |
| Foreground | #1F2937 | ~#F1F5F9 | Gray-800 / slate-100 |
| Primary | Blue-Grey #334E68 | Blue-Grey #829AB1 | Main brand color |
| Sidebar | off-white ~#F3F6F9 | ~#1C2433 | Distinct from page bg |
| Border | slate-200 ~#E2E8F0 | dark blue-grey | Very subtle |
| Success | Emerald-600 | lighter green | |
| Warning | Amber-500 | lighter amber | |
| Error | Red-600 | lighter red | |
| Radius | 8px base | | 0.5rem |
| Font | Inter | | system-ui fallback |
| Shadows | feather-light (0.03-0.06 alpha) | slightly heavier | |

## Layout Dimensions
- Sidebar expanded: 240px; collapsed: 60px
- TopNav height: 56px (h-14)
- Page padding: 24px (p-6)
- Max page width: 1600px
