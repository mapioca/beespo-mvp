# Beespo UI Pattern Guide (Minimal, Modern, Sophisticated)

This guide captures the production‑ready styling patterns used across the app so any AI coding tool can implement new pages without scanning existing UI. It references the global tokens and utility classes already defined in `src/app/globals.css`.

For the approved `/events/new` baseline, see `docs/calm-precision-events-new-standard.md`.

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

### Drawer Typography Tokens
Defined in `src/app/globals.css` and required for all production drawers:
- `--drawer-text-label`
- `--drawer-text-value`
- `--drawer-text-meta`
- `--drawer-text-section`
- `--drawer-text-menu-item`
- `--drawer-text-title`

Utilities:
- `text-drawer-label`
- `text-drawer-value`
- `text-drawer-meta`
- `text-drawer-section`
- `text-drawer-menu-item`
- `text-drawer-title`

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

## Collection Pattern: Editorial Shelf
Use the notebooks page as the canonical reference for premium object collections that should feel curated, quiet, and product-grade rather than dashboard-generic.

### When To Use It
- Use for galleries of owned objects such as notebooks, folders, packets, templates, libraries, or curated resources.
- Use when the object itself should carry the primary identity and the metadata/actions should stay secondary.
- Do not use colorful cards, loud status treatments, or dense table-like layouts for this pattern.

### Editorial Shelf Principles
- The object is the hero. The card face should read like a product object or cover, not a dashboard tile.
- The page chrome is quiet. The top bar, breadcrumb bar, and content wrapper should use white surfaces with separation created by spacing, not heavy dividers.
- The shelf should feel premium through restraint: white space, subtle borders, clean shadows, and strong typography.
- Avoid decorative effects that feel synthetic: no gradients, no glossy overlays, no fake material gimmicks.

### Page Shell Standard
- Breadcrumb bar uses a white fill.
- Anchored/sticky top bar uses a white fill.
- The collection wrapper/canvas also uses a white fill.
- Do not place a hard divider between the top bar and the object grid when both surfaces are white; rely on spacing.
- The page heading block can include small utility pills, a large editorial headline, a short supporting sentence, search, and a primary action.

### Object Card Standard
- Use a simple vertical rectangle with softly rounded corners.
- Recommended corner radius:
  - Cover: `rounded-[18px]`
- Recommended shadow:
  - `shadow-[0_14px_28px_rgba(15,23,42,0.08)]`
  - Hover: `shadow-[0_20px_38px_rgba(15,23,42,0.12)]`
- Recommended border:
  - `border border-border/70`
- Recommended proportions:
  - `aspectRatio: "0.74"`
- The object should be clickable as a whole and open the detail/editor view.

### Object Surface Standard
- Prefer solid fills only.
- Start with solid white or near-white neutral surfaces.
- Avoid gradients entirely for this pattern.
- Avoid internal decorative frames, extra outlines, left-side “spine” effects, or any ornamental shading unless a future design system explicitly standardizes them.
- The surface should feel like a minimal editorial cover, not a skeuomorphic illustration.

### Typography On Object Faces
- The object title lives directly on the face and acts like a cover title.
- Use large, assertive, editorial typography.
- Current notebook reference:
  - `text-[28px]`
  - `font-semibold`
  - `leading-[1.02]`
  - `tracking-[-0.05em]`
  - `line-clamp-4`
- Title color should be high-contrast black or near-black on light covers.
- Supporting metadata on the face should stay small and quiet:
  - `text-[11px] font-medium text-black/54`
- Separate metadata from title with a single thin divider line only when needed.

### Metadata + Actions Below Objects
- Do not place the notes count or overflow menu inside the object face for this pattern.
- Secondary controls live beneath the object in a simple horizontal row.
- Left side:
  - metadata pill, such as note count
- Right side:
  - ghost overflow trigger

### Pill Standard For Shelf Metadata
- Use a rounded full pill.
- For the notebook shelf, the note-count pill is intentionally high-contrast:
  - `border border-black bg-black text-white`
- Recommended sizing:
  - `px-2.5 py-1 text-[11px] font-medium`
- Keep the pill compact and factual. Avoid colorful status pills in this pattern.

### Overflow Action Standard
- Use a ghost trigger, not a filled circular button.
- Recommended trigger:
  - `variant="ghost" size="icon"`
  - `h-8 w-8 rounded-full text-muted-foreground hover:bg-control/70 hover:text-foreground`
- Use standard dropdown menus for actions such as:
  - `Open`
  - `Edit`
  - `Rename`
  - `Share`
  - `Delete`
- Keep the menu neutral and rely on the shared dropdown styling.

