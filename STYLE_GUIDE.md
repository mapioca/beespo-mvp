# Beespo UI Pattern Guide (Minimal, Modern, Sophisticated)

This guide captures the production‑ready styling patterns used across the app so any AI coding tool can implement new pages without scanning existing UI. It references the global tokens and utility classes already defined in `src/app/globals.css`.

## Core Principles
- **Quiet chrome, strong content.** Navigation and toolbars are calm, minimal, and never compete with the document/content surface.
- **Surface hierarchy.** Use distinct surfaces: panel (app shell), chrome (top bars), paper (document).
- **Typography restraint.** Favor smaller sizes, normal weights, and subtle emphasis.
- **Icons are neutral.** No colorful icons in menus or chrome.
- **Consistency via tokens.** Use tokens and utility classes; avoid ad‑hoc colors.

## Global Tokens (Authoritative)
Located in `src/app/globals.css`.

### Surfaces
- `--panel` → base app surface (sidebar + shell canvas)
- `--chrome` → top bars/toolbars surface
- `--paper` → document surface

Utilities:
- `bg-panel`, `bg-chrome`, `bg-paper`

### Chrome + Controls
- `--control`, `--control-foreground`, `--control-border`, `--control-hover`

Utilities:
- `bg-control`, `text-control`, `border-control`, `bg-control-hover`

### Menus / Popovers
- `--menu`, `--menu-border`, `--menu-text`, `--menu-muted`, `--menu-icon`, `--menu-hover`, `--menu-separator`

Menu styles are enforced in `src/components/ui/dropdown-menu.tsx` so all dropdowns match automatically.

### Navigation States
- `--nav-hover`, `--nav-hover-alpha`
- `--nav-selected`, `--nav-selected-alpha`

Utilities:
- `bg-nav-hover`, `bg-nav-selected`

### Buttons
- `--button-primary`, `--button-primary-hover`, `--button-primary-foreground`

Utilities:
- `bg-button-primary`, `bg-button-primary-hover`, `text-button-primary`

### Pills / Meta
- `--pill`, `--pill-foreground`

Utilities:
- `bg-pill`, `text-pill`

## Layout Pattern: Dashboard Shell
- App shell uses `bg-panel` for both sidebar and main wrapper.
- Main content is a `bg-paper` surface inside the chrome/panel.
- No border between sidebar and content unless explicitly required.

## Top Bar Pattern (Breadcrumb + Actions)
- **Breadcrumb bar only** with inline “More” menu next to breadcrumb.
- **Context actions** live at the far right: stats text, “Switch mode” button, “Save split button”.
- **No bottom border** on the bar (ghost feel).

### Switch Mode Button
- Shape: rounded, slightly larger than default.
- Example classes:
  - `inline-flex items-center gap-2 h-8 px-3.5 rounded-full`
  - `bg-control text-foreground hover:bg-control-hover border border-control`

### Save Split Button (Single Pill, Split Actions)
- Two buttons inside one outer pill:
  - Left: Save action (icon + label)
  - Right: Dropdown trigger
- **Outer edges rounded, inner seam straight.**
  - Left button: `rounded-l-full rounded-r-none`
  - Right button: `rounded-r-full rounded-l-none`
- No divider line between the two; appears as one pill.
- Selected state: dropdown segment uses `data-[state=open]` with `bg-control-hover`.

## Dropdown Menu Pattern (Codex‑like)
The dropdown menu component already enforces this:
- Rounded corners (`rounded-xl`)
- Compact padding (`p-1`), tighter line height
- Neutral icons, no color
- Uppercase section headers are removed (use dividers only)

If a custom menu is created, mirror:
- `text-[12px]`, `py-1.5`, `px-2.5`
- `focus:bg-[hsl(var(--menu-hover))]`
- Icon color uses token `--menu-icon`

## Sidebar Pattern
- Text size: `13px`
- Font weight: `normal`
- Icon stroke: `1.4`
- Hover/active background uses `bg-nav-hover` and `bg-nav-selected`

## Document / Print Preview Surface
- Paper uses `bg-paper`
- Border: `border border-border/40`
- Shadow: `shadow-[0_20px_60px_rgba(15,23,42,0.08)]`
- Padding: `p-12 sm:p-16`

## Usage Checklist (When Building New Pages)
1. Use `bg-panel` for shell and sidebar.
2. Use `bg-chrome` for top bars/toolbars.
3. Use `bg-paper` for document/content surface.
4. For menus, use default `DropdownMenu` components (already styled).
5. For buttons in chrome, prefer `bg-control` + `border-control`.
6. Avoid any custom accent colors unless explicitly requested.

---

**Reference Files**
- `src/app/globals.css` (tokens + utilities)
- `src/components/ui/dropdown-menu.tsx` (menu styling)
- `src/components/meetings/builder/meeting-context-bar.tsx` (top bar pattern)
- `src/components/meetings/builder/print-preview-pane.tsx` (paper surface)
