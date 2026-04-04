# Design Audit

Generated: 2026-04-04T15:46:07.347Z (UTC)
Scope: 704 files (UI surfaces only)
Routes audited: 95/95 page routes

## Audit Progress

| Chunk | Routes | Status |
|---|---:|---|
| Admin routes | 12 | Done |
| Auth routes | 8 | Done |
| Dashboard routes | 44 | Done |
| Legal docs routes | 16 | Done |
| Legal core routes | 3 | Done |
| Public share routes | 5 | Done |
| Print routes | 2 | Done |
| Root/misc routes | 5 | Done |

- Remaining: 0 routes
- Resume point: none (full pass complete)

## 1. Color Inventory

- Unique color literals (hex/rgb/hsl/rgba): **214**
- Unique CSS variables declared: **157**
- Unique CSS variables used: **174**
- Unique Tailwind text colors: **138**
- Unique Tailwind background colors: **135**
- Unique Tailwind border colors: **71**
- Unique Tailwind accent gradient colors: **10**
- Unique Tailwind ring colors: **2**

### Most-used Colors

| Value | Uses |
|---|---:|
| `rgb(89, 89, 89)` | 174 |
| `hsl(var(--accent-warm)` | 90 |
| `hsl(var(--chip-border)` | 77 |
| `hsl(var(--chip-bg)` | 55 |
| `hsl(var(--chip-text)` | 55 |
| `#595959` | 48 |
| `rgb(255, 255, 255)` | 44 |
| `rgb(0, 58, 250)` | 43 |
| `#111827` | 29 |
| `hsl(var(--chip-hover-bg)` | 28 |
| `#ffffff` | 26 |
| `hsl(var(--chip-active-text)` | 24 |
| `#6b7280` | 23 |
| `hsl(var(--table-shell-border)` | 18 |
| `#f3f4f6` | 16 |

- One-off literal colors: **124**
- Hardcoded literal colors (not CSS var-based): **125**

### Category Lists

Text colors:

```text
text-muted-foreground	1184
text-center	211
text-foreground	107
text-primary	94
text-zinc-400	80
text-destructive	78
text-left	48
text-zinc-100	42
text-destructive-foreground	42
text-neutral-400	40
text-zinc-500	34
text-primary-foreground	31
text-zinc-300	29
text-green-500	27
text-right	26
text-gray-500	24
text-neutral-500	19
text-blue-500	18
text-neutral-900	18
text-gray-900	16
text-green-600	15
text-drawer-meta	15
text-foreground/56	14
text-white	12
text-amber-500	12
text-neutral-600	12
text-purple-500	12
text-foreground/72	11
text-builder-xs	11
text-zinc-900	10
text-muted-foreground/50	10
text-amber-600	10
text-muted-foreground/70	10
text-builder-sm	10
text-foreground/62	9
text-foreground/70	8
text-foreground/66	8
text-muted-foreground/60	8
text-blue-600	8
text-orange-500	8
text-slate-500	8
text-foreground/85	7
text-rose-700	7
text-neutral-700	7
text-control	7
text-foreground/80	6
text-green-700	6
text-zinc-200	6
text-drawer-title	6
text-muted-foreground/80	6
text-muted-foreground/40	6
text-pink-500	6
text-black	5
text-drawer-section	5
text-foreground/60	5
text-amber-700	5
text-amber-800	5
text-blue-700	5
text-green-800	5
text-border/50	5
text-slate-700	5
text-gray-400	4
text-slate-800	4
text-blue-400	4
text-red-500	4
text-white"	4
text-builder-md	4
text-builder-2xs	4
text-foreground/54	3
text-muted-foreground/30	3
text-red-600	3
text-background	3
text-red-400	3
text-emerald-400	3
text-foreground/65	3
text-emerald-700	3
text-nav-muted	3
text-neutral-300	3
text-hero	3
text-foreground/76	3
text-foreground/58	3
text-foreground/46	2
text-button-primary	2
text-blue-800	2
text-green-700"	2
text-yellow-700"	2
text-red-700	2
text-zinc-600	2
text-purple-600	2
text-gray-600	2
text-nav-strong	2
text-nav	2
text-yellow-600	2
text-yellow-700	2
text-slate-600	2
text-foreground/88	2
text-emerald-500	2
text-foreground/90	2
text-foreground/68	1
text-blue-700"	1
text-amber-400	1
text-green-400	1
text-purple-400	1
text-orange-400	1
text-pink-400	1
text-destructive/80	1
text-indigo-700	1
text-emerald-800	1
text-orange-600	1
text-muted-foreground/20	1
text-muted-foreground/90	1
text-violet-600	1
text-neutral-600"	1
text-neutral-900"	1
text-neutral-400"	1
text-neutral-500"	1
text-hero-sub	1
text-builder-xl	1
text-builder-title	1
text-blue-900	1
text-accent-foreground"	1
text-indigo-600	1
text-yellow-500	1
text-pill	1
text-indigo-500	1
text-amber-900	1
text-red-900	1
text-zinc-950	1
text-black/54	1
text-white/80	1
text-foreground/10	1
text-drawer-value	1
text-foreground/55	1
text-foreground/45	1
text-drawer-label	1
text-foreground/28	1
text-current	1
text-green-500/70	1
```
Background colors:

```text
bg-background	89
bg-white	61
bg-[hsl(var(--chip-bg))]	46
bg-destructive	42
bg-muted/30	41
bg-muted	37
bg-primary	34
bg-zinc-800	29
bg-muted/20	26
bg-background/80	26
bg-control	25
bg-transparent	21
bg-card	18
bg-muted/50	17
bg-primary/5	14
bg-zinc-900	13
bg-border/70	12
bg-zinc-100	10
bg-[hsl(var(--accent-warm))]	10
bg-border/40	9
bg-primary/10	8
bg-muted/40	8
bg-amber-50	8
bg-neutral-50	8
bg-white/80	8
bg-zinc-950	7
bg-background/96	7
bg-muted/55	7
bg-rose-50/70	7
bg-green-50	6
bg-blue-50	6
bg-green-100	6
bg-border/60	6
bg-foreground	5
bg-destructive/10	5
bg-[hsl(var(--accent-warm)/0.35)]	5
bg-neutral-900	5
bg-amber-400	4
bg-border	4
bg-gray-100	4
bg-gray-50	4
bg-background/70	4
bg-popover	4
bg-background/90	3
bg-gradient-to-br	3
bg-gray-100/50	3
bg-zinc-900/50	3
bg-background/95	3
bg-[hsl(var(--accent-warm)/0.25)]	3
bg-background/60	3
bg-muted/60	3
bg-muted/10	3
bg-gradient-to-t	3
bg-neutral-300	3
bg-green-600	3
bg-gradient-to-r	3
bg-black	3
bg-gray-50/50	2
bg-control/55	2
bg-control/75	2
bg-green-500/10	2
bg-button-primary	2
bg-zinc-800/30	2
bg-amber-100	2
bg-[hsl(var(--accent-warm)/0.6)]	2
bg-emerald-50	2
bg-app-shell	2
bg-red-50	2
bg-neutral-100	2
bg-yellow-50/50	2
bg-chrome	2
bg-builder-canvas	2
bg-muted-foreground/30	2
bg-blue-600	2
bg-[hsl(var(--chip-active-bg))]	2
bg-[color:var(--program-soft)]	2
bg-blue-100	2
bg-black/10	2
bg-control/25	2
bg-gray-200	1
bg-white/95	1
bg-white/90	1
bg-control/18	1
bg-white/88	1
bg-destructive/5	1
bg-[color:hsl(var(--program-preview-surface))]	1
bg-red-100	1
bg-zinc-700	1
bg-amber-900/50	1
bg-emerald-900/50	1
bg-zinc-800/50	1
bg-black/50	1
bg-indigo-400	1
bg-blue-400	1
bg-green-400	1
bg-[hsl(var(--accent-warm)/0.2)]	1
bg-purple-400	1
bg-indigo-50	1
bg-red-500	1
bg-emerald-100	1
bg-emerald-50/50	1
bg-amber-50/30	1
bg-app-island	1
bg-gray-50/60	1
bg-green-500	1
bg-[hsl(var(--accent-warm)/0.35)]"	1
bg-[hsl(var(--accent-warm)/0.4)]	1
bg-[hsl(var(--accent-warm)/0.5)]	1
bg-neutral-200	1
bg-secondary	1
bg-border/50	1
bg-panel	1
bg-paper	1
bg-[color:hsl(var(--program-control-panel-bg))]	1
bg-[hsl(var(--menu))]	1
bg-border/80	1
bg-emerald-500	1
bg-pill	1
bg-[color:var(--program-muted)]	1
bg-[color:var(--program-card)]	1
bg-white/40	1
bg-black/18	1
bg-white/72	1
bg-white/20	1
bg-yellow-50	1
bg-muted"	1
bg-background/50	1
bg-[radial-gradient(#60a5fa_1px,transparent_1px)]	1
bg-control/35	1
bg-border/45	1
bg-white/78	1
bg-gradient-to-b	1
bg-white/96	1
bg-amber-500	1
bg-white/15	1
```
Border colors:

```text
border-border/60	133
border-[hsl(var(--chip-border))]	68
border-border/50	49
border-zinc-700	35
border-neutral-200	28
border-control	27
border-zinc-800	25
border-border	23
border-input	19
border-dashed	17
border-border/40	17
border-primary	15
border-neutral-100	15
border-border/70	13
border-primary/10	10
border-neutral-300	10
border-border/80	8
border-border/55	8
border-amber-200	8
border-border/45	7
border-rose-200	7
border-l-2	5
border-primary/20	4
border-green-200	4
border-none	4
border-border/30	3
border-destructive/30	3
border-transparent	3
border-slate-200	3
border-blue-100	3
border-gray-100	3
border-white/60	3
border-destructive	2
border-red-200	2
border-destructive/20	2
border-blue-200	2
border-t-2	2
border-blue-500	2
border-yellow-100	2
border-white/40	2
border-border/65	2
border-b-2	1
border-green-100	1
border-destructive/50	1
border-button-primary	1
border-gray-200	1
border-zinc-700/50	1
border-amber-200/80	1
border-blue-300	1
border-indigo-200	1
border-red-500	1
border-primary/30	1
border-t-0	1
border-muted-foreground/20	1
border-amber-200/60	1
border-b-0	1
border-[hsl(var(--accent-warm)/0.7)]	1
border-neutral-900	1
border-x-[6px]	1
border-x-transparent	1
border-b-[6px]	1
border-b-foreground	1
border-[color:hsl(var(--program-control-panel-border))]	1
border-foreground	1
border-muted/50	1
border-[color:var(--program-border)]	1
border-black/10	1
border-black	1
border-chrome	1
border-muted	1
border-amber-300	1
```
Accent/brand gradient colors:

```text
from-background	4
to-transparent	4
from-blue-600	3
to-blue-700	3
to-muted	2
from-amber-400	1
via-amber-500	1
to-orange-500	1
from-black/10	1
from-control/55	1
```
Ring colors:

```text
ring-offset-background	5
ring-gray-200	4
```
CSS variables declared:

