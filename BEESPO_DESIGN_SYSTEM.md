# Beespo Design System — Agent Instructions

> **Purpose**: This document is the single source of truth for all UI/UX decisions in Beespo. Every new feature, component, or page MUST conform to these guidelines. When in doubt, reference this document. When this document doesn't cover something, reference Intercom's product UI as the tiebreaker.

> **Target tools**: Claude Code, Codex, or any AI agent with full codebase access.

---

## Table of Contents

1. [Design Reference](#1-design-reference)
2. [Phase 1 — Design Audit](#2-phase-1--design-audit)
3. [Phase 2 — Design Tokens & System](#3-phase-2--design-tokens--system)
4. [Phase 3 — App Shell Implementation](#4-phase-3--app-shell-implementation)
5. [Phase 4 — Component Standardization](#5-phase-4--component-standardization)
6. [Phase 5 — Migration Playbook](#6-phase-5--migration-playbook)
7. [Rules for New Features](#7-rules-for-new-features)

---

## 1. Design Reference

**Primary reference**: [Intercom](https://intercom.com) — their product app (not marketing site).

Beespo's visual identity should feel like a product in the same family as Intercom: clean, professional, spacious, confident use of whitespace, and quietly opinionated about hierarchy.

### Intercom Design Principles We Adopt

1. **Consistency over novelty** — Use existing patterns from the design system. Favor common interaction patterns over clever bespoke optimizations. Never introduce similar-yet-different variations of existing patterns.
2. **Progressive disclosure** — Start with simple defaults and gradually reveal flexibility. Optimize for the most common use case. Don't overwhelm users by showing full flexibility right away.
3. **Anchor and scan** — Anchor the most important part of any interface and use varying styles/layouts to balance design and make it easy to scan. Use a grid system. Pay close attention to alignment.
4. **Clear hierarchy** — Every screen has ONE primary action, a clear visual focal point, and a predictable structure. Use spacing, weight, and color to direct attention — not decoration.
5. **Language is design** — Be clear and concise. When necessary, progressively reveal information with tooltips and links. Avoid walls of text.

### Intercom Visual DNA

| Attribute | Intercom Pattern | Beespo Adaptation |
|-----------|-----------------|-------------------|
| Primary color | Blue Ribbon `#0057FF` | Define Beespo's primary brand color (see tokens below) |
| Backgrounds | Clean white canvas, light gray secondary surfaces | Same approach |
| Typography | System font stack / TT Norms Pro for brand | System font stack for app UI (see tokens) |
| Navigation | Left sidebar with icon+label, collapsible, secondary nav per section | Same three-panel layout |
| Density | Comfortable — generous padding, not cramped | Same |
| Iconography | Consistent icon set, uniform weight/size, no mixing of styles | Pick ONE icon library, use ONE weight |
| Borders/Dividers | Subtle `1px` borders, light gray, used sparingly | Same |
| Radius | Small consistent radius (`6-8px`), never mixed | Same |
| Shadows | Minimal — used for elevation (modals, dropdowns), not decoration | Same |
| Motion | Subtle, functional transitions. No gratuitous animation | Same |

---

## 2. Phase 1 — Design Audit

### Objective
Crawl the entire Beespo codebase and produce a comprehensive report of every design inconsistency. This is the diagnostic step — do NOT change any code.

### Prompt

```
You are auditing the Beespo codebase for design inconsistencies. Scan every file in the
project and produce a report with the following sections. Do not modify any files.

## Audit Report Sections

### 1. Color Inventory
- List EVERY unique color value used across the codebase (hex, rgb, hsl, Tailwind classes, CSS variables)
- Group by category: text colors, background colors, border colors, accent/brand colors
- Flag any color that is NOT defined as a Tailwind config value or CSS variable (i.e., hardcoded)
- Count how many unique text colors, background colors, and border colors exist
- Identify the most-used colors vs. one-off colors

### 2. Typography Inventory
- List every unique font-family, font-size, font-weight, line-height, and letter-spacing used
- Map them to Tailwind classes vs. hardcoded values
- Flag inconsistencies: e.g., are headings using 5 different size combinations?
- Identify how many "type scales" effectively exist (there should be ONE)

### 3. Spacing Inventory
- List every unique padding, margin, and gap value
- Flag any spacing values outside the Tailwind default scale
- Identify patterns: are cards using 3 different padding values?

### 4. Border & Radius Inventory
- List every unique border-radius, border-width, and border-color
- Flag inconsistencies (e.g., some cards use rounded-lg, others rounded-xl, others rounded-md)

### 5. Shadow Inventory
- List every unique box-shadow value
- Flag inconsistencies

### 6. Icon Usage
- Which icon libraries are imported? (lucide-react, heroicons, react-icons, SVG files, etc.)
- Are multiple icon libraries mixed?
- What sizes are icons rendered at? Is it consistent?

### 7. Component Pattern Inventory
- List every "pattern" used for: buttons, inputs, cards, modals, tables, dropdowns, sidebars, navigation
- For each, note how many VARIANTS exist across the codebase
- Flag components that serve the same purpose but look different

### 8. Layout Patterns
- How many different page layout structures exist?
- Is there a consistent app shell (sidebar + header + content)?
- Which pages deviate from the dominant layout?

Output this as a structured markdown file called DESIGN_AUDIT.md
```

---

## 3. Phase 2 — Design Tokens & System

### Objective
Based on the audit, define the canonical design tokens. Create a Tailwind configuration and a reusable token system that becomes the law of the land.

### Color Palette

Adapt these to Beespo's brand. Use Intercom's structure as the framework:

```
/* --- Brand --- */
--color-primary:         <Beespo primary>;       /* Main CTA, active states, links */
--color-primary-hover:   <darker shade>;
--color-primary-light:   <tinted background for selected states>;

/* --- Neutrals (Intercom-style) --- */
--color-gray-50:   #FAFAFA;   /* Page background */
--color-gray-100:  #F5F5F5;   /* Secondary surfaces, sidebar bg */
--color-gray-200:  #E5E5E5;   /* Borders, dividers */
--color-gray-300:  #D4D4D4;   /* Disabled borders */
--color-gray-400:  #A3A3A3;   /* Placeholder text */
--color-gray-500:  #737373;   /* Secondary text */
--color-gray-600:  #525252;   /* Body text */
--color-gray-700:  #404040;   /* Headings */
--color-gray-900:  #171717;   /* Primary text */

/* --- Semantic --- */
--color-success:   #16A34A;
--color-warning:   #EAB308;
--color-error:     #DC2626;
--color-info:      <primary>;

/* --- Surfaces --- */
--color-bg-page:       var(--color-gray-50);
--color-bg-card:       #FFFFFF;
--color-bg-sidebar:    var(--color-gray-100);
--color-bg-hover:      var(--color-gray-100);
--color-bg-selected:   var(--color-primary-light);
```

### Typography Scale

Use a system font stack for the app. ONE scale, no exceptions:

```
/* Font family */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

/* Type scale — use ONLY these sizes */
--text-xs:    0.75rem;    /* 12px — captions, metadata, timestamps */
--text-sm:    0.875rem;   /* 14px — secondary text, table cells, form labels */
--text-base:  1rem;       /* 16px — body text, primary content */
--text-lg:    1.125rem;   /* 18px — section headers, card titles */
--text-xl:    1.25rem;    /* 20px — page sub-headers */
--text-2xl:   1.5rem;     /* 24px — page titles */

/* Font weights — use ONLY these */
--font-normal:   400;     /* Body text */
--font-medium:   500;     /* Emphasis, labels, nav items */
--font-semibold: 600;     /* Headings, buttons */

/* Line heights */
--leading-tight:  1.25;   /* Headings */
--leading-normal: 1.5;    /* Body */
--leading-relaxed: 1.625; /* Long-form text */
```

### Spacing Scale

Map to Tailwind defaults. Use ONLY these:

```
4px  (1)   — tight internal padding (icon gaps)
8px  (2)   — default gap between inline elements
12px (3)   — input padding, small card padding
16px (4)   — standard component padding
20px (5)   — comfortable component padding
24px (6)   — section padding, card body padding
32px (8)   — page section spacing
40px (10)  — major section breaks
48px (12)  — page-level vertical rhythm
64px (16)  — large layout spacing
```

### Borders & Radius

```
--radius-sm:   4px;       /* Badges, small elements */
--radius-md:   6px;       /* Buttons, inputs, cards (DEFAULT — use this most) */
--radius-lg:   8px;       /* Modals, larger containers */
--radius-full: 9999px;    /* Avatars, pills */

--border-default: 1px solid var(--color-gray-200);
```

### Shadows

```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.05);                         /* Subtle lift */
--shadow-md:   0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05);  /* Cards, dropdowns */
--shadow-lg:   0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04); /* Modals */
```

### Iconography

```
- Library: Pick ONE — lucide-react (recommended) or heroicons
- Default size: 16px for inline, 20px for navigation, 24px for empty states
- Stroke width: 1.5px (or the library default — NEVER mix)
- Color: currentColor (inherits from text color)
- NEVER mix icon libraries. NEVER use raw SVGs when the chosen library has the icon.
```

### Prompt

```
Using the DESIGN_AUDIT.md report and the design token definitions in BEESPO_DESIGN_SYSTEM.md,
do the following:

1. Update tailwind.config.ts to encode ALL design tokens:
   - colors (using CSS variables for theme-ability)
   - fontSize scale (only the defined sizes)
   - fontFamily
   - borderRadius
   - boxShadow
   - spacing (extend only if needed)

2. Create a globals.css (or update the existing one) that defines all CSS variables
   listed in the design system.

3. Create a file called DESIGN_TOKENS.md at the project root that documents every
   token with its name, value, and usage context — this is developer-facing documentation.

4. Ensure the Tailwind config DISABLES any default values that conflict with the
   design system (e.g., if we say "only these 6 font sizes", the config should reflect that).

Do NOT yet migrate existing components. Only set up the infrastructure.
```

---

## 4. Phase 3 — App Shell Implementation

### Objective
Build the persistent app layout that every page renders inside. This is the skeleton that never changes across routes.

### App Shell Structure (Intercom Model)

```
┌──────────────────────────────────────────────────────────┐
│ ┌─────────┬──────────────┬──────────────────────────────┐ │
│ │         │              │                              │ │
│ │  NAV    │  SECONDARY   │       CONTENT AREA           │ │
│ │ SIDEBAR │   NAV /      │                              │ │
│ │         │   LIST       │  (Page-specific content)     │ │
│ │ (fixed) │  (context-   │                              │ │
│ │         │   dependent) │                              │ │
│ │  56-64px│  240-280px   │  Remaining width             │ │
│ │  wide   │  wide        │                              │ │
│ │         │              │  ┌────────────────────────┐  │ │
│ │ Icons + │  Section-    │  │   Page Header          │  │ │
│ │ labels  │  specific    │  │   (title + actions)    │  │ │
│ │         │  sub-nav     │  ├────────────────────────┤  │ │
│ │         │              │  │                        │  │ │
│ │         │              │  │   Page Body            │  │ │
│ │         │              │  │                        │  │ │
│ │         │              │  └────────────────────────┘  │ │
│ └─────────┴──────────────┴──────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Navigation Sidebar Spec

- **Width**: 56–64px collapsed (icon only), 220px expanded (icon + label)
- **Background**: `var(--color-bg-sidebar)` — light gray, NOT the brand color
- **Position**: Fixed left, full viewport height
- **Items**: Icon (20px) + Label (text-sm, font-medium), vertically stacked or horizontal depending on collapse state
- **Active state**: `var(--color-bg-selected)` background + `var(--color-primary)` text/icon
- **Hover state**: `var(--color-bg-hover)` background
- **Dividers**: Thin `1px` gray line between nav groups
- **Bottom section**: User avatar/menu, settings link
- **Collapse behavior**: User-togglable, remembers preference

### Secondary Nav / List Panel

- **Width**: 240–280px, optional per section
- **Use cases**: Inbox-style list views, sub-navigation within a section (e.g., Settings categories), filter panels
- **Background**: White
- **Border**: Right border `var(--border-default)`

### Content Area

- **Background**: `var(--color-bg-page)` or white
- **Max width**: Content should have a max-width constraint for readability (e.g., `max-w-5xl` centered, or full-width for data-heavy views like tables)
- **Page Header**: Every page has a consistent header with: page title (`text-2xl`, `font-semibold`), optional breadcrumbs, and primary action button(s) aligned right
- **Padding**: `24px` horizontal, `24px` top

### Card-Not-Bento Shell Rules (Required)

To match Intercom's app structure, the desktop workspace MUST be rendered as **independent cards on a shared canvas**, not as one subdivided/bento container.

- **Global canvas**: `var(--color-bg-page)`
- **Desktop inset**: `12px` around workspace (`p-3`)
- **Inter-card gap**: `12px` (`gap-3`)
- **Secondary panel**: standalone card, `240–280px` wide, `rounded-lg`, `border`, `bg-card`, `shadow-sm`, `overflow-hidden`
- **Main content pane**: standalone card, fills remaining width, same treatment as secondary panel (`rounded-lg`, `border`, `bg-card`, `shadow-sm`, `overflow-hidden`)
- **Both cards share identical radius, border, and shadow tokens**
- **Do not visually fuse the secondary + main pane into one surface**

Desktop composition:

```
Canvas (bg-page)
└── Workspace inset (p-3)
    └── Row (gap-3)
        ├── SecondaryPanelCard (optional)
        └── MainContentCard
```

Mobile composition:

- Primary nav becomes a slide-out drawer
- Secondary panel collapses into drawer/sheet behavior (not persistent side-by-side)
- Main content remains the primary surface

### Prompt

```
Build the Beespo app shell as a React layout component. Follow the spec in
BEESPO_DESIGN_SYSTEM.md section "Phase 3 — App Shell Implementation" exactly.

Requirements:
1. Create an AppShell layout component that wraps all authenticated routes
2. Include: NavigationSidebar, optional SecondaryPanel (slot), ContentArea (children)
3. NavigationSidebar:
   - Render nav items from a config array (icon, label, href, badge count)
   - Support collapsed/expanded toggle with localStorage persistence
   - Show active state based on current route
   - Include user menu at bottom
4. ContentArea:
   - Accept children
   - Include a PageHeader sub-component (title, breadcrumbs, actions slot)
5. Use ONLY design tokens from tailwind.config.ts and globals.css
6. Use ONLY the chosen icon library (lucide-react)
7. Add subtle transitions for sidebar collapse and hover states
8. Ensure responsive behavior: on mobile, sidebar becomes a slide-out drawer

Wire this into the app's root layout so ALL pages render inside it.
Replace any existing layout/shell/sidebar components — there should be ONE.
```

---

## 5. Phase 4 — Component Standardization

### Objective
Define and build the canonical version of every reusable component. These are the ONLY components that should be used across the app.

### Core Component Library

Each component below must follow the design tokens exactly. No one-off styling.

#### Buttons
```
Variants:   primary | secondary | ghost | danger | link
Sizes:      sm (h-8, text-sm) | md (h-10, text-sm) | lg (h-12, text-base)
Radius:     var(--radius-md)
Font:       font-semibold
Primary:    bg-primary, text-white, hover:bg-primary-hover
Secondary:  bg-white, border, text-gray-700, hover:bg-gray-50
Ghost:      bg-transparent, text-gray-600, hover:bg-gray-100
Danger:     bg-red-600, text-white, hover:bg-red-700
All:        focus-visible ring, disabled opacity, loading spinner state
```

#### Inputs & Form Controls
```
Height:     h-10 (default), h-8 (compact)
Border:     var(--border-default), focus:border-primary + ring
Radius:     var(--radius-md)
Padding:    px-3
Font:       text-sm
Label:      text-sm, font-medium, text-gray-700, mb-1.5
Helper:     text-xs, text-gray-500, mt-1
Error:      text-xs, text-red-600, mt-1 + border-red-300
```

#### Cards
```
Background: var(--color-bg-card)
Border:     var(--border-default)
Radius:     var(--radius-md) or var(--radius-lg)
Padding:    p-6 (standard), p-4 (compact)
Shadow:     var(--shadow-sm) or none — choose ONE and be consistent
```

#### Tables
```
Header:     bg-gray-50, text-xs, font-medium, uppercase, tracking-wide, text-gray-500
Rows:       border-b border-gray-100, hover:bg-gray-50
Cells:      px-4 py-3, text-sm
Alignment:  text-left for text, text-right for numbers
```

#### Modals
```
Overlay:    bg-black/50, backdrop-blur-sm
Container:  bg-white, rounded-lg, shadow-lg, max-w-lg (default)
Header:     p-6, border-b, title text-lg font-semibold
Body:       p-6
Footer:     p-6, border-t, flex justify-end gap-3
Animation:  fade + scale in, fade out
```

#### Dropdowns / Select Menus
```
Trigger:    Same as secondary button or input styling
Panel:      bg-white, shadow-md, rounded-md, border, py-1
Items:      px-3 py-2, text-sm, hover:bg-gray-100, active:bg-primary-light
Selected:   text-primary, font-medium, checkmark icon
```

#### Badges / Tags
```
Sizes:      sm (text-xs, px-2 py-0.5) | md (text-sm, px-2.5 py-0.5)
Radius:     var(--radius-full) for pills, var(--radius-sm) for tags
Variants:   gray | primary | success | warning | error
Style:      Soft background + darker text (e.g., bg-green-50 text-green-700)
```

#### Empty States
```
Container:  Centered in content area, max-w-sm
Icon:       24px, text-gray-400, mb-4
Title:      text-lg, font-semibold, text-gray-900
Description: text-sm, text-gray-500, mt-1, mb-6
CTA:        Primary button
```

#### Toast / Notifications
```
Position:   Bottom-right or top-right (pick ONE)
Style:      bg-white, shadow-lg, rounded-md, border-l-4 (color coded)
Content:    Icon + title (font-medium) + optional description (text-sm, text-gray-500)
Auto-dismiss: 5 seconds, with manual close
```

### Prompt

```
Using the design tokens and component specs from BEESPO_DESIGN_SYSTEM.md (Phase 4),
build or refactor the following core components. Place them in a shared components
directory (e.g., src/components/ui/).

For each component:
1. Implement exactly per the spec — no creative liberties
2. Use Tailwind classes that map to our design tokens
3. Support all listed variants and sizes via props
4. Include TypeScript types for all props
5. Use forwardRef for DOM element access
6. Add display names
7. Export from a barrel file (index.ts)

Components to build/standardize:
- Button
- Input (text, email, password, search)
- Textarea
- Select
- Checkbox
- Radio
- Card
- Modal / Dialog
- Dropdown / Popover
- Badge
- Table (header, row, cell sub-components)
- Toast / notification system
- EmptyState
- Avatar
- Tooltip

For each component, also check the codebase for EXISTING components that serve
the same purpose. List them in a migration notes section so we can replace them later.

Do NOT migrate pages yet. Only build the canonical component library.
```

---

## 6. Phase 5 — Migration Playbook

### Objective
Incrementally migrate every existing page and feature to use the new app shell, design tokens, and canonical components. Do this section by section to avoid breaking the app.

### Migration Order

Migrate in this order (high-visibility, high-traffic pages first):

1. **App Shell** — Replace existing layout(s) with the new AppShell
2. **Navigation** — Replace all sidebar/nav components with the new NavigationSidebar
3. **Dashboard / Home** — First page users see
4. **Core workflow pages** — (e.g., Callings pipeline, Meetings, Members)
5. **Settings pages** — Often the most inconsistent
6. **Admin console** — Separate app, same design system

### Per-Page Migration Checklist

For each page/feature area:

```
□ Renders inside AppShell (no custom layout wrappers)
□ Uses PageHeader component for title/actions
□ All colors are from design tokens (no hardcoded hex/rgb)
□ All text sizes are from the type scale (no arbitrary sizes)
□ All spacing uses Tailwind scale values
□ All icons are from the chosen library, at correct sizes
□ All buttons use the Button component
□ All form controls use the canonical Input/Select/etc.
□ All cards use the Card component
□ All modals use the Modal component
□ All tables use the Table component
□ No inline styles for layout/spacing/color
□ Border radius is consistent (--radius-md default)
□ Shadows follow the shadow scale
□ Empty states use the EmptyState component
```

### Prompt

```
Migrate [PAGE/FEATURE NAME] to conform to the Beespo Design System.

Use the per-page migration checklist from BEESPO_DESIGN_SYSTEM.md (Phase 5).

Steps:
1. Read the current page code
2. Identify every deviation from the design system
3. Replace hardcoded colors, sizes, and spacing with design tokens
4. Replace ad-hoc components with canonical ones from src/components/ui/
5. Ensure the page renders inside AppShell with correct PageHeader
6. Verify all icons are from lucide-react at the correct size
7. Test that no visual regressions break functionality

List all changes made in a summary at the end.
Do NOT change business logic, data fetching, or state management — only styling and components.
```

---

## 7. Rules for New Features

**These rules apply to EVERY new component, page, or feature built in Beespo from this point forward.**

### Mandatory

1. **Render inside AppShell** — No page creates its own layout wrapper
2. **Use design tokens only** — No hardcoded colors, font sizes, spacing, radius, or shadows
3. **Use canonical components** — If `src/components/ui/Button` exists, use it. Never create a new button
4. **Use the icon library** — Only `lucide-react` (or whichever was chosen). Never import from a second library. Never use raw SVGs for standard icons
5. **Follow the type scale** — Only the 6 defined font sizes. No `text-[17px]` or arbitrary values
6. **Follow the spacing scale** — Only Tailwind's default spacing values
7. **Page structure** — Every page starts with `<PageHeader>` containing the page title, optional breadcrumbs, and optional action buttons

### Naming Conventions

```
Components:     PascalCase, descriptive (MemberCard, CallingsPipeline)
Files:          kebab-case matching component (member-card.tsx, callings-pipeline.tsx)
CSS variables:  --color-*, --radius-*, --shadow-*, --font-*, --text-*
Tailwind:       Use utility classes, never @apply for component styles
```

### Code Review Checklist (for agents)

Before finalizing any UI code, verify:

```
□ No new colors introduced outside the palette
□ No new font sizes outside the type scale
□ No mixed icon libraries
□ No custom border-radius values
□ All interactive elements have hover + focus-visible states
□ All buttons use the Button component with correct variant
□ All form inputs use canonical form components
□ Empty states use the EmptyState component, not ad-hoc messaging
□ Loading states are consistent (skeleton or spinner — pick ONE pattern)
□ The page works within the AppShell at all viewport widths
```

---

## Appendix A: Quick Reference — "Does It Exist?"

Before building anything new, ask: **Does a canonical version already exist?**

| Need | Look in | If missing |
|------|---------|------------|
| Button | `src/components/ui/button` | Do NOT create a new one — flag it |
| Input | `src/components/ui/input` | Same |
| Modal | `src/components/ui/modal` | Same |
| Table | `src/components/ui/table` | Same |
| Card | `src/components/ui/card` | Same |
| Toast | `src/components/ui/toast` | Same |
| Icon | `lucide-react` | Check if lucide has it before using anything else |
| Color | Design tokens / Tailwind config | If the color isn't in the palette, don't use it — ask first |

---

## Appendix B: Intercom Visual References

Supplement this document with screenshots from Intercom's product for specific patterns:

- [ ] **Sidebar navigation** — collapsed and expanded states
- [ ] **Inbox list view** — three-panel layout with list + detail
- [ ] **Settings page** — left nav categories + content area
- [ ] **Table/data view** — column headers, row hover, pagination
- [ ] **Modal/dialog** — create/edit forms
- [ ] **Empty state** — illustration + CTA
- [ ] **Toast notifications** — position and style

> **Action item for Moi**: Capture these screenshots from the Intercom product and place them in a `/design-references/` directory in the repo. Reference them in prompts when migrating specific page types.

---

## Appendix C: Execution Strategy

### For Claude Code
Save this file as `BEESPO_DESIGN_SYSTEM.md` at the project root OR as a custom skill in your Claude Code configuration. Reference it at the start of every design-related task:

```
Read BEESPO_DESIGN_SYSTEM.md before making any UI changes. Follow the phase
that applies to the current task. If building a new feature, follow section 7
"Rules for New Features" strictly.
```

### For Codex
Include this file in the project context. In your task prompt, reference the specific phase:

```
Context: See BEESPO_DESIGN_SYSTEM.md
Task: Execute Phase 3 — App Shell Implementation
```

### Recommended Workflow

1. Run Phase 1 (audit) → review the report with human judgment
2. Run Phase 2 (tokens) → review and adjust brand colors / preferences
3. Run Phase 3 (app shell) → test navigation and layout manually
4. Run Phase 4 (components) → review each component visually
5. Run Phase 5 (migration) → migrate ONE page, verify, then continue

**Each phase should be a separate agent session.** Don't try to do everything in one pass. Review outputs between phases.
