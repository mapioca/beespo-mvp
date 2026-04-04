# Beespo Design Tokens

Source of truth for implementation tokens aligned to `BEESPO_DESIGN_SYSTEM.md` and Intercom-style product UI standards.

## Colors

| Token | Value (Light) | Value (Dark) | Usage |
|---|---|---|---|
| `--color-primary` | `0 0% 9%` | `0 0% 16%` | Primary CTA, links, active states |
| `--color-primary-hover` | `0 0% 16%` | `0 0% 24%` | Hover state for primary actions |
| `--color-primary-light` | `0 0% 92%` | `0 0% 22%` | Selected/active background tint |
| `--color-gray-50` | `0 0% 98%` | `0 0% 8%` | Page background |
| `--color-gray-100` | `0 0% 96%` | `0 0% 10%` | Secondary surfaces, sidebar |
| `--color-gray-200` | `0 0% 90%` | `0 0% 18%` | Borders/dividers |
| `--color-gray-300` | `0 0% 83%` | `0 0% 28%` | Disabled/input border states |
| `--color-gray-400` | `0 0% 64%` | `0 0% 45%` | Placeholder/supporting text |
| `--color-gray-500` | `0 0% 45%` | `0 0% 60%` | Secondary text |
| `--color-gray-600` | `0 0% 32%` | `0 0% 72%` | Body text |
| `--color-gray-700` | `0 0% 25%` | `0 0% 84%` | Headings/subheadings |
| `--color-gray-900` | `0 0% 9%` | `0 0% 96%` | Primary text |
| `--color-success` | `142 76% 36%` | `142 69% 45%` | Success badges/alerts |
| `--color-warning` | `45 89% 47%` | `45 90% 56%` | Warning badges/alerts |
| `--color-error` | `0 72% 51%` | `0 79% 62%` | Error/destructive states |
| `--color-info` | `var(--color-primary)` | `var(--color-primary)` | Informational emphasis |
| `--color-bg-page` | `var(--color-gray-50)` | `var(--color-gray-50)` | Global app/page canvas |
| `--color-bg-card` | `0 0% 100%` | `var(--color-gray-100)` | Card/popover surfaces |
| `--color-bg-sidebar` | `var(--color-gray-100)` | `var(--color-gray-100)` | Sidebar surfaces |
| `--color-bg-hover` | `var(--color-gray-100)` | `0 0% 14%` | Hover background |
| `--color-bg-selected` | `var(--color-primary-light)` | `var(--color-primary-light)` | Selected state background |

## Typography

| Token | Value | Usage |
|---|---|---|
| `--font-sans` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | Global UI font family |
| `--text-xs` | `0.75rem` | Captions, metadata |
| `--text-sm` | `0.875rem` | Labels, secondary text |
| `--text-base` | `1rem` | Body text |
| `--text-lg` | `1.125rem` | Section headers |
| `--text-xl` | `1.25rem` | Sub-page headers |
| `--text-2xl` | `1.5rem` | Page titles |
| `--font-normal` | `400` | Body text |
| `--font-medium` | `500` | Labels, emphasis |
| `--font-semibold` | `600` | Headings, buttons |
| `--leading-tight` | `1.25` | Heading line-height |
| `--leading-normal` | `1.5` | Standard body line-height |
| `--leading-relaxed` | `1.625` | Long-form content |

## Radius and Borders

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Badges/tags |
| `--radius-md` | `6px` | Default controls/cards |
| `--radius-lg` | `8px` | Modals/larger containers |
| `--radius-full` | `9999px` | Pills/avatars |
| `--border-default` | `1px solid hsl(var(--color-gray-200))` | Standard border style |

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)` | Cards/dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04)` | Modals/overlays |

## Tailwind Encoding

`tailwind.config.ts` enforces restricted scales to match the design system:
- `fontSize`: only `xs`, `sm`, `base`, `lg`, `xl`, `2xl`
- `fontWeight`: `normal`, `medium`, `semibold` (plus compatibility alias `bold -> semibold`)
- `lineHeight`: `tight`, `normal`, `relaxed`
- `spacing`: restricted to `0`, `px`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`
- `borderRadius`: `sm`, `md`, `lg`, `full`
- `boxShadow`: `sm`, `md`, `lg`, `none`

## Compatibility Layer

To avoid immediate breakage before component migration, canonical tokens are mapped to existing aliases in `src/app/globals.css` (e.g., `--background`, `--primary`, `--border`, `--input`, `--ring`, `--button-primary`).