```text
--table-row-divider	4
--table-header-bg	4
--table-header-border	4
--background	3
--foreground	3
--muted	3
--muted-foreground	3
--card	3
--accent	3
--border	3
--canvas	2
--panel	2
--paper	2
--card-foreground	2
--popover	2
--popover-foreground	2
--primary	2
--primary-foreground	2
--secondary	2
--secondary-foreground	2
--accent-foreground	2
--accent-warm	2
--accent-warm-hover	2
--chrome	2
--chrome-border	2
--overlay	2
--app-shell	2
--app-island	2
--app-island-border	2
--nav-hover	2
--nav-hover-alpha	2
--nav-selected	2
--nav-selected-alpha	2
--nav-text	2
--nav-text-strong	2
--nav-text-muted	2
--nav-active-border	2
--program-stage-bg	2
--program-control-panel-bg	2
--program-control-panel-border	2
--program-control-tabs-bg	2
--program-control-tabs-border	2
--program-control-label	2
--program-control-text	2
--program-control-emphasis	2
--program-control-emphasis-foreground	2
--program-control-emphasis-ring	2
--program-control-soft	2
--program-control-radius	2
--program-control-inner-radius	2
--program-control-selected-bg	2
--program-control-selected-fg	2
--program-control-selected-ring	2
--program-control-panel-width	2
--program-control-label-width	2
--program-control-option-width	2
--program-control-field-bg	2
--program-control-field-text	2
--program-control-field-icon	2
--program-control-divider	2
--program-control-section-title	2
--program-control-switch-bg	2
--program-control-switch-thumb	2
--program-preview-panel-bg	2
--program-preview-panel-border	2
--program-preview-stage-bg	2
--program-preview-frame-shell	2
--program-preview-frame-border	2
--program-preview-surface	2
--program-preview-text	2
--program-preview-muted	2
--program-preview-subtle	2
--program-preview-card-bg	2
--program-preview-card-border	2
--program-preview-pill-bg	2
--program-preview-pill-border	2
--program-preview-pill-text	2
--program-preview-icon-bg	2
--program-preview-icon-border	2
--program-preview-frame-shadow	2
--program-preview-card-shadow	2
--program-preview-list-divider	2
--program-preview-content-padding	2
--program-preview-header-tracking	2
--program-preview-title-max-width	2
--program-preview-pill-padding	2
--shadow-program-panel	2
--shadow-program-frame	2
--shadow-program-content-inset	2
--shadow-program-card	2
--shadow-app-island	2
--shadow-floating-control	2
--builder-canvas	2
--drawer-text-label	2
--drawer-text-value	2
--drawer-text-meta	2
--drawer-text-section	2
--drawer-text-menu-item	2
--drawer-text-title	2
--button-primary	2
--button-primary-hover	2
--button-primary-foreground	2
--pill	2
--pill-foreground	2
--control	2
--control-foreground	2
--control-border	2
--control-hover	2
--menu	2
--menu-border	2
--menu-text	2
--menu-muted	2
--menu-icon	2
--menu-hover	2
--menu-separator	2
--table-row-hover	2
--table-row-selected	2
--table-filter-hover	2
--table-filter-active	2
--table-shell-bg	2
--table-shell-border	2
--table-shell-shadow	2
--table-head-height	2
--table-cell-px	2
--table-row-py	2
--table-header-font-size	2
--table-body-font-size	2
--table-meta-font-size	2
--chip-bg	2
--chip-border	2
--chip-text	2
--chip-hover-bg	2
--chip-active-bg	2
--chip-active-border	2
--chip-active-text	2
--destructive	2
--destructive-foreground	2
--input	2
--ring	2
--builder-text-2xs	1
--builder-text-xs	1
--builder-text-sm	1
--builder-text-md	1
--builder-text-lg	1
--builder-text-xl	1
--builder-text-title	1
--shadow-builder-card	1
--shadow-builder-card-hover	1
--shadow-builder-card-selected	1
--shadow-builder-header	1
--shadow-builder-canvas	1
--radius	1
--chart-1	1
--chart-2	1
--chart-3	1
--chart-4	1
--chart-5	1
```
CSS variables used:

```text
--accent-warm	90
--chip-border	77
--chip-bg	55
--chip-text	55
--chip-hover-bg	28
--chip-active-text	24
--table-shell-border	18
--chip-active-bg	15
--builder-text-xs	15
--accent-warm-hover	14
--menu-text	13
--table-row-hover	13
--drawer-text-value	12
--menu-hover	12
--program-muted	12
--program-icon-box	12
--table-cell-px	11
--table-row-py	9
--program-text	9
--menu	8
--table-row-selected	8
--program-icon-size	8
--border	7
--program-subtitle-display	7
--program-item-weight	6
--program-subtle	6
--table-filter-hover	5
--builder-text-sm	4
--menu-icon	4
--program-card-padding-x	4
--program-card-padding-y	4
--program-card-shadow	4
--program-card-border	4
--program-border-width	4
--program-card-border-style	4
--program-icons-display	4
--table-filter-active	4
--builder-text-2xs	3
--table-meta-font-size	3
--muted-foreground	3
--program-radius	3
--program-card	3
--program-list-divider	3
--program-border	3
--radius	3
--program-preview-surface	2
--panel	2
--menu-muted	2
--table-shell-bg	2
--table-header-bg	2
--table-header-border	2
--table-body-font-size	2
--menu-separator	2
--program-icon-bg	2
--program-icon-border	2
--program-soft	2
--program-section-case	2
--program-section-weight	2
--program-divider-weight	2
--program-divider-style	2
--program-preview-card-border	2
--program-preview-pill-bg	2
--table-head-height	2
--table-header-font-size	2
--overlay	2
--ring	2
--radix-accordion-content-height	2
--radix-collapsible-content-height	2
--app-shell	1
--app-island	1
--builder-canvas	1
--app-island-border	1
--paper	1
--builder-text-md	1
--builder-text-lg	1
--builder-text-xl	1
--builder-text-title	1
--drawer-text-label	1
--drawer-text-meta	1
--drawer-text-section	1
--drawer-text-menu-item	1
--drawer-text-title	1
--shadow-builder-card	1
--shadow-builder-card-hover	1
--shadow-builder-card-selected	1
--shadow-builder-header	1
--shadow-builder-canvas	1
--chrome	1
--chrome-border	1
--nav-hover	1
--nav-hover-alpha	1
--nav-selected	1
--nav-selected-alpha	1
--nav-text	1
--nav-text-strong	1
--nav-text-muted	1
--nav-active-border	1
--button-primary	1
--button-primary-hover	1
--button-primary-foreground	1
--pill	1
--pill-foreground	1
--control	1
--control-foreground	1
--control-border	1
--control-hover	1
--menu-border	1
--table-shell-shadow	1
--shadow-app-island	1
--program-control-panel-width	1
--program-control-panel-border	1
--program-control-panel-bg	1
--program-frame-border	1
--program-frame-shell	1
--program-preview-frame-shadow	1
--program-surface	1
--shadow-program-content-inset	1
--program-preview-content-padding	1
--radix-popover-trigger-width	1
--radix-dropdown-menu-trigger-width	1
--program-section-radius	1
--program-header-align	1
--program-title-weight	1
--program-title-size	1
--program-title-margin-inline	1
--program-title-max-width	1
--program-title-case	1
--program-header-justify	1
--program-section-title-size	1
--program-preview-text	1
--program-preview-muted	1
--program-preview-subtle	1
--program-preview-list-divider	1
--program-preview-card-bg	1
--program-control-soft	1
--program-preview-pill-text	1
--program-preview-frame-shell	1
--program-preview-frame-border	1
--program-preview-card-shadow	1
--program-preview-icon-bg	1
--program-preview-icon-border	1
--program-preview-pill-border	1
--program-preview-header-tracking	1
--program-preview-title-max-width	1
--program-preview-pill-padding	1
--program-line-height	1
--program-section-gap	1
--program-item-gap	1
--radix-dropdown-menu-content-available-height	1
--radix-select-trigger-height	1
--radix-select-trigger-width	1
--table-row-divider	1
--background	1
--foreground	1
--card	1
--card-foreground	1
--popover	1
--popover-foreground	1
--primary	1
--primary-foreground	1
--secondary	1
--secondary-foreground	1
--muted	1
--accent	1
--accent-foreground	1
--destructive	1
--destructive-foreground	1
--input	1
--chart-1	1
--chart-2	1
--chart-3	1
--chart-4	1
--chart-5	1
--font-inter	1
```
Literal color values:

```text
rgb(89, 89, 89)	174
hsl(var(--accent-warm)	90
hsl(var(--chip-border)	77
hsl(var(--chip-bg)	55
hsl(var(--chip-text)	55
#595959	48
rgb(255, 255, 255)	44
rgb(0, 58, 250)	43
#111827	29
hsl(var(--chip-hover-bg)	28
#ffffff	26
hsl(var(--chip-active-text)	24
#6b7280	23
hsl(var(--table-shell-border)	18
#f3f4f6	16
hsl(var(--chip-active-bg)	15
hsl(var(--accent-warm-hover)	14
rgba(15,23,42,0.04)	14
hsl(var(--menu-text)	13
hsl(var(--table-row-hover)	13
#6366f1	12
hsl(var(--menu-hover)	12
rgba(15,23,42,0.12)	10
#333	9
#666	8
rgba(15,23,42,0.08)	8
#d1d5db	8
#9ca3af	8
hsl(var(--menu)	8
hsl(var(--table-row-selected)	8
hsl(var(--border)	7
rgba(15,23,42,0.05)	6
#e9ecef	6
#f9fafb	5
#ef4444	5
#f97316	5
#eab308	5
#22c55e	5
#06b6d4	5
#ec4899	5
hsl(var(--table-filter-hover)	5
#4b5563	5
hsl(var(--menu-icon)	4
#000000	4
#a855f7	4
#0ea5e9	4
hsl(var(--table-filter-active)	4
rgba(0, 0, 0, 0.05)	4
#667eea	4
#FCB122	3
#ddd	3
rgba(15,23,42,0.06)	3
rgba(0,0,0,0.05)	3
rgba(16,24,40,0.06)	3
rgba(0,0,0,0.35)	3
rgba(0,0,0,0.4)	3
hsl(var(--muted-foreground)	3
#3b82f6	3
#8b5cf6	3
#e5e7eb	3
#64748b	3
rgba(0, 0, 0, 0.03)	3
#09090b	3
#888	3
#4285F4	2
#34A853	2
#FBBC05	2
#EA4335	2
rgba(0, 0, 0, 0.1)	2
rgba(15,23,42,0.14)	2
rgba(15,23,42,0.1)	2
hsl(var(--program-preview-surface)	2
rgba(16,24,40,0.04)	2
rgba(15,23,42,0.03)	2
rgba(0,0,0,0.38)	2
hsl(var(--panel)	2
hsl(var(--menu-muted)	2
hsl(var(--table-shell-bg)	2
hsl(var(--table-header-bg)	2
hsl(var(--table-header-border)	2
hsl(var(--menu-separator)	2
rgb(10, 54, 90)	2
#23262b	2
rgb(250 250 250)	2
hsl(var(--program-preview-card-border)	2
hsl(var(--program-preview-pill-bg)	2
hsl(var(--overlay)	2
hsl(var(--ring)	2
#52525b	2
#f8f9fa	2
#0B5CFF	1
#fff3cd	1
#999	1
#555	1
#2d5016	1
#f5efe7	1
rgba(255,255,255,0.96)	1
rgba(255,255,255,0.95)	1
#2d8cff	1
#EFE7E1	1
#E6DDD6	1
rgba(15,23,42,0.02)	1
rgba(16,24,40,0.05)	1
rgba(17,24,39,0.035)	1
rgba(17,24,39,0.03)	1
rgba(16,24,40,0.12)	1
rgba(15,23,42,0.07)	1
rgba(255,255,255,0.05)	1
rgba(0,0,0,0.45)	1
hsl(var(--app-shell)	1
hsl(var(--app-island)	1
hsl(var(--builder-canvas)	1
hsl(var(--app-island-border)	1
hsl(var(--paper)	1
hsl(var(--chrome)	1
hsl(var(--chrome-border)	1
hsl(var(--nav-hover)	1
hsl(var(--nav-selected)	1
hsl(var(--nav-text)	1
hsl(var(--nav-text-strong)	1
hsl(var(--nav-text-muted)	1
hsl(var(--nav-active-border)	1
hsl(var(--button-primary)	1
hsl(var(--button-primary-hover)	1
hsl(var(--button-primary-foreground)	1
hsl(var(--pill)	1
hsl(var(--pill-foreground)	1
hsl(var(--control)	1
hsl(var(--control-foreground)	1
hsl(var(--control-border)	1
hsl(var(--control-hover)	1
hsl(var(--menu-border)	1
#3030F1	1
rgb(0, 0, 0)	1
#8a8f98	1
#b0b4bc	1
#152	1
hsl(var(--program-control-panel-border)	1
hsl(var(--program-control-panel-bg)	1
hsl(var(--program-preview-text)	1
hsl(var(--program-preview-muted)	1
hsl(var(--program-preview-subtle)	1
hsl(var(--program-preview-list-divider)	1
hsl(var(--program-preview-card-bg)	1
hsl(var(--program-control-soft)	1
hsl(var(--program-preview-pill-text)	1
hsl(var(--program-preview-frame-shell)	1
hsl(var(--program-preview-frame-border)	1
hsl(var(--program-preview-icon-bg)	1
hsl(var(--program-preview-icon-border)	1
hsl(var(--program-preview-pill-border)	1
#f59e0b	1
#84cc16	1
#10b981	1
#14b8a6	1
#d946ef	1
rgba(15,23,42,0.16)	1
#1c1c1e	1
hsl(var(--table-row-divider)	1
rgba(0,0,0,0.03)	1
#2D8CFF	1
#f4f4f5	1
#fafafa	1
#e4e4e7	1
#71717a	1
#fcfcfb	1
#fafaf9	1
#f8f8f7	1
#f7f7f5	1
#f5f5f4	1
#f3f3f2	1
#f1f1ef	1
#efefed	1
#ededeb	1
#ebebe9	1
#e9e9e7	1
#e7e7e4	1
#764ba2	1
#28a745	1
#039	1
#f60	1
#069	1
rgba(102, 204, 0, 0.7)	1
#3B82F6	1
#10B981	1
#F59E0B	1
#EF4444	1
#8B5CF6	1
#EC4899	1
#06B6D4	1
#84CC16	1
#F97316	1
#6366F1	1
hsl(var(--background)	1
hsl(var(--foreground)	1
hsl(var(--card)	1
hsl(var(--card-foreground)	1
hsl(var(--popover)	1
hsl(var(--popover-foreground)	1
hsl(var(--primary)	1
hsl(var(--primary-foreground)	1
hsl(var(--secondary)	1
hsl(var(--secondary-foreground)	1
hsl(var(--muted)	1
hsl(var(--accent)	1
hsl(var(--accent-foreground)	1
hsl(var(--destructive)	1
hsl(var(--destructive-foreground)	1
hsl(var(--input)	1
hsl(var(--chart-1)	1
hsl(var(--chart-2)	1
hsl(var(--chart-3)	1
hsl(var(--chart-4)	1
hsl(var(--chart-5)	1
```
### Hardcoded Color Flags

