# Beespo IA Contract v1: Navigation Levels (Calendar + Callings)

## Purpose
This document defines the navigation-level contract for Beespo and locks the IA for the first two domains:
- Calendar
- Callings

The goal is to keep navigation minimal, contextual, and intentional:
"If users do not need something, it should not be there."

## Core Principles
1. Necessity over permanence.
Controls that are not needed for the current user task should not be persistently visible.

2. Stable global map, contextual local map.
Global destinations remain predictable; section-specific controls appear only when a user is in that section.

3. One job per level.
Each navigation level has a single responsibility. Avoid mixing filters/actions with section destinations.

4. No decorative complexity.
Do not add sections just to fill space. Every section must map to a repeated user job.

## Navigation Level Contract

### L0: Global Domain Navigation (Primary Sidebar)
What belongs here:
- Stable cross-workspace domains.
- Entry points users intentionally switch between.

What does not belong here:
- Section-only filters/actions.
- Temporary workflow controls.

Examples:
- Dashboard, Calendar, Callings, Meetings, Data, Tasks

### L1: Section Navigation (Secondary Pane)
What belongs here:
- Sub-areas of a single L0 domain.
- Distinct jobs with their own URL/state.

What does not belong here:
- Sort, filter, quick actions, row actions.
- Transient controls that only modify current page output.

Admission test for L1:
- Users switch to it as a distinct mode of work.
- It has its own stable URL.
- It has unique state and intent beyond a view toggle.

### L2: In-Page Controls (Contextual)
What belongs here:
- Filters, sort, group, view mode toggles.
- Search, quick actions, create actions.
- Toolbars/chips/tabs that refine the current L1 page.

Visibility rule:
- Show only when relevant to current page/task.
- Hide or collapse advanced controls by default when not needed.

### L3: Object Context (Right Details Pane)
What belongs here:
- Inspect/edit one selected entity.
- Contextual object actions and metadata.

What does not belong here:
- Section navigation.
- Cross-domain/global navigation.

## Domain IA: Calendar

### L0 Label
- Calendar (domain)

### L1 Sections
1. Schedule (preferred label; replaces "Calendar View")
2. Events
3. Settings

Notes:
- "Schedule" avoids naming collision/confusion with L0 "Calendar".
- Month/Week/Day are not L1 sections.

### L2 Controls by Section

#### Schedule
- View mode: Month / Week / Day
- Date jump, today, next/prev controls
- Optional contextual filters (only when needed)

#### Events
- Table/list view
- Filters
- Sort/group (if needed by dataset scale)
- Quick actions:
  - Create announcement from event
  - Create invitation from event
- Row actions:
  - Edit
  - Delete

#### Settings
- Create external calendar subscription (URL)
- Manage external subscriptions
- Generate Beespo calendar subscription/feed
- Import calendar file
- Export calendar file

## Domain IA: Callings

### L0 Label
- Callings (domain)

### L1 Sections
1. Pipeline
2. Member Fit
3. Callings Fit
4. Org Map

### L2 Controls by Section

#### Pipeline
- Status progression controls
- Assignee/owner filters
- Timeline/stage grouping

#### Member Fit
- Filters
- Sort
- Group
- Candidate notes (reasoning/revelation context)
- Quick actions:
  - Create task and assign
  - Move suggestion to pipeline

#### Callings Fit
- Filters
- Sort
- Group
- Callings notes (reasoning/revelation context)
- Quick actions:
  - Create task and assign
  - Move suggestion to pipeline

#### Org Map
- Organization graph view controls
- Focus/zoom/highlight controls
- Gap/vacancy discovery actions

## Explicit Exclusions
The following are not L1:
- Filters
- Sort/group controls
- "Quick actions" buttons
- Per-row actions (edit/delete)

These belong in L2 and should appear only when context requires them.

## Interaction/Visibility Rules
1. Secondary pane appears only for domains with meaningful L1 sections.
2. L2 controls are contextual and can be progressively disclosed.
3. Keep global quick access (e.g., Favorites/Recents) in L0 shell areas, not in L1.
4. Avoid duplicated entry points unless they serve clearly different contexts.

## Naming Rules
1. L0 and L1 labels must not duplicate each other.
2. Prefer task language over container language.
3. Keep labels short (1-2 words) when possible.

Approved examples:
- "Schedule" over "Calendar View"
- "Member Fit" and "Callings Fit"

## Implementation Guardrails
1. New L1 sections require a URL and a clear user job.
2. Any proposed permanent control must justify persistent visibility.
3. If a control is only needed in a subset of scenarios, default to contextual display.

## Next Scope
After this contract is applied, define L0/L1/L2 for:
- Meetings
- Data

