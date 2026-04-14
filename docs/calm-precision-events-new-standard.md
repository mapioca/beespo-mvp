# Calm Precision Standard (v1) for `/events/new`

This document defines the approved style and layout standard currently implemented on `/events/new`.

## Scope
- Applies to the event creation page and any future settings-like forms that should match this quality bar.
- Uses global tokens in `src/app/globals.css` plus reusable settings primitives in `src/components/settings/*`.

## Visual Direction
- Name: `Calm Precision`
- Intent: elegant, restrained, low-noise UI with clear structure and minimal decoration.

## Token System

### Core direction tokens
- Prefix: `--cp-*`
- Includes canvas/surface/text/border/divider/hover/focus/primary, plus rhythm and radius tokens.

### Mapped runtime tokens
- Existing app tokens map to `--cp-*` so current components inherit the new direction:
  - `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`
  - `--settings-*` tokens for settings surfaces and controls

## Layout Rhythm
- Narrow content width: `max-w-2xl` on `/events/new`.
- Section stack: compact and consistent.
- Card spacing: controlled through `SettingsPageShell`, `SettingsSection`, `SettingsGroup`.
- Footer actions aligned to the same max width as content.

## Typography
- Calm hierarchy (reduced heaviness):
  - Page title: medium, not heavy bold.
  - Section titles: medium, subtle.
  - Row labels: normal weight.
  - Meta/help text: small and muted.
- Field text normalized to `text-sm` in shared settings input class.

## Component Standards

### Reusable settings primitives
- `src/components/settings/settings-surface.tsx`
  - `SettingsPageShell`
  - `SettingsSection`
  - `SettingsGroup`
  - `SettingsRow`
  - `SettingsFieldRow`
  - `settingsInputClassName`

### Reusable segmented control
- `src/components/settings/settings-segmented-control.tsx`
  - `SettingsSegmentedControl`
  - `SettingsSegmentedOption`

### Divider behavior
- `SettingsFieldRow` supports:
  - `dividerStyle="full"`
  - `dividerStyle="inset"` (subtle, partial-width divider)
  - `dividerStyle="none"`

## `/events/new` Implementation Notes
- Reduced helper copy to lower visual noise.
- Standardized control heights and row alignment.
- Subtle inset dividers used for row separation.
- Card surfaces are white; page canvas uses a lightly tinted neutral token.

## Acceptance Checklist
- No hard-coded warm/peach accent hover states.
- No all-caps section label treatment.
- Inputs/selects/segmented controls are visually consistent in height and typography.
- Dividers are inset and subtle where used.
- Content width and footer width match.
- Uses reusable settings components and global tokens.