These literal colors are not tokenized via `var(--*)` in-place and should be treated as hardcoded usage candidates:

| Color literal | Uses |
|---|---:|
| `rgb(89, 89, 89)` | 174 |
| `#595959` | 48 |
| `rgb(255, 255, 255)` | 44 |
| `rgb(0, 58, 250)` | 43 |
| `#111827` | 29 |
| `#ffffff` | 26 |
| `#6b7280` | 23 |
| `#f3f4f6` | 16 |
| `rgba(15,23,42,0.04)` | 14 |
| `#6366f1` | 12 |
| `rgba(15,23,42,0.12)` | 10 |
| `#333` | 9 |
| `#666` | 8 |
| `rgba(15,23,42,0.08)` | 8 |
| `#d1d5db` | 8 |
| `#9ca3af` | 8 |
| `rgba(15,23,42,0.05)` | 6 |
| `#e9ecef` | 6 |
| `#f9fafb` | 5 |
| `#ef4444` | 5 |
| `#f97316` | 5 |
| `#eab308` | 5 |
| `#22c55e` | 5 |
| `#06b6d4` | 5 |
| `#ec4899` | 5 |
| `#4b5563` | 5 |
| `#000000` | 4 |
| `#a855f7` | 4 |
| `#0ea5e9` | 4 |
| `rgba(0, 0, 0, 0.05)` | 4 |
| `#667eea` | 4 |
| `#FCB122` | 3 |
| `#ddd` | 3 |
| `rgba(15,23,42,0.06)` | 3 |
| `rgba(0,0,0,0.05)` | 3 |
| `rgba(16,24,40,0.06)` | 3 |
| `rgba(0,0,0,0.35)` | 3 |
| `rgba(0,0,0,0.4)` | 3 |
| `#3b82f6` | 3 |
| `#8b5cf6` | 3 |
| `#e5e7eb` | 3 |
| `#64748b` | 3 |
| `rgba(0, 0, 0, 0.03)` | 3 |
| `#09090b` | 3 |
| `#888` | 3 |
| `#4285F4` | 2 |
| `#34A853` | 2 |
| `#FBBC05` | 2 |
| `#EA4335` | 2 |
| `rgba(0, 0, 0, 0.1)` | 2 |
| `rgba(15,23,42,0.14)` | 2 |
| `rgba(15,23,42,0.1)` | 2 |
| `rgba(16,24,40,0.04)` | 2 |
| `rgba(15,23,42,0.03)` | 2 |
| `rgba(0,0,0,0.38)` | 2 |
| `rgb(10, 54, 90)` | 2 |
| `#23262b` | 2 |
| `rgb(250 250 250)` | 2 |
| `#52525b` | 2 |
| `#f8f9fa` | 2 |
| `#0B5CFF` | 1 |
| `#fff3cd` | 1 |
| `#999` | 1 |
| `#555` | 1 |
| `#2d5016` | 1 |
| `#f5efe7` | 1 |
| `rgba(255,255,255,0.96)` | 1 |
| `rgba(255,255,255,0.95)` | 1 |
| `#2d8cff` | 1 |
| `#EFE7E1` | 1 |
| `#E6DDD6` | 1 |
| `rgba(15,23,42,0.02)` | 1 |
| `rgba(16,24,40,0.05)` | 1 |
| `rgba(17,24,39,0.035)` | 1 |
| `rgba(17,24,39,0.03)` | 1 |
| `rgba(16,24,40,0.12)` | 1 |
| `rgba(15,23,42,0.07)` | 1 |
| `rgba(255,255,255,0.05)` | 1 |
| `rgba(0,0,0,0.45)` | 1 |
| `#3030F1` | 1 |
| `rgb(0, 0, 0)` | 1 |
| `#8a8f98` | 1 |
| `#b0b4bc` | 1 |
| `#152` | 1 |
| `#f59e0b` | 1 |
| `#84cc16` | 1 |
| `#10b981` | 1 |
| `#14b8a6` | 1 |
| `#d946ef` | 1 |
| `rgba(15,23,42,0.16)` | 1 |
| `#1c1c1e` | 1 |
| `rgba(0,0,0,0.03)` | 1 |
| `#2D8CFF` | 1 |
| `#f4f4f5` | 1 |
| `#fafafa` | 1 |
| `#e4e4e7` | 1 |
| `#71717a` | 1 |
| `#fcfcfb` | 1 |
| `#fafaf9` | 1 |
| `#f8f8f7` | 1 |
| `#f7f7f5` | 1 |
| `#f5f5f4` | 1 |
| `#f3f3f2` | 1 |
| `#f1f1ef` | 1 |
| `#efefed` | 1 |
| `#ededeb` | 1 |
| `#ebebe9` | 1 |
| `#e9e9e7` | 1 |
| `#e7e7e4` | 1 |
| `#764ba2` | 1 |
| `#28a745` | 1 |
| `#039` | 1 |
| `#f60` | 1 |
| `#069` | 1 |
| `rgba(102, 204, 0, 0.7)` | 1 |
| `#3B82F6` | 1 |
| `#10B981` | 1 |
| `#F59E0B` | 1 |
| `#EF4444` | 1 |
| `#8B5CF6` | 1 |
| `#EC4899` | 1 |
| `#06B6D4` | 1 |
| `#84CC16` | 1 |
| `#F97316` | 1 |
| `#6366F1` | 1 |

## 2. Typography Inventory

- Unique font-size classes: **44**
- Unique font-weight classes: **8**
- Unique line-height classes: **10**
- Unique letter-spacing classes: **20**
- Hardcoded font-size values: **4**
- Hardcoded line-height values: **4**
- Hardcoded font-family values: **1**

Font sizes:

```text
text-sm	559
text-xs	514
text-[11px]	207
text-[10px]	118
text-2xl	108
text-xl	104
text-[hsl(var(--chip-text))]	46
text-lg	44
text-[12px]	34
text-[13px]	24
text-[11.5px]	20
text-base	18
text-4xl	16
text-3xl	12
text-[15px]	10
text-[color:var(--program-text)]	8
text-[color:var(--program-muted)]	8
text-[9px]	7
text-[1em]	7
text-[14px]	6
text-[color:var(--program-subtle)]	6
text-[0.88em]	5
text-[0.72em]	4
text-[30px]	3
text-[8px]	3
text-[28px]	2
text-[24px]	2
text-[hsl(var(--chip-active-text))]	2
text-[22px]	2
text-[20px]	1
text-[#8a8f98]	1
text-[#b0b4bc]	1
text-6xl	1
text-[length:var(--builder-text-2xs)]	1
text-[length:var(--builder-text-sm)]	1
text-[hsl(var(--menu-text))]	1
text-[hsl(var(--menu-icon))]	1
text-[length:var(--builder-text-xs)]	1
text-[0.86em]	1
text-[0.68em]	1
text-[0.9em]	1
text-8xl	1
text-[18px]	1
text-[38px]	1
```
Font weights:

```text
font-medium	418
font-semibold	258
font-bold	140
font-mono	44
font-normal	44
font-light	2
font-serif	2
font-thin	1
```
Line heights:

```text
leading-none	59
leading-relaxed	39
leading-tight	14
leading-7	6
leading-snug	6
leading-6	5
leading-[1.08]	2
leading-[1.02]	2
leading-[1.75]	1
leading-5	1
```
Letter spacing:

```text
tracking-wider	81
tracking-[0.2em]	72
tracking-tight	52
tracking-widest	12
tracking-[0.14em]	8
tracking-[0.02em]	7
tracking-wide	7
tracking-[-0.02em]	5
tracking-[-0.04em]	4
tracking-[-0.03em]	4
tracking-tighter	4
tracking-normal	2
tracking-[0.12em]	2
tracking-[-0.05em]	2
tracking-[-0.01em]	2
tracking-[0.06em]	1
tracking-[0.18em]	1
tracking-[0.16em]	1
tracking-[0.15em]	1
tracking-[0.08em]	1
```

Hardcoded typography values:

```text
10pt	5
11pt	1
var(--program-title-size)	1
var(--program-section-title-size)	1
```
```text
400	2
500	4
600	2
700	3
var(--program-item-weight)	6
var(--program-section-weight)	2
var(--program-title-weight)	1
```
```text
1.6	4
1.25	1
1.4	1
var(--program-line-height)	1
```
```text
Inter	1
```
### Inconsistency Flags

- Effective type scales detected from class combinations: **103** (target should be 1).
- Multiple custom arbitrary text sizes (`text-[10px]`, `text-[11px]`, `text-[11.5px]`, etc.) indicate divergent scales.
- Conflicting semantic + color misuse exists (e.g., `text-[hsl(var(--chip-text))]` counted in size slot).

| Top type-scale combination | Uses |
|---|---:|
| `text-(none) | leading-(default) | tracking-(default)` | 6345 |
| `text-sm | leading-(default) | tracking-(default)` | 535 |
| `text-xs | leading-(default) | tracking-(default)` | 458 |
| `text-[11px] | leading-(default) | tracking-(default)` | 105 |
| `text-xl | leading-(default) | tracking-(default)` | 94 |
| `text-2xl | leading-(default) | tracking-(default)` | 90 |
| `text-[10px] | leading-(default) | tracking-(default)` | 74 |
| `text-[11px] | leading-(default) | tracking-[0.2em]` | 70 |
| `text-lg | leading-(default) | tracking-(default)` | 41 |
| `text-[10px] | leading-(default) | tracking-wider` | 37 |
| `text-xs | leading-(default) | tracking-wider` | 36 |
| `text-[12px] | leading-(default) | tracking-(default)` | 33 |
| `text-(none) | leading-relaxed | tracking-(default)` | 27 |
| `text-[hsl(var(--chip-text))] | leading-none | tracking-(default)` | 22 |
| `text-[11px] | leading-none | tracking-(default)` | 21 |
| `text-[13px] | leading-(default) | tracking-(default)` | 20 |
| `text-[11.5px] | leading-(default) | tracking-(default)` | 20 |
| `text-2xl | leading-(default) | tracking-tight` | 17 |
| `text-base | leading-(default) | tracking-(default)` | 16 |
| `text-4xl | leading-(default) | tracking-tight` | 15 |