### Grid Standard
- Use a tighter curated grid rather than oversized cards.
- Current notebook reference:
  - `grid-cols-[repeat(auto-fill,minmax(152px,1fr))]`
  - `gap-x-5 gap-y-8`
  - larger screens may step up to `minmax(168px,1fr)`
- The shelf should feel like a collection, not a billboard row.

### Loading State Standard
- Loading skeletons should mirror the exact shelf composition:
  - object rectangle
  - notes pill placeholder
  - overflow action placeholder
- Do not use generic dashboard-card skeletons for this pattern.

### Non-negotiables
- No gradients on object faces.
- No decorative inner outline if the outer silhouette already defines the object.
- No filled overflow menu circle for shelf actions.
- No gray-tinted wrapper when the pattern is intended to feel editorial and premium; use white.
- No heavy divider between the sticky top bar and the shelf wrapper when spacing can do the job better.

### Collection Variant: Template Folios
Use the Template Library as the canonical variant when the object is not a cover like a notebook, but a structured reusable artifact with internal content.

- Keep the same white editorial shell, quiet chrome, black primary CTA, and ghost overflow menu from the Editorial Shelf pattern.
- Template cards should feel like refined folios, not dashboard tiles:
  - `rounded-[24px] border border-border/65 bg-white`
  - restrained shadow at rest, slightly stronger on hover
- Card internals should be grouped into calm zones:
  - object identity row
  - short description
  - structure preview panel
  - quiet metadata line
  - single-line tag row
  - action row
- The structure preview panel should use a light inset surface rather than a loud sub-card:
  - `rounded-[20px] border border-border/55 bg-control/35`
  - sentence-case section title
  - compact numbered rows
  - a faint alignment rail is allowed when it helps sequential reading
- Empty structure states should be integrated into the panel, not wrapped in an additional nested card.
- Overflow affordances such as `+ N more agenda items` should be subtle, dashed, and link-like rather than button-heavy.
- Filters for collection pages should read as a compact segmented control family:
  - active: black fill with white text
  - inactive: white fill with subtle border

## Drawer Pattern
Use the Business Item Details drawer as the canonical drawer reference for editable side panels.

### Drawer Typography
- Section headers use sentence case, never uppercase.
- Drawer typography must use drawer tokens, not builder tokens and not hard-coded pixel sizes.
- Section header classes:
  - `text-drawer-section font-semibold tracking-[0.02em] text-foreground/60`
- Field labels:
  - `text-drawer-label font-medium leading-none text-muted-foreground`
- Editable field values:
  - `text-drawer-value font-medium leading-none tracking-normal`
- Metadata rows, empty states, supporting content:
  - `text-drawer-meta`
- Drawer titles:
  - `text-drawer-title font-semibold`

### Drawer Typography Standard
- Drawers should feel more premium and readable than the compact builder/property-pane scale.
- Do not reuse `--builder-text-*` as the primary drawer type scale.
- If typography needs adjustment, update the drawer tokens in `globals.css` first, then let drawers inherit the change.

### Drawer Form Controls
- Inputs and textareas:
  - `bg-control border-control`
  - `focus-visible:ring-0 focus-visible:border-foreground/30`
  - Placeholder text should use the drawer value token, not default browser sizing.
- Select triggers:
  - Match drawer inputs with `bg-control border-control`
  - Reuse the same drawer value typography as text inputs.
- Date and other inline picker triggers:
  - Match select/input surfaces and typography.

### Drawer Select Menus
- Open dropdown menus inside drawers must match the builder/properties-pane menu treatment.
- `SelectContent` classes:
  - `rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg`
- `SelectItem` classes:
  - `rounded-md px-2.5 py-1.5 text-drawer-menu-item font-medium leading-none tracking-normal`
  - `focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-text))]`

### Drawer Interaction States
- Hover and active states inside drawers must stay neutral.
- Use `hover:bg-control-hover` for non-destructive secondary actions.
- Do not introduce peach, salmon, blue, or other accent hover fills for standard controls.
- Reserve color accents for destructive states only.

### Drawer Actions
- Primary save button:
  - `w-full h-9 rounded-full text-[12px] font-semibold`
- Save button label should be concise: prefer `Save` unless a longer label is necessary for clarity.
- Secondary action surfaces inside drawers should feel like controls, not callouts.

### Drawer Non-negotiables
- No hard-coded drawer typography sizes when a drawer token exists.
- No uppercase section headers in production drawers.
- No colorful hover states for standard drawer actions.
- No custom dropdown option typography inside drawers; use the standardized drawer menu item token.

### Drawer Content Blocks
- Informational blocks inside drawers should stay neutral and token-driven.
- Prefer:
  - `rounded-xl border border-border/70 bg-muted/20`