## 3. Spacing Inventory

- Unique padding utilities: **95**
- Unique margin utilities: **60**
- Unique gap utilities: **19**
- Unique space-x/space-y utilities: **18**
- Arbitrary spacing utilities: **6**

Padding values:

```text
p-4	132
px-4	122
py-1.5	114
px-2.5	111
py-4	107
px-2	104
py-2	89
px-3	85
py-3	83
px-6	72
py-1	68
p-3	64
pb-2	62
p-2	61
p-0	56
py-0.5	53
px-5	49
p-6	47
p-8	45
py-8	36
pb-3	33
p-1	30
pt-4	29
pl-6	27
px-1.5	25
py-2.5	23
pt-2	18
pt-3	18
py-12	15
pb-6	14
px-1	14
py-5	14
pt-1	13
pl-9	12
py-6	11
p-12	11
pl-8	10
pt-3.5	9
px-3.5	9
pb-4	9
px-8	8
p-5	8
pb-3.5	7
pb-8	7
py-16	7
pt-6	6
pr-12	6
py-0	6
pb-1	6
pr-3	6
p-0.5	6
pl-5	5
p-2.5	5
px-0	5
pr-8	4
pb-2.5	4
p-1.5	4
pt-0	4
pt-5	3
pt-8	3
pr-4	3
px-0.5	3
pr-2	3
pl-2	3
pr-1	3
pl-10	3
pt-12	2
py-10	2
pb-0	2
pl-1	2
pl-7	2
pr-6	2
px-[var(--program-card-padding-x)]	2
py-[var(--program-card-padding-y)]	2
py-24	2
py-7	2
pt-0.5	2
p-3.5	1
pt-16	1
pl-20	1
pb-px	1
pb-5	1
pl-14	1
pl-3	1
pt-32	1
pb-16	1
pr-5	1
pl-4	1
pb-0"	1
pb-1.5	1
pl-12	1
pr-9	1
pt-px	1
px-[18px]	1
py-3.5	1
```
Margin values:

```text
mr-2	240
mb-2	165
mb-4	107
mx-auto	79
mt-0.5	67
mb-10	63
mt-1	62
mr-1	50
ml-2	47
mt-2	46
mt-4	44
mb-3	42
mb-1	34
mt-3	30
ml-1	28
ml-auto	26
mb-6	24
mb-8	18
mr-1.5	18
my-10	15
mt-6	12
ml-4	6
mt-8	6
mr-3	6
mb-5	5
mb-1.5	5
m-0	5
mt-1.5	5
mb-20	5
mx-1	4
ml-8	4
mt-10	3
mt-5	3
mt-20	3
my-8	2
ml-6	2
mt-auto	2
mx-0.5	2
mt-0	2
mt-16	2
mt-0.5"	2
my-3	2
mt-2.5	2
mr-4	1
my-6	1
my-4	1
mr-0.5	1
mx-4	1
mb-12	1
ml-5	1
mb-16	1
ml-3	1
ml-1.5	1
mx-3	1
mx-1.5	1
mt-px	1
my-0.5	1
mx-2	1
mt-[1px]	1
ml-0.5	1
```
Gap values:

```text
gap-2	419
gap-3	132
gap-1.5	114
gap-4	112
gap-1	104
gap-6	15
gap-0	11
gap-2.5	8
gap-5	8
gap-8	8
gap-0.5	8
gap-x-4	2
gap-y-2	2
gap-x-2	2
gap-x-5	2
gap-y-8	2
gap-px	1
gap-y-4	1
gap-y-1	1
```
Space values:

```text
space-y-2	310
space-y-4	130
space-y-1	109
space-y-3	102
space-y-1.5	78
space-y-6	66
space-x-2	25
space-y-8	24
space-y-0.5	23
space-y-0	7
space-y-5	7
space-y-2.5	3
space-y-12	2
space-x-1	2
space-x-1.5	2
space-y-10	1
space-y-[var(--program-section-gap)]	1
space-y-[var(--program-item-gap)]	1
```
Outside/default-scale candidates (arbitrary values):

```text
px-[var(--program-card-padding-x)]	2
py-[var(--program-card-padding-y)]	2
space-y-[var(--program-section-gap)]	1
space-y-[var(--program-item-gap)]	1
mt-[1px]	1
px-[18px]	1
```
- Card-like containers use multiple paddings (`p-3`, `p-4`, `p-6`, `p-8`, `p-12`) across features.

## 4. Border & Radius Inventory

- Unique radius utilities: **21**
- Unique border-width utilities: **4**
- Unique border-color utilities: **71**

Radius values:

```text
rounded-full	272
rounded-lg	152
rounded-md	81
rounded-sm	79
rounded	55
rounded-none	24
rounded-2xl	14
rounded-xl	13
rounded-[28px]	4
rounded-[16px]	4
rounded-[18px]	4
rounded-[24px]	3
rounded-[20px]	2
rounded-[14px]	2
rounded-[var(--program-radius)]	2
rounded-b-lg	1
rounded-t-sm	1
rounded-[10px]	1
rounded-[26px]	1
rounded-[22px]	1
rounded-[inherit]	1
```
Border width values:

```text
border	399
border-0	14
border-2	9
border-4	1
```
Border color values:

```text
border-border/60	133
border-[hsl(var(--chip-border))]	68
border-border/50	49
border-zinc-700	35
border-neutral-200	28
border-control	27
border-zinc-800	25
border-border	23
border-input	19
border-dashed	17
border-border/40	17
border-primary	15
border-neutral-100	15
border-border/70	13
border-primary/10	10
border-neutral-300	10
border-border/80	8
border-border/55	8
border-amber-200	8
border-border/45	7
border-rose-200	7
border-l-2	5
border-primary/20	4
border-green-200	4
border-none	4
border-border/30	3
border-destructive/30	3
border-transparent	3
border-slate-200	3
border-blue-100	3
border-gray-100	3
border-white/60	3
border-destructive	2
border-red-200	2
border-destructive/20	2
border-blue-200	2
border-t-2	2
border-blue-500	2
border-yellow-100	2
border-white/40	2
border-border/65	2
border-b-2	1
border-green-100	1
border-destructive/50	1
border-button-primary	1
border-gray-200	1
border-zinc-700/50	1
border-amber-200/80	1
border-blue-300	1
border-indigo-200	1
border-red-500	1
border-primary/30	1
border-t-0	1
border-muted-foreground/20	1
border-amber-200/60	1
border-b-0	1
border-[hsl(var(--accent-warm)/0.7)]	1
border-neutral-900	1
border-x-[6px]	1
border-x-transparent	1
border-b-[6px]	1
border-b-foreground	1
border-[color:hsl(var(--program-control-panel-border))]	1
border-foreground	1
border-muted/50	1
border-[color:var(--program-border)]	1
border-black/10	1
border-black	1
border-chrome	1
border-muted	1
border-amber-300	1
```
- Inconsistency: cards/dialogs mix `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, and many arbitrary pixel radii.

## 5. Shadow Inventory

- Unique shadow utility values: **25**
- Unique inline/CSS box-shadow literals: **2**

Shadow utilities:

```text
shadow-none	38
shadow-sm	25
shadow-lg	15
shadow-[0_1px_0_rgba(15,23,42,0.04)]	11
shadow-xl	11
shadow-[0_10px_30px_rgba(15,23,42,0.12)]	7
shadow-xs	4
shadow-[0_12px_28px_rgba(15,23,42,0.14)]	2
shadow-[0_10px_24px_rgba(15,23,42,0.12)]	2
shadow-[0_14px_28px_rgba(15,23,42,0.05)]	2
shadow-primary/10	2
shadow-[0_1px_0_rgba(15,23,42,0.06)]	1
shadow-gray-200/50	1
shadow-builder-header	1
shadow-[0_12px_30px_rgba(15,23,42,0.06)]	1
shadow-2xl	1
shadow-[0_12px_24px_rgba(15,23,42,0.08)]	1
shadow-[0_1px_2px_rgba(15,23,42,0.03)]	1
shadow-[0_20px_50px_rgba(15,23,42,0.05)]	1
shadow-sm'	1
shadow-md	1
shadow-[0_12px_24px_rgba(15,23,42,0.05)]	1
shadow-[0_20px_50px_rgba(15,23,42,0.04)]	1
shadow-[0_28px_80px_rgba(15,23,42,0.16)]	1
shadow-[0_16px_34px_rgba(15,23,42,0.05)]	1
```
Box-shadow literal values:

```text
var(--program-card-shadow)	4
var(--shadow-program-content-inset)	1
```
- Inconsistency: multiple arbitrary shadow recipes coexist with tokenized shadows (`--shadow-*`).

## 6. Icon Usage

- Icon libraries imported:
  - `lucide-react` (309 importing files)
- Mixed libraries: not detected in audited scope (no `react-icons`, `@heroicons`, or phosphor imports in use).
- Unique icon size utility tokens: **50**
- Files with inline SVG markup: **12**
- Unique referenced SVG assets: **5**

Icon size tokens:

```text
h-4	939
w-4	849
h-3	251
w-3	240
h-8	197
h-5	129
w-8	105
h-9	83
w-5	76
h-6	73
h-7	68
w-6	50
h-10	46
w-20	36
w-16	33
w-7	32
w-10	31
w-24	29
w-12	28
h-12	22
w-28	21
w-32	18
w-48	17
h-16	16
w-56	16
h-11	13
w-64	13
w-9	11
h-32	10
h-2	10
w-40	9
w-44	9
w-2	9
w-36	7
w-14	7
w-80	6
h-14	5
h-24	4
h-20	3
w-72	2
w-11	2
w-1	2
w-52	2
h-48	2
h-1	2
h-40	1
h-0	1
w-0	1
h-72	1
w-60	1
```
- Consistency note: dominant icon sizes are `h-4 w-4`, then `h-3 w-3` and `h-5 w-5`; long tail exists.

## 7. Component Pattern Inventory

### Pattern Coverage (files touching each pattern)

| Pattern | Files |
|---|---:|
| button | 199 |
| input | 145 |
| card | 58 |
| modal | 95 |
| table | 31 |
| dropdown | 96 |
| sidebar | 3 |
| navigation | 10 |

### Button Variants


```text
ghost	197
outline	189
secondary	16
destructive	7
default	1
link	1
```
Button sizes:

```text
sm	211
icon	124
lg	3
```

### Notes by Pattern

- Buttons: at least 6 variants (`ghost`, `outline`, `secondary`, `destructive`, `default`, `link`) and 3 explicit sizes (`sm`, `icon`, `lg`).
- Inputs: multiple primitives (`input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`) plus feature-specific wrappers.
- Cards: shared `Card` plus many custom `*Card` components with divergent padding/radius/shadow.
- Modals: mixed `Dialog`, `AlertDialog`, `Sheet`, and custom `*Modal`/`*Drawer` patterns.
- Tables: shared table primitives plus domain-specific tables (`meetings`, `tasks`, `discussions`, `announcements`, `forms`, `participants`).
- Dropdowns: mix of `DropdownMenu`, `Select`, `Popover`, `Command` patterns.
- Sidebar/navigation: dashboard shell uses `AppSidebar`; legal/public/auth routes use separate top-level nav/header structures.

### Same-Purpose Different-Look Flags

- Auth screens use neutral tokenized surfaces, while admin uses hardcoded zinc dark theme classes.
- Dialog-like interactions are split across `Dialog`, `Sheet`, `Drawer`, and custom modals with inconsistent radius/shadow/spacing.
- Table shells vary between tokenized borders and feature-specific custom border/background combinations.

## 8. Layout Patterns

### Layout Structures Identified

1. Root shell (`src/app/layout.tsx`): global font + toast container.
2. Dashboard shell (`src/app/(dashboard)/layout.tsx` + `DashboardShell`): sidebar + app island/content container.
3. Meetings hub sub-shell (`src/app/(dashboard)/meetings/layout.tsx`): wraps content in `MeetingsHubShell`.
4. Calendar hub sub-shell (`src/app/(dashboard)/calendar/layout.tsx`): tab bar + scroll content.
5. Admin shell (`src/app/(admin)/admin/layout.tsx`): dark split-pane sidebar/content.
6. Auth shell (`src/app/(auth)/layout.tsx`): centered single-column card flow.
7. Legal shell (`src/app/(legal)/layout.tsx`): sticky header + centered document container + footer.
8. Public shell (`src/app/(public)/layout.tsx`): minimal content + footer branding.
9. Print shell (`src/app/(print)/layout.tsx`): print-first white canvas with print-specific pages.

- Consistent app shell exists for the dashboard route group.
- Pages that deviate from dominant dashboard shell: all auth/admin/legal/public/print/root pages, plus dashboard conduct print mode (`/meetings/[id]/conduct`) with dedicated print stylesheet.

## Appendix

### A. Scan Scope Manifest

- Total files in audit scope: 704
```text
public/images/beespo-logo-full.svg
public/images/beespo-logo-icon.svg
public/images/beespo-white-logo-full.svg
public/images/home-church.svg
public/images/lds-hymns.svg
public/logos/zoom-wordmark.svg
src/app/(admin)/admin/auth/callback/route.ts
src/app/(admin)/admin/dashboard/page.tsx
src/app/(admin)/admin/invitations/actions.ts
src/app/(admin)/admin/invitations/page.tsx
src/app/(admin)/admin/layout.tsx
src/app/(admin)/admin/login/page.tsx
src/app/(admin)/admin/mfa/setup/page.tsx
src/app/(admin)/admin/mfa/verify/page.tsx
src/app/(admin)/admin/release-notes/[id]/edit/page.tsx
src/app/(admin)/admin/release-notes/actions.ts
src/app/(admin)/admin/release-notes/new/page.tsx
src/app/(admin)/admin/release-notes/page.tsx
src/app/(admin)/admin/templates/[id]/edit/page.tsx
src/app/(admin)/admin/templates/actions.ts
src/app/(admin)/admin/templates/new/page.tsx
src/app/(admin)/admin/templates/page.tsx
src/app/(admin)/admin/users/actions.ts
src/app/(admin)/admin/users/page.tsx
src/app/(auth)/check-email/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/layout.tsx
src/app/(auth)/login/login-client.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/mfa/setup/page.tsx
src/app/(auth)/mfa/verify/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/verified/page.tsx
src/app/(dashboard)/apps/apps-client.tsx
src/app/(dashboard)/apps/page.tsx
src/app/(dashboard)/calendar/events/page.tsx
src/app/(dashboard)/calendar/layout.tsx
src/app/(dashboard)/calendar/loading.tsx
src/app/(dashboard)/calendar/page.tsx
src/app/(dashboard)/calendar/view/page.tsx
src/app/(dashboard)/callings/callings-page-client.tsx
src/app/(dashboard)/callings/loading.tsx
src/app/(dashboard)/callings/page.tsx
src/app/(dashboard)/changelog/page.tsx
src/app/(dashboard)/dashboard/home-greeting.tsx
src/app/(dashboard)/dashboard/loading.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/error.tsx
src/app/(dashboard)/forms/[id]/form-edit-client.tsx
src/app/(dashboard)/forms/[id]/page.tsx
src/app/(dashboard)/forms/[id]/results/page.tsx
src/app/(dashboard)/forms/[id]/results/results-charts.tsx
src/app/(dashboard)/forms/[id]/results/results-dashboard-client.tsx
src/app/(dashboard)/forms/forms-client.tsx
src/app/(dashboard)/forms/loading.tsx
src/app/(dashboard)/forms/new/page.tsx
src/app/(dashboard)/forms/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/meetings/[id]/conduct/page.tsx
src/app/(dashboard)/meetings/[id]/conduct/print.css
src/app/(dashboard)/meetings/[id]/edit/page.tsx
src/app/(dashboard)/meetings/[id]/page.tsx
src/app/(dashboard)/meetings/agendas/loading.tsx
src/app/(dashboard)/meetings/agendas/page.tsx
src/app/(dashboard)/meetings/announcements/[id]/page.tsx
src/app/(dashboard)/meetings/announcements/loading.tsx
src/app/(dashboard)/meetings/announcements/new/page.tsx
src/app/(dashboard)/meetings/announcements/page.tsx
src/app/(dashboard)/meetings/business/loading.tsx
src/app/(dashboard)/meetings/business/new/page.tsx
src/app/(dashboard)/meetings/business/page.tsx
src/app/(dashboard)/meetings/directory/page.tsx
src/app/(dashboard)/meetings/discussions/[id]/page.tsx
src/app/(dashboard)/meetings/discussions/loading.tsx
src/app/(dashboard)/meetings/discussions/new/page.tsx
src/app/(dashboard)/meetings/discussions/page.tsx
src/app/(dashboard)/meetings/layout.tsx
src/app/(dashboard)/meetings/new/page.tsx
src/app/(dashboard)/meetings/page.tsx
src/app/(dashboard)/meetings/participants/page.tsx
src/app/(dashboard)/meetings/speakers/page.tsx
src/app/(dashboard)/notebooks/[notebookId]/notes/[noteId]/page.tsx
src/app/(dashboard)/notebooks/[notebookId]/page.tsx
src/app/(dashboard)/notebooks/page.tsx
src/app/(dashboard)/notes/page.tsx
src/app/(dashboard)/participants/directory-client.tsx
src/app/(dashboard)/participants/loading.tsx
src/app/(dashboard)/participants/page.tsx
src/app/(dashboard)/settings/page.tsx
src/app/(dashboard)/settings/settings-client.tsx
src/app/(dashboard)/speakers/[id]/edit/page.tsx
src/app/(dashboard)/speakers/[id]/page.tsx
src/app/(dashboard)/speakers/loading.tsx
src/app/(dashboard)/speakers/new/page.tsx
src/app/(dashboard)/speakers/page.tsx
src/app/(dashboard)/tables/[id]/page.tsx
src/app/(dashboard)/tables/[id]/table-detail-client.tsx
src/app/(dashboard)/tables/loading.tsx
src/app/(dashboard)/tables/new/page.tsx
src/app/(dashboard)/tables/page.tsx
src/app/(dashboard)/tables/tables-client.tsx
src/app/(dashboard)/tasks/loading.tsx
src/app/(dashboard)/tasks/page.tsx
src/app/(dashboard)/tasks/tasks-client.tsx
src/app/(dashboard)/templates/library/actions.ts
src/app/(dashboard)/templates/library/loading.tsx
src/app/(dashboard)/templates/library/page.tsx
src/app/(dashboard)/templates/new/page.tsx
src/app/(legal)/docs/billing-and-plans/page.tsx
src/app/(legal)/docs/building-an-agenda/page.tsx
src/app/(legal)/docs/connecting-zoom/page.tsx
src/app/(legal)/docs/creating-a-meeting/page.tsx
src/app/(legal)/docs/creating-your-account/page.tsx
src/app/(legal)/docs/creating-zoom-meetings/page.tsx
src/app/(legal)/docs/deleting-your-account/page.tsx
src/app/(legal)/docs/disconnecting-zoom/page.tsx
src/app/(legal)/docs/inviting-team-members/page.tsx
src/app/(legal)/docs/managing-your-profile/page.tsx
src/app/(legal)/docs/managing-zoom-meetings/page.tsx
src/app/(legal)/docs/page.tsx
src/app/(legal)/docs/setting-up-your-workspace/page.tsx
src/app/(legal)/docs/sharing-your-agenda/page.tsx
src/app/(legal)/docs/using-templates/page.tsx
src/app/(legal)/docs/workspace-settings/page.tsx
src/app/(legal)/layout.tsx
src/app/(legal)/privacy/page.tsx
src/app/(legal)/support/page.tsx
src/app/(legal)/support/support-form.tsx
src/app/(legal)/terms/page.tsx
src/app/(print)/layout.tsx
src/app/(print)/meetings/[id]/print/page.tsx
src/app/(print)/meetings/[id]/print/print-trigger.tsx
src/app/(print)/shared/[token]/print/page.tsx
src/app/(public)/[workspace-slug]/[template-slug]/page.tsx
src/app/(public)/[workspace-slug]/meeting/[id]/live-meeting-view.tsx
src/app/(public)/[workspace-slug]/meeting/[id]/page.tsx
src/app/(public)/[workspace-slug]/program/[id]/page.tsx
src/app/(public)/f/[id]/page.tsx
src/app/(public)/f/[id]/public-form-client.tsx
src/app/(public)/layout.tsx
src/app/(public)/shared/[token]/page.tsx
src/app/accept-invite/page.tsx
src/app/actions/waitlist.ts
src/app/api/account/delete/preflight/route.ts
src/app/api/account/delete/route.ts
src/app/api/apps/[slug]/route.ts
src/app/api/apps/canva/authorize/route.ts
src/app/api/apps/canva/callback/route.ts
src/app/api/apps/canva/disconnect/route.ts
src/app/api/apps/canva/token/route.ts
src/app/api/apps/route.ts
src/app/api/auth/zoom/authorize/route.ts
src/app/api/auth/zoom/callback/route.ts
src/app/api/auth/zoom/disconnect/route.ts
src/app/api/calendar/convert/route.ts
src/app/api/calendar/cron-sync/route.ts
src/app/api/calendar/sync/route.ts
src/app/api/canva/designs/[designId]/export/route.ts
src/app/api/canva/designs/[designId]/save/route.ts
src/app/api/canva/designs/route.ts
src/app/api/canva/exports/[exportId]/route.ts
src/app/api/cron/meeting-reminders/route.ts
src/app/api/cron/notification-digest/route.ts
src/app/api/events/[id]/route.ts
src/app/api/events/route.ts
src/app/api/invitations/[id]/route.ts
src/app/api/invitations/accept/route.ts
src/app/api/invitations/route.ts
src/app/api/meetings/[id]/pdf/route.tsx
src/app/api/meetings/[id]/zoom/invite/route.ts
src/app/api/meetings/[id]/zoom/route.ts
src/app/api/mfa/trust-device/route.ts
src/app/api/onboarding/complete/route.ts
src/app/api/platform-invitations/consume/route.ts
src/app/api/platform-invitations/validate/route.ts
src/app/api/share/[meetingId]/analytics/route.ts
src/app/api/share/[meetingId]/settings/route.ts
src/app/api/share/[meetingId]/track-view/route.ts
src/app/api/share/activity/route.ts
src/app/api/share/export/route.ts
src/app/api/share/invite/[token]/route.ts
src/app/api/share/invite/route.ts
src/app/api/share/meeting/route.ts
src/app/api/share/recent/route.ts
src/app/api/sharing-groups/[groupId]/members/route.ts
src/app/api/sharing-groups/[groupId]/route.ts
src/app/api/sharing-groups/route.ts
src/app/api/support/create-ticket/route.ts
src/app/api/support/my-tickets/route.ts
src/app/api/support/tickets/[key]/comments/route.ts
src/app/api/support/tickets/[key]/route.ts
src/app/api/tables/[id]/columns/route.ts
src/app/api/tables/[id]/route.ts
src/app/api/tables/[id]/rows/route.ts
src/app/api/tables/[id]/views/route.ts
src/app/api/tables/route.ts
src/app/api/team/[id]/route.ts
src/app/api/team/transfer/route.ts
src/app/api/webhooks/zoom/deauthorize/route.ts
src/app/api/workspace-apps/[appId]/route.ts
src/app/api/workspace-apps/route.ts
src/app/api/workspace-invitations/validate/route.ts
src/app/api/workspace/promote-admin/route.ts
src/app/auth/callback/route.ts
src/app/auth/confirm/route.ts
src/app/error.tsx
src/app/global-error.tsx
src/app/globals.css
src/app/layout.tsx
src/app/not-found.tsx
src/app/onboarding/page.tsx
src/app/page.tsx
src/app/tasks/action/page.tsx
src/app/welcome/page.tsx
src/components/admin/admin-sidebar.tsx
src/components/admin/idle-timer-provider.tsx
src/components/admin/invitations/create-invitation-dialog.tsx
src/components/admin/invitations/invitations-data-table.tsx
src/components/admin/mfa/totp-input.tsx
src/components/admin/release-notes/release-note-editor.tsx
src/components/admin/release-notes/release-notes-data-table.tsx
src/components/admin/templates/admin-templates-layout.tsx
src/components/admin/templates/builder/admin-template-builder.tsx
src/components/admin/users/invite-user-dialog.tsx
src/components/admin/users/users-data-table.tsx
src/components/announcements/announcement-drawer.tsx
src/components/announcements/announcement-quick-actions.tsx
src/components/announcements/announcements-client.tsx
src/components/announcements/announcements-filters.tsx
src/components/announcements/announcements-table.tsx
src/components/apps/add-app-button.tsx
src/components/apps/app-card.tsx
src/components/apps/app-detail-modal.tsx
src/components/apps/connected-apps-list.tsx
src/components/apps/index.ts
src/components/auth/change-password-form.tsx
src/components/auth/delete-account-dialog.tsx
src/components/auth/google-oauth-button.tsx
src/components/auth/invite-code-input.tsx
src/components/auth/terms-content.tsx
src/components/auth/terms-of-service-dialog.tsx
src/components/business/business-client.tsx
src/components/business/business-drawer.tsx
src/components/business/business-filters.tsx
src/components/business/business-item-form.tsx
src/components/business/business-quick-actions.tsx
src/components/business/business-table.tsx
src/components/calendar/add-subscription-form.tsx
src/components/calendar/calendar-client.tsx
src/components/calendar/calendar-event-chip.tsx
src/components/calendar/calendar-settings-dialog.tsx
src/components/calendar/calendar-sidebar.tsx
src/components/calendar/calendar-toolbar.tsx
src/components/calendar/calendar-types.ts
src/components/calendar/create-event-dialog.tsx
src/components/calendar/events/event-detail-drawer.tsx
src/components/calendar/events/events-list-client.tsx
src/components/calendar/events/index.ts
src/components/calendar/external-event-preview.tsx
src/components/calendar/hub/calendar-hub-shell.tsx
src/components/calendar/hub/calendar-tabs.tsx
src/components/calendar/hub/index.ts
src/components/calendar/recurrence-picker.tsx
src/components/calendar/subscription-list.tsx
src/components/calendar/views/agenda-view.tsx
src/components/calendar/views/day-view.tsx
src/components/calendar/views/month-view.tsx
src/components/calendar/views/week-view.tsx
src/components/callings/calling-board-card.tsx
src/components/callings/calling-card.tsx
src/components/callings/calling-detail-drawer.tsx
src/components/callings/calling-detail-modal.tsx
src/components/callings/calling-process-stepper.tsx
src/components/callings/callings-client.tsx
src/components/callings/callings-kanban-board.tsx
src/components/callings/callings-pipeline.tsx
src/components/callings/candidate-autocomplete.tsx
src/components/callings/candidate-pool-card.tsx
src/components/callings/consideration-pool-card.tsx
src/components/callings/index.ts
src/components/callings/pipeline-action-center.tsx
src/components/callings/pipeline-row.tsx
src/components/callings/pipeline-stage-list.tsx
src/components/callings/pipeline-status-bar.tsx
src/components/canva/design-invitation-button.tsx
src/components/canva/design-invitation-modal.tsx
src/components/canva/event-designs-list.tsx
src/components/canva/event-reference-panel.tsx
src/components/canva/export-progress.tsx
src/components/canva/index.ts
src/components/command-palette/command-palette.tsx
src/components/command-palette/index.ts
src/components/common/create-view-dialog.tsx
src/components/conduct/conductor-view.tsx
src/components/conduct/global-timer.tsx
src/components/conduct/item-timer.tsx
src/components/conduct/notes-editor.tsx
src/components/conduct/print-view.tsx
src/components/conduct/scribe-view.tsx
src/components/conduct/share-dialog.tsx
src/components/conduct/timer-progress.tsx
src/components/conduct/timestamp-button.tsx
src/components/conduct/view-toggle.tsx
src/components/dashboard/app-sidebar.tsx
src/components/dashboard/breadcrumbs.tsx
src/components/dashboard/dashboard-shell.tsx
src/components/dashboard/grid/customize-drawer.tsx
src/components/dashboard/grid/dashboard-grid.tsx
src/components/dashboard/grid/droppable-column.tsx
src/components/dashboard/grid/sortable-widget.tsx
src/components/dashboard/mission-control.tsx
src/components/dashboard/mobile-nav-context.tsx
src/components/dashboard/navigation-store-hydrator.tsx
src/components/dashboard/sidebar-apps-section.tsx
src/components/dashboard/sidebar-favorites-section.tsx
src/components/dashboard/sidebar-nav-collapsible.tsx
src/components/dashboard/sidebar-nav-item.tsx
src/components/dashboard/sidebar-nav-section.tsx
src/components/dashboard/sidebar-saved-items-section.tsx
src/components/dashboard/sidebar-types.ts
src/components/dashboard/sidebar-user-profile.tsx
src/components/dashboard/widgets/calling-pipeline-widget.tsx
src/components/dashboard/widgets/forms-widget.tsx
src/components/dashboard/widgets/kpi-active-discussions-widget.tsx
src/components/dashboard/widgets/kpi-calling-fill-rate-widget.tsx
src/components/dashboard/widgets/kpi-card.tsx
src/components/dashboard/widgets/kpi-meeting-readiness-widget.tsx
src/components/dashboard/widgets/mini-sparkline.tsx
src/components/dashboard/widgets/my-tasks-widget.tsx
src/components/dashboard/widgets/notebooks-widget.tsx
src/components/dashboard/widgets/quick-actions-widget.tsx
src/components/dashboard/widgets/tables-widget.tsx
src/components/dashboard/widgets/team-workload-widget.tsx
src/components/dashboard/widgets/upcoming-meetings-widget.tsx
src/components/dashboard/widgets/widget-card.tsx
src/components/dashboard/widgets/widget-error-fallback.tsx
src/components/discussions/discussion-activity-section.tsx
src/components/discussions/discussion-detail-view.tsx
src/components/discussions/discussion-drawer.tsx
src/components/discussions/discussion-notes-section.tsx
src/components/discussions/discussion-tasks-section.tsx
src/components/discussions/discussions-client.tsx
src/components/discussions/discussions-filters.tsx
src/components/discussions/discussions-table.tsx
src/components/events/event-dialog.tsx
src/components/events/events-client.tsx
src/components/events/events-table.tsx
src/components/forms/builder/field-editor.tsx
src/components/forms/builder/field-item.tsx
src/components/forms/builder/form-builder.tsx
src/components/forms/builder/live-preview.tsx
src/components/forms/builder/types.ts
src/components/forms/form-renderer.tsx
src/components/forms/forms-table.tsx
src/components/forms/share-form-modal.tsx
src/components/landing/abstract-interface.tsx
src/components/landing/animate-on-scroll.tsx
src/components/landing/benefit-grid.tsx
src/components/landing/cta-section.tsx
src/components/landing/dashboard-preview.tsx
src/components/landing/editorial-card.tsx
src/components/landing/faq-section.tsx
src/components/landing/feature-calendar.tsx
src/components/landing/feature-kanban.tsx
src/components/landing/feature-notes.tsx
src/components/landing/feature-section.tsx
src/components/landing/feature-table.tsx
src/components/landing/feature-tasks.tsx
src/components/landing/feature-toggle.tsx
src/components/landing/footer.tsx
src/components/landing/hero.tsx
src/components/landing/nav.tsx
src/components/landing/waitlist-form.tsx
src/components/meetings/add-item-dialog.tsx
src/components/meetings/add-meeting-item-dialog.tsx
src/components/meetings/agenda-builder.tsx
src/components/meetings/agenda-editor.tsx
src/components/meetings/agenda-item-list.tsx
src/components/meetings/builder/agenda-canvas.tsx
src/components/meetings/builder/announcement-selector-popover.tsx
src/components/meetings/builder/business-selector-popover.tsx
src/components/meetings/builder/create-item-type-dialog.tsx
src/components/meetings/builder/discussion-selector-popover.tsx
src/components/meetings/builder/draggable-toolbox-item.tsx
src/components/meetings/builder/hymn-selector-popover.tsx
src/components/meetings/builder/icon-picker.tsx
src/components/meetings/builder/index.ts
src/components/meetings/builder/item-properties-panel.tsx
src/components/meetings/builder/meeting-builder.tsx
src/components/meetings/builder/meeting-context-bar.tsx
src/components/meetings/builder/mode-switcher.tsx
src/components/meetings/builder/participant-selector-popover.tsx
src/components/meetings/builder/print-preview-pane.tsx
src/components/meetings/builder/program-mode-pane.tsx
src/components/meetings/builder/properties-pane.tsx
src/components/meetings/builder/speaker-selector-popover.tsx
src/components/meetings/builder/toolbox-pane.tsx
src/components/meetings/builder/types.ts
src/components/meetings/container-agenda-item.tsx
src/components/meetings/create-speaker-dialog.tsx
src/components/meetings/create-view-dialog.tsx
src/components/meetings/editable/agenda-group-row.tsx
src/components/meetings/editable/agenda-item-divider.tsx
src/components/meetings/editable/editable-agenda-item-list.tsx
src/components/meetings/editable/hymn-popover.tsx
src/components/meetings/editable/index.ts
src/components/meetings/editable/inline-combobox.tsx
src/components/meetings/editable/inline-input.tsx
src/components/meetings/editable/participant-popover.tsx
src/components/meetings/hub/index.ts
src/components/meetings/hub/meetings-hub-shell.tsx
src/components/meetings/hymn-selector-modal.tsx
src/components/meetings/markdown-renderer.tsx
src/components/meetings/meeting-composer.tsx
src/components/meetings/meeting-dashboard-actions.tsx
src/components/meetings/meeting-detail-content.tsx
src/components/meetings/meeting-favorite-button.tsx
src/components/meetings/meeting-pdf-document.tsx
src/components/meetings/meeting-row-actions.tsx
src/components/meetings/meeting-share-badge.tsx
src/components/meetings/meeting-status-badge.tsx
src/components/meetings/meeting-type-badge.tsx
src/components/meetings/meetings-client.tsx
src/components/meetings/meetings-filters.tsx
src/components/meetings/meetings-table.tsx
src/components/meetings/preview-modal.tsx
src/components/meetings/program/program-agenda-item.tsx
src/components/meetings/program/program-container-section.tsx
src/components/meetings/program/program-footer.tsx
src/components/meetings/program/program-header.tsx
src/components/meetings/program/program-roles-grid.tsx
src/components/meetings/program/program-structural-item.tsx
src/components/meetings/program/program-style.ts
src/components/meetings/program/program-view.tsx
src/components/meetings/program/types.ts
src/components/meetings/sidebar/action-toolbar.tsx
src/components/meetings/sidebar/collapsible-details.tsx
src/components/meetings/sidebar/index.ts
src/components/meetings/sidebar/meeting-actions.tsx
src/components/meetings/sidebar/meeting-context-panel.tsx
src/components/meetings/sidebar/meeting-sidebar.tsx
src/components/meetings/speaker-selector.tsx
src/components/meetings/unified-selector-modal.tsx
src/components/meetings/validation-modal.tsx
src/components/meetings/zoom-meeting-sheet.tsx
src/components/mfa/mfa-setup.tsx
src/components/mfa/mfa-verify.tsx
src/components/mfa/totp-input.tsx
src/components/navigation/favorite-button.tsx
src/components/navigation/recent-visit-tracker.tsx
src/components/notebooks/create-notebook-modal.tsx
src/components/notebooks/notebook-card.tsx
src/components/notebooks/notebook-grid.tsx
src/components/notebooks/notebook-library.tsx
src/components/notes/editor.tsx
src/components/notes/linked-notes-list.tsx
src/components/notes/note-editor.tsx
src/components/notes/notes-list.tsx
src/components/notifications/notification-bell.tsx
src/components/onboarding/onboarding-layout.tsx
src/components/onboarding/pill-selector.tsx
src/components/onboarding/wizard-footer.tsx
src/components/participants/create-directory-view-dialog.tsx
src/components/participants/create-tag-dialog.tsx
src/components/participants/directory-table.tsx
src/components/participants/manage-tags-dialog.tsx
src/components/participants/participant-drawer.tsx
src/components/participants/tag-filter-dropdown.tsx
src/components/participants/tag-picker.tsx
src/components/pathfinder/recovery-hub.tsx
src/components/release-notes/changelog-view.tsx
src/components/release-notes/release-note-modal.tsx
src/components/settings/member-search-input.tsx
src/components/settings/mfa-settings.tsx
src/components/settings/notification-preferences-tab.tsx
src/components/settings/sharing-group-card.tsx
src/components/settings/sharing-group-form.tsx
src/components/settings/sharing-groups-tab.tsx
src/components/share/export-tab.tsx
src/components/share/guest-view-preview.tsx
src/components/share/index.ts
src/components/share/invitations-list.tsx
src/components/share/invite-tab.tsx
src/components/share/public-link-tab.tsx
src/components/share/recipient-search.tsx
src/components/share/save-as-group-prompt.tsx
src/components/share/share-activity-log.tsx
src/components/share/share-analytics.tsx
src/components/share/share-recipients-tab.tsx
src/components/share/sharing-with-list.tsx
src/components/speakers/speaker-drawer.tsx
src/components/speakers/speaker-quick-actions.tsx
src/components/speakers/speakers-client.tsx
src/components/speakers/speakers-filters.tsx
src/components/speakers/speakers-table.tsx
src/components/support/request-history.tsx
src/components/support/support-modal.tsx
src/components/support/ticket-detail.tsx
src/components/tables/builder/column-config-panel.tsx
src/components/tables/builder/column-type-picker.tsx
src/components/tables/builder/table-builder.tsx
src/components/tables/dialogs/add-column-dialog.tsx
src/components/tables/dialogs/delete-column-dialog.tsx
src/components/tables/dialogs/edit-column-dialog.tsx
src/components/tables/dialogs/recover-column-dialog.tsx
src/components/tables/hooks/use-inline-editing.ts
src/components/tables/hooks/use-table-data.ts
src/components/tables/index.ts
src/components/tables/renderer/cells/checkbox-cell.tsx
src/components/tables/renderer/cells/date-cell.tsx
src/components/tables/renderer/cells/index.ts
src/components/tables/renderer/cells/multi-select-cell.tsx
src/components/tables/renderer/cells/number-cell.tsx
src/components/tables/renderer/cells/select-cell.tsx
src/components/tables/renderer/cells/text-cell.tsx
src/components/tables/renderer/cells/user-link-cell.tsx
src/components/tables/renderer/table-cell.tsx
src/components/tables/renderer/table-header.tsx
src/components/tables/renderer/table-renderer.tsx
src/components/tables/renderer/table-row.tsx
src/components/tables/tables-list-table.tsx
src/components/tables/toolbar/column-visibility.tsx
src/components/tables/toolbar/filter-builder.tsx
src/components/tables/toolbar/sort-builder.tsx
src/components/tables/toolbar/table-toolbar.tsx
src/components/tables/toolbar/view-switcher.tsx
src/components/tasks/create-task-dialog.tsx
src/components/tasks/task-actions-menu.tsx
src/components/tasks/task-card.tsx
src/components/tasks/task-completion-dialog.tsx
src/components/tasks/task-details-sheet.tsx
src/components/tasks/task-filters.tsx
src/components/tasks/task-labels-dialog.tsx
src/components/tasks/task-status-dropdown.tsx
src/components/tasks/tasks-table.tsx
src/components/team/invite-member-dialog.tsx
src/components/team/pending-invitations.tsx
src/components/team/team-members-list.tsx
src/components/templates/add-template-item-dialog.tsx
src/components/templates/builder/index.ts
src/components/templates/builder/template-builder-page.tsx
src/components/templates/builder/template-canvas.tsx
src/components/templates/builder/template-metadata-header.tsx
src/components/templates/builder/types.ts
src/components/templates/library/template-library-card.tsx
src/components/templates/library/template-library-client.tsx
src/components/templates/library/template-preview-dialog.tsx
src/components/templates/library/types.ts
src/components/templates/template-agenda-preview.tsx
src/components/templates/template-builder.tsx
src/components/templates/template-selector.tsx
src/components/templates/types.ts
src/components/ui/accordion.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/auto-save-textarea.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/button.tsx
src/components/ui/calendar.tsx
src/components/ui/card.tsx
src/components/ui/checkbox.tsx
src/components/ui/collapsible.tsx
src/components/ui/command.tsx
src/components/ui/data-table-header.tsx
src/components/ui/dialog.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/form.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/pagination-controls.tsx
src/components/ui/popover.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/rich-text-editor.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/skeleton.tsx
src/components/ui/status-indicator.tsx
src/components/ui/switch.tsx
src/components/ui/table-row-action-trigger.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/tag-chip.tsx
src/components/ui/tags-input.tsx
src/components/ui/textarea.tsx
src/components/ui/toast-container.tsx
src/components/ui/toast-pill.tsx
src/components/ui/toggle.tsx
src/components/ui/tooltip.tsx
src/components/ui/zoom-icon.tsx
src/hooks/use-hotkeys.ts
src/hooks/use-is-mobile.ts
src/hooks/use-live-meeting.ts
src/hooks/use-sidebar-state.ts
src/hooks/use-timer.ts
src/hooks/use-workspace-apps.ts
src/instrumentation-client.ts
src/instrumentation.ts
src/lib/actions/auth-actions.ts
src/lib/actions/calling-actions.ts
src/lib/actions/dashboard-actions.ts
src/lib/actions/directory-tag-actions.ts
src/lib/actions/discussion-actions.ts
src/lib/actions/form-actions.ts
src/lib/actions/meeting-actions.ts
src/lib/actions/navigation-actions.ts
src/lib/actions/notification-actions.ts
src/lib/actions/release-notes-actions.ts
src/lib/actions/sharing-group-actions.ts
src/lib/actions/table-actions.ts
src/lib/actions/task-actions.ts
src/lib/admin-auth.ts
src/lib/agenda-export-utils.tsx
src/lib/agenda-grouping.ts
src/lib/agenda-views.ts
src/lib/announcement-helpers.ts
src/lib/business-helpers.ts
src/lib/business-script-generator.ts
src/lib/calendar-helpers.ts
src/lib/calendar-sync-service.ts
src/lib/calling-utils.ts
src/lib/canva/canva-client.ts
src/lib/canva/pkce.ts
src/lib/canva/token-manager.ts
src/lib/conduct/notes-service.ts
src/lib/dashboard/data-fetchers.ts
src/lib/dashboard/widget-registry.ts
src/lib/directory-views.ts
src/lib/email/resend.ts
src/lib/email/send-admin-platform-invite-email.ts
src/lib/email/send-invite-email.ts
src/lib/email/send-meeting-share-email.ts
src/lib/email/send-share-notification-email.ts
src/lib/email/send-task-email.ts
src/lib/email/send-zoom-invite-email.ts
src/lib/email/templates.ts
src/lib/encryption.ts
src/lib/forms/schema-to-zod.ts
src/lib/generate-meeting-markdown.ts
src/lib/ical-parser.ts
src/lib/map-agenda-to-program-items.ts
src/lib/meeting-helpers.ts
src/lib/mfa.ts
src/lib/navigation/breadcrumb-config.ts
src/lib/navigation/types.ts
src/lib/navigation/user-navigation.ts
src/lib/notebooks/notebook-covers.ts
src/lib/notifications/constants.ts
src/lib/notifications/types.ts
src/lib/onboarding/constants.ts
src/lib/onboarding/filters.ts
src/lib/onboarding/validation.ts
src/lib/rate-limiter.ts
src/lib/sacrament-prayers.ts
src/lib/services/access-control/index.ts
src/lib/services/access-control/invite-code-generator.ts
src/lib/services/access-control/invite-validation.service.ts
src/lib/services/access-control/types.ts
src/lib/share/distribution-engine.ts
src/lib/share/fingerprint.ts
src/lib/share/index.ts
src/lib/share/sanitize-public-data.ts
src/lib/slug-helpers.ts
src/lib/speaker-helpers.ts
src/lib/supabase/admin.ts
src/lib/supabase/cached-queries.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/table-views.ts
src/lib/tables/filter-rows.ts
src/lib/tables/index.ts
src/lib/tables/sort-rows.ts
src/lib/tables/validate-cell.ts
src/lib/toast.ts
src/lib/url/app-url.ts
src/lib/utils.ts
src/lib/waitlist/validation.ts
src/lib/zoom/token-manager.ts
src/middleware.ts
src/stores/apps-store.ts
src/stores/canva-store.ts
src/stores/command-palette-store.ts
src/stores/conduct-meeting-store.ts
src/stores/favorites-store.ts
src/stores/navigation-store.ts
src/stores/share-dialog-store.ts
src/stores/tables-store.ts
src/types/agenda.ts
src/types/apps.ts
src/types/canva.ts
src/types/dashboard.ts
src/types/database.ts
src/types/editorjs-modules.d.ts
src/types/form-types.ts
src/types/onboarding.ts
src/types/release-notes.ts
src/types/share.ts
src/types/table-types.ts
src/types/zoom.ts
tailwind.config.ts
```

### B. Route Manifest (95 routes)

```text
src/app/(admin)/admin/dashboard/page.tsx
src/app/(admin)/admin/invitations/page.tsx
src/app/(admin)/admin/login/page.tsx
src/app/(admin)/admin/mfa/setup/page.tsx
src/app/(admin)/admin/mfa/verify/page.tsx
src/app/(admin)/admin/release-notes/[id]/edit/page.tsx
src/app/(admin)/admin/release-notes/new/page.tsx
src/app/(admin)/admin/release-notes/page.tsx
src/app/(admin)/admin/templates/[id]/edit/page.tsx
src/app/(admin)/admin/templates/new/page.tsx
src/app/(admin)/admin/templates/page.tsx
src/app/(admin)/admin/users/page.tsx
src/app/(auth)/check-email/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/mfa/setup/page.tsx
src/app/(auth)/mfa/verify/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/verified/page.tsx
src/app/(dashboard)/apps/page.tsx
src/app/(dashboard)/calendar/events/page.tsx
src/app/(dashboard)/calendar/page.tsx
src/app/(dashboard)/calendar/view/page.tsx
src/app/(dashboard)/callings/page.tsx
src/app/(dashboard)/changelog/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/forms/[id]/page.tsx
src/app/(dashboard)/forms/[id]/results/page.tsx
src/app/(dashboard)/forms/new/page.tsx
src/app/(dashboard)/forms/page.tsx
src/app/(dashboard)/meetings/[id]/conduct/page.tsx
src/app/(dashboard)/meetings/[id]/edit/page.tsx
src/app/(dashboard)/meetings/[id]/page.tsx
src/app/(dashboard)/meetings/agendas/page.tsx
src/app/(dashboard)/meetings/announcements/[id]/page.tsx
src/app/(dashboard)/meetings/announcements/new/page.tsx
src/app/(dashboard)/meetings/announcements/page.tsx
src/app/(dashboard)/meetings/business/new/page.tsx
src/app/(dashboard)/meetings/business/page.tsx
src/app/(dashboard)/meetings/directory/page.tsx
src/app/(dashboard)/meetings/discussions/[id]/page.tsx
src/app/(dashboard)/meetings/discussions/new/page.tsx
src/app/(dashboard)/meetings/discussions/page.tsx
src/app/(dashboard)/meetings/new/page.tsx
src/app/(dashboard)/meetings/page.tsx
src/app/(dashboard)/meetings/participants/page.tsx
src/app/(dashboard)/meetings/speakers/page.tsx
src/app/(dashboard)/notebooks/[notebookId]/notes/[noteId]/page.tsx
src/app/(dashboard)/notebooks/[notebookId]/page.tsx
src/app/(dashboard)/notebooks/page.tsx
src/app/(dashboard)/notes/page.tsx
src/app/(dashboard)/participants/page.tsx
src/app/(dashboard)/settings/page.tsx
src/app/(dashboard)/speakers/[id]/edit/page.tsx
src/app/(dashboard)/speakers/[id]/page.tsx
src/app/(dashboard)/speakers/new/page.tsx
src/app/(dashboard)/speakers/page.tsx
src/app/(dashboard)/tables/[id]/page.tsx
src/app/(dashboard)/tables/new/page.tsx
src/app/(dashboard)/tables/page.tsx
src/app/(dashboard)/tasks/page.tsx
src/app/(dashboard)/templates/library/page.tsx
src/app/(dashboard)/templates/new/page.tsx
src/app/(legal)/docs/billing-and-plans/page.tsx
src/app/(legal)/docs/building-an-agenda/page.tsx
src/app/(legal)/docs/connecting-zoom/page.tsx
src/app/(legal)/docs/creating-a-meeting/page.tsx
src/app/(legal)/docs/creating-your-account/page.tsx
src/app/(legal)/docs/creating-zoom-meetings/page.tsx
src/app/(legal)/docs/deleting-your-account/page.tsx
src/app/(legal)/docs/disconnecting-zoom/page.tsx
src/app/(legal)/docs/inviting-team-members/page.tsx
src/app/(legal)/docs/managing-your-profile/page.tsx
src/app/(legal)/docs/managing-zoom-meetings/page.tsx
src/app/(legal)/docs/page.tsx
src/app/(legal)/docs/setting-up-your-workspace/page.tsx
src/app/(legal)/docs/sharing-your-agenda/page.tsx
src/app/(legal)/docs/using-templates/page.tsx
src/app/(legal)/docs/workspace-settings/page.tsx
src/app/(legal)/privacy/page.tsx
src/app/(legal)/support/page.tsx
src/app/(legal)/terms/page.tsx
src/app/(print)/meetings/[id]/print/page.tsx
src/app/(print)/shared/[token]/print/page.tsx
src/app/(public)/[workspace-slug]/[template-slug]/page.tsx
src/app/(public)/[workspace-slug]/meeting/[id]/page.tsx
src/app/(public)/[workspace-slug]/program/[id]/page.tsx
src/app/(public)/f/[id]/page.tsx
src/app/(public)/shared/[token]/page.tsx
src/app/accept-invite/page.tsx
src/app/onboarding/page.tsx
src/app/page.tsx
src/app/tasks/action/page.tsx
src/app/welcome/page.tsx
```

### C. Route -> Primary Component Map

```text
src/app/(admin)/admin/dashboard/page.tsx	(none)
src/app/(admin)/admin/invitations/page.tsx	@/components/admin/invitations/invitations-data-table, @/components/admin/invitations/create-invitation-dialog
src/app/(admin)/admin/login/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/card
src/app/(admin)/admin/mfa/setup/page.tsx	@/components/ui/button, @/components/ui/card, @/components/admin/mfa/totp-input
src/app/(admin)/admin/mfa/verify/page.tsx	@/components/ui/card, @/components/admin/mfa/totp-input
src/app/(admin)/admin/release-notes/[id]/edit/page.tsx	@/components/admin/release-notes/release-note-editor
src/app/(admin)/admin/release-notes/new/page.tsx	@/components/admin/release-notes/release-note-editor
src/app/(admin)/admin/release-notes/page.tsx	@/components/admin/release-notes/release-notes-data-table, @/components/ui/button
src/app/(admin)/admin/templates/[id]/edit/page.tsx	@/components/admin/templates/builder/admin-template-builder, @/components/templates/types
src/app/(admin)/admin/templates/new/page.tsx	@/components/admin/templates/builder/admin-template-builder
src/app/(admin)/admin/templates/page.tsx	@/components/admin/templates/admin-templates-layout, @/components/ui/button
src/app/(admin)/admin/users/page.tsx	@/components/admin/users/users-data-table, @/components/admin/users/invite-user-dialog
src/app/(auth)/check-email/page.tsx	@/components/ui/button, @/components/ui/card
src/app/(auth)/forgot-password/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/card
src/app/(auth)/login/page.tsx	(none)
src/app/(auth)/mfa/setup/page.tsx	@/components/mfa/mfa-setup
src/app/(auth)/mfa/verify/page.tsx	@/components/mfa/mfa-verify
src/app/(auth)/reset-password/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/card
src/app/(auth)/signup/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/checkbox, @/components/auth/terms-of-service-dialog, @/components/auth/invite-code-input, @/components/ui/card, @/components/ui/separator, @/components/ui/alert
src/app/(auth)/verified/page.tsx	@/components/ui/button, @/components/ui/card
src/app/(dashboard)/apps/page.tsx	(none)
src/app/(dashboard)/calendar/events/page.tsx	@/components/calendar/events
src/app/(dashboard)/calendar/page.tsx	(none)
src/app/(dashboard)/calendar/view/page.tsx	@/components/calendar/calendar-client
src/app/(dashboard)/callings/page.tsx	(none)
src/app/(dashboard)/changelog/page.tsx	@/components/release-notes/changelog-view
src/app/(dashboard)/dashboard/page.tsx	(none)
src/app/(dashboard)/forms/[id]/page.tsx	(none)
src/app/(dashboard)/forms/[id]/results/page.tsx	(none)
src/app/(dashboard)/forms/new/page.tsx	@/components/ui/button, @/components/forms/builder/form-builder
src/app/(dashboard)/forms/page.tsx	(none)
src/app/(dashboard)/meetings/[id]/conduct/page.tsx	@/components/ui/button, @/components/conduct/conductor-view, @/components/conduct/global-timer, @/components/conduct/share-dialog, @/components/conduct/print-view
src/app/(dashboard)/meetings/[id]/edit/page.tsx	(none)
src/app/(dashboard)/meetings/[id]/page.tsx	@/components/meetings/builder
src/app/(dashboard)/meetings/agendas/page.tsx	@/components/meetings/meetings-client
src/app/(dashboard)/meetings/announcements/[id]/page.tsx	@/components/ui/button, @/components/ui/badge, @/components/ui/card, @/components/announcements/announcement-quick-actions
src/app/(dashboard)/meetings/announcements/new/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/textarea, @/components/ui/checkbox, @/components/ui/badge, @/components/ui/card, @/components/ui/select
src/app/(dashboard)/meetings/announcements/page.tsx	@/components/announcements/announcements-client
src/app/(dashboard)/meetings/business/new/page.tsx	@/components/ui/button, @/components/business/business-item-form
src/app/(dashboard)/meetings/business/page.tsx	@/components/business/business-client
src/app/(dashboard)/meetings/directory/page.tsx	(none)
src/app/(dashboard)/meetings/discussions/[id]/page.tsx	@/components/discussions/discussion-detail-view
src/app/(dashboard)/meetings/discussions/new/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/textarea, @/components/ui/checkbox, @/components/ui/badge, @/components/ui/card, @/components/ui/select
src/app/(dashboard)/meetings/discussions/page.tsx	@/components/discussions/discussions-client
src/app/(dashboard)/meetings/new/page.tsx	@/components/meetings/builder
src/app/(dashboard)/meetings/page.tsx	(none)
src/app/(dashboard)/meetings/participants/page.tsx	(none)
src/app/(dashboard)/meetings/speakers/page.tsx	(none)
src/app/(dashboard)/notebooks/[notebookId]/notes/[noteId]/page.tsx	@/components/notes/note-editor
src/app/(dashboard)/notebooks/[notebookId]/page.tsx	@/components/dashboard/breadcrumbs, @/components/ui/button, @/components/ui/input, @/components/ui/dropdown-menu, @/components/ui/alert-dialog, @/components/navigation/favorite-button, @/components/navigation/recent-visit-tracker
src/app/(dashboard)/notebooks/page.tsx	@/components/notebooks/notebook-library
src/app/(dashboard)/notes/page.tsx	(none)
src/app/(dashboard)/participants/page.tsx	(none)
src/app/(dashboard)/settings/page.tsx	(none)
src/app/(dashboard)/speakers/[id]/edit/page.tsx	(none)
src/app/(dashboard)/speakers/[id]/page.tsx	(none)
src/app/(dashboard)/speakers/new/page.tsx	(none)
src/app/(dashboard)/speakers/page.tsx	(none)
src/app/(dashboard)/tables/[id]/page.tsx	(none)
src/app/(dashboard)/tables/new/page.tsx	@/components/tables/builder/table-builder
src/app/(dashboard)/tables/page.tsx	(none)
src/app/(dashboard)/tasks/page.tsx	(none)
src/app/(dashboard)/templates/library/page.tsx	@/components/templates/library/template-library-client, @/components/templates/library/types
src/app/(dashboard)/templates/new/page.tsx	@/components/templates/builder/template-builder-page
src/app/(legal)/docs/billing-and-plans/page.tsx	(none)
src/app/(legal)/docs/building-an-agenda/page.tsx	(none)
src/app/(legal)/docs/connecting-zoom/page.tsx	(none)
src/app/(legal)/docs/creating-a-meeting/page.tsx	(none)
src/app/(legal)/docs/creating-your-account/page.tsx	(none)
src/app/(legal)/docs/creating-zoom-meetings/page.tsx	(none)
src/app/(legal)/docs/deleting-your-account/page.tsx	(none)
src/app/(legal)/docs/disconnecting-zoom/page.tsx	(none)
src/app/(legal)/docs/inviting-team-members/page.tsx	(none)
src/app/(legal)/docs/managing-your-profile/page.tsx	(none)
src/app/(legal)/docs/managing-zoom-meetings/page.tsx	(none)
src/app/(legal)/docs/page.tsx	(none)
src/app/(legal)/docs/setting-up-your-workspace/page.tsx	(none)
src/app/(legal)/docs/sharing-your-agenda/page.tsx	(none)
src/app/(legal)/docs/using-templates/page.tsx	(none)
src/app/(legal)/docs/workspace-settings/page.tsx	(none)
src/app/(legal)/privacy/page.tsx	(none)
src/app/(legal)/support/page.tsx	(none)
src/app/(legal)/terms/page.tsx	@/components/auth/terms-content
src/app/(print)/meetings/[id]/print/page.tsx	@/components/meetings/markdown-renderer
src/app/(print)/shared/[token]/print/page.tsx	@/components/meetings/markdown-renderer
src/app/(public)/[workspace-slug]/[template-slug]/page.tsx	(none)
src/app/(public)/[workspace-slug]/meeting/[id]/page.tsx	(none)
src/app/(public)/[workspace-slug]/program/[id]/page.tsx	@/components/meetings/program/program-view, @/components/meetings/program/types, @/components/meetings/program/program-style
src/app/(public)/f/[id]/page.tsx	(none)
src/app/(public)/shared/[token]/page.tsx	@/components/meetings/markdown-renderer
src/app/accept-invite/page.tsx	@/components/ui/button, @/components/ui/card
src/app/onboarding/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/select, @/components/onboarding/pill-selector, @/components/onboarding/wizard-footer
src/app/page.tsx	@/components/landing/nav, @/components/landing/hero, @/components/landing/benefit-grid, @/components/landing/feature-section, @/components/landing/faq-section, @/components/landing/cta-section, @/components/landing/footer
src/app/tasks/action/page.tsx	@/components/ui/button, @/components/ui/card
src/app/welcome/page.tsx	@/components/ui/button, @/components/ui/input, @/components/ui/label, @/components/ui/card
```

### D. Extraction Notes

- Utilities/classes were extracted from static `className` strings and inline style literals.
- Dynamic runtime class composition may undercount some token usages.
- A small number of malformed class tokens in source (e.g., trailing quotes) are included as-is to preserve exact inventory output.