- Avoid colorful callout panels unless the content is explicitly status-based or destructive.

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

## Tables Pattern: Agendas Standard (Authoritative)
Use the Agendas table as the default style for all list/table pages.

### Table Tokens (Authoritative)
Defined in `src/app/globals.css`:
- `--table-shell-bg`
- `--table-shell-border`
- `--table-shell-shadow`
- `--table-row-divider`
- `--table-row-hover`
- `--table-row-selected`
- `--table-header-bg`
- `--table-header-border`
- `--table-head-height`
- `--table-cell-px`
- `--table-row-py`
- `--table-header-font-size`
- `--table-body-font-size`
- `--table-meta-font-size`

### Chip + Filter Tokens (Used by table pages)
Defined in `src/app/globals.css`:
- `--chip-bg`
- `--chip-border`
- `--chip-text`
- `--chip-hover-bg`
- `--chip-active-bg`
- `--chip-active-border`
- `--chip-active-text`

### Required Utility Classes (No hard-coded replacements)
Use these utilities instead of ad-hoc class strings:
- `table-shell-standard` for table container
- `table-header-row-standard` for header row
- `table-cell-check` for checkbox cells
- `table-cell-title` for primary/title cells
- `table-cell-meta` for secondary metadata cells
- `table-cell-actions` for action/menu cells

### Required Shared Components
Use shared components to keep behavior and visuals consistent:
- `src/components/ui/table-row-action-trigger.tsx`
  - Use inside `DropdownMenuTrigger asChild` for row `...` actions.
  - Keeps hover/focus/open states consistent.
- `src/components/ui/status-indicator.tsx`
  - Use dot + text status language in table metadata columns.
  - Map domain statuses to `tone` values (`neutral`, `info`, `success`, `warning`, `danger`).
- `src/components/ui/data-table-header.tsx`
  - Use for sortable/filterable headers, never hand-roll header controls per table.

### Interaction Standards
- Row checkbox visibility:
  - Row checkbox is hidden by default and appears on row hover, focus, or when checked.
  - Header “select all” checkbox remains visible.
- Row hover/selection:
  - Hover and selected backgrounds must come from table tokens, not literal colors.
- Row actions:
  - Use `TableRowActionTrigger`; do not reintroduce custom `MoreHorizontal` buttons.
- Status rendering:
  - Use `StatusIndicator`; do not render custom status badges/dots inline in each table.

### Density + Typography Standards
- Titles are primary and should use `table-cell-title`.
- Metadata columns (status/template/date/etc.) should use `table-cell-meta`.
- Header text size and row density must come from table tokens.
- Avoid per-page font-size hard-coding in table cells unless there is a documented exception.

### Floating Bulk Actions Pattern
When a table supports bulk selection:
- Use one floating bottom pill (toast-like) instead of inline action bars.
- Keep count, deselect, and destructive action in a single horizontal control.
- Use token-driven border/background/foreground values; avoid literal palette values.

### Non-negotiables (No Hard-coded Styling)
- No literal hex/rgb/hsl color values in table page components.
- No hard-coded row spacing/typography for shared table primitives.
- No one-off button styles for row action triggers.
- Any new visual adjustment should be made by token first, then consumed by existing utilities/components.

### Replication Checklist (For Any New Table Page)
1. Wrap table in `table-shell-standard`.
2. Use `Table`, `TableHead`, `TableRow` from `src/components/ui/table.tsx`.
3. Use `DataTableColumnHeader` for all header controls.
4. Use `table-cell-*` utility classes for cell role consistency.
5. Use `StatusIndicator` for status columns.
6. Use `TableRowActionTrigger` for row menu trigger.
7. Ensure row checkbox reveal behavior matches the standard.
8. If bulk actions exist, use the floating pill pattern.
9. Validate no literal style values were introduced.

---

**Reference Files**
- `src/app/globals.css` (tokens + utilities)
- `src/components/ui/dropdown-menu.tsx` (menu styling)
- `src/components/ui/table.tsx` (shared table primitive)
- `src/components/ui/data-table-header.tsx` (shared table header control)
- `src/components/ui/table-row-action-trigger.tsx` (shared row actions trigger)
- `src/components/ui/status-indicator.tsx` (shared status language)
- `src/components/meetings/meetings-table.tsx` (canonical Agendas table implementation)
- `src/components/meetings/meetings-client.tsx` (filter chips + floating bulk actions pattern)
- `src/components/meetings/builder/meeting-context-bar.tsx` (top bar pattern)
- `src/components/meetings/builder/print-preview-pane.tsx` (paper surface)
