# Meetings v2 Frontend Roadmap

## Purpose
This document is the frontend implementation roadmap for the Meetings v2 transformation.

It carries the UI from the old meeting-centric model to the new product model:
- `Event` can exist on its own.
- `Meeting` can exist on its own.
- `Agenda` and `Program` should be treated as first-class plans.
- Linking between plans, meetings, and events can happen later when a downstream workflow requires it.

This roadmap assumes the backend work is progressing independently and focuses on shipping the frontend in coherent phases without exposing confusing transitional UX to most users.

## Product Rules To Hold Constant
1. Users do not need a meeting in order to create a plan.
2. Users do not need an event in order to create a meeting.
3. Plans, meetings, and events may be linked later.
4. Linking becomes required only for specific downstream jobs such as publish, share, or conduct flows.
5. Legacy routes may continue to work for direct access, but legacy concepts should not be visible in mainstream UX.

## Current Status

### Completed
1. Secondary domain navigation shell is in place for `Meetings` and `Schedule`.
2. Global sidebar has been simplified to top-level `Schedule` and `Meetings`.
3. `Meetings Overview` exists and is now the default Meetings landing page.
4. `Programs` now exists as a real workspace page instead of a placeholder.
5. A dedicated create hub exists for:
   - Agenda
   - Program
   - Meeting
   - Event
6. The existing builder can now adapt framing and initial mode based on entry intent.
7. Agendas and Programs now have separate list surfaces and plan-oriented labels.
8. List rows now expose basic linkage state such as whether an event is linked.

### Still Transitional
1. The plan workspaces are still backed by `meetings` records in the visible UI.
2. The builder is still fundamentally a meeting builder with plan-aware entry framing.
3. There is not yet a full standalone plan detail/edit experience separate from meeting detail.
4. Link-later is visible in copy and status, but not yet implemented as full user actions.
5. Some older meeting-centric labels and flows still exist in command palette, docs, widgets, and row actions.

## Roadmap

### Phase 1: Navigation And Entry Architecture
Status: Completed

Goals:
1. Establish the correct IA before page-level behavior is rewritten.
2. Remove visible legacy clutter from the mainstream Meetings UX.
3. Give users clean entry points for the new model.

Delivered:
1. Shared secondary navigation shell.
2. Meetings Overview and Schedule Settings routes.
3. Programs workspace route.
4. Dedicated create hub and entry-aware create flows.

Exit criteria:
1. Users can navigate the new IA without encountering legacy terminology.
2. Users can start an agenda, program, meeting, or event from an explicit entry point.

### Phase 2: Plan Workspace Parity
Status: In progress

Goals:
1. Make `Agendas` and `Programs` feel like parallel first-class workspaces.
2. Replace meeting-centric wording in list surfaces with plan-centric wording.
3. Surface linkage state clearly without requiring linkage up front.

Delivered so far:
1. Programs list page.
2. Shared reusable plan list client.
3. Plan-specific create labels, search copy, tabs, and empty states.
4. Basic row-level linkage indicators.

Remaining work:
1. Add parity between agenda and program page controls where still inconsistent.
2. Refine empty states so they guide creation and linking appropriately.
3. Update row actions labels:
   - `Open agenda`
   - `Open program`
   - avoid generic `Meeting` wording when the user is in a plan workspace
4. Ensure all table chips, badges, and helper text reflect plan semantics rather than meeting semantics.

Exit criteria:
1. Users can work in Agendas and Programs without the pages reading like meeting indexes.
2. No major list-surface copy implies a plan requires a meeting or event.

### Phase 3: Link-Later UX
Status: Not started

Goals:
1. Turn linkage from a copy promise into an actual workflow.
2. Let users intentionally connect a plan to a meeting and a meeting to an event at the right time.

Frontend scope:
1. Add explicit actions where appropriate:
   - `Link to meeting`
   - `Link to event`
   - `Replace linked event`
   - `Detach event`
2. Add link-state sections or cards in detail surfaces:
   - plan detail shows linked meeting state
   - meeting detail shows linked event state
3. Add required-state gates for downstream actions:
   - publish program may require meeting and/or event linkage
   - share agenda may require meeting linkage if the share model depends on meeting-backed records
4. Use warning/instruction patterns that are actionable, not abstract.

Dependencies:
1. Stable backend endpoints for linking/unlinking entities.
2. Clear contract for which downstream actions require which linkage.

Exit criteria:
1. Users can intentionally link entities from the UI.
2. Blocking states explain what is missing and offer the next action directly.

### Phase 4: Detail Surface Split
Status: Not started

Goals:
1. Stop routing all plan work through a meeting detail mental model.
2. Create detail surfaces that reflect the actual primary object the user is editing.

Frontend scope:
1. Define dedicated detail/edit routes for:
   - agenda detail
   - program detail
   - meeting detail
   - event detail
2. Give each detail surface its own:
   - header
   - metadata summary
   - action bar
   - linkage section
3. Reduce overloading of `/meetings/[id]` as the universal detail route.
4. Keep cross-links between entities obvious but secondary.

Dependencies:
1. Backend read models for standalone plan detail.
2. Clear canonical URLs for plan documents.

Exit criteria:
1. Users can tell whether they are editing a plan, a meeting, or an event.
2. Detail screens no longer collapse multiple concepts into one page without explanation.

### Phase 5: Builder Split
Status: Not started

Goals:
1. Break the current monolithic meeting builder into plan-specific editing experiences.
2. Preserve shared editing primitives while removing the assumption that everything is a meeting draft.

Frontend scope:
1. Extract shared builder primitives:
   - canvas behaviors
   - toolbox components
   - item editing panels
   - validation plumbing
2. Create plan-specific builder orchestration:
   - Agenda builder
   - Program builder
3. Decide which capabilities remain meeting-specific:
   - conduct state
   - Zoom sync
   - public program mode
4. Make create and edit routes open the right builder based on entity type.

Dependencies:
1. Backend persistence endpoints for standalone agenda/program documents.
2. Migration strategy for existing meeting-backed content.

Exit criteria:
1. Agenda creation/editing does not require traveling through a meeting-centric save model.
2. Program creation/editing does not require traveling through a meeting-centric save model.

### Phase 6: Downstream Workflows
Status: Not started

Goals:
1. Reconnect publish/share/conduct flows to the new model without ambiguity.
2. Ensure entity requirements are enforced only where truly needed.

Frontend scope:
1. Share flow:
   - clarify what is being shared: agenda, program, or meeting
   - enforce linkage only if required by the share contract
2. Publish/program flow:
   - require linked meeting or event only if the public program depends on it
3. Conduct flow:
   - make it explicitly meeting-based if that remains the product rule
   - if conduct can start from program data directly, redesign accordingly
4. Announcement flow:
   - keep event-triggered prompt and manual later management
   - ensure announcements remain independent from plan content by default

Dependencies:
1. Final business rules for publish/share/conduct requirements.
2. Backend support for whichever entity becomes canonical for each workflow.

Exit criteria:
1. Users can complete publish, share, and conduct workflows from the correct entity context.
2. Required linkage states are enforced consistently.

### Phase 7: Command, Widget, And Copy Cleanup
Status: Partially started

Goals:
1. Remove the remaining meeting-centric language leaks across the product.
2. Align peripheral UI with the new IA and domain model.

Frontend scope:
1. Command palette:
   - add separate actions for agenda, program, meeting, and event
   - remove old single “create meeting” assumption
2. Dashboard widgets:
   - reword CTAs to point to create hub or specific entities as appropriate
3. Empty states and toast copy:
   - use “agenda”, “program”, “meeting”, and “event” precisely
4. Help/docs surfaces inside the app:
   - update any user-facing documentation links and embedded help copy

Exit criteria:
1. Global utility surfaces match the new product model.
2. Terminology is consistent across primary UI, secondary UI, and supporting UI.

### Phase 8: Legacy Containment
Status: Not started

Goals:
1. Keep compatibility for edge users without making legacy visible to mainstream users.
2. Reduce support burden caused by exposing transitional concepts.

Frontend scope:
1. Ensure legacy routes are not discoverable through primary nav, overview cards, or default commands.
2. If needed, place rare-access legacy entry points behind:
   - support-only links
   - account/settings level access
   - internal/operator surfaces
3. Add clear visual framing if a user lands on a legacy route directly:
   - this is an older workflow
   - preferred replacement path

Exit criteria:
1. Legacy remains functional for the small affected group.
2. Normal users do not encounter legacy by accident.

### Phase 9: Final QA And Hardening
Status: Not started

Goals:
1. Ensure the transformed frontend behaves coherently across desktop and mobile.
2. Remove transitional inconsistencies before rollout.

Frontend scope:
1. Navigation QA
2. Create-flow QA
3. Linkage-flow QA
4. Builder QA
5. Share/publish/conduct QA
6. Permission and role QA
7. Mobile and responsive QA
8. Copy consistency review

Exit criteria:
1. No mainstream path exposes contradictory entity rules.
2. No critical workflow requires users to understand legacy concepts.
3. The UI consistently expresses the event/meeting/plan separation.

## Recommended Implementation Order From Today
1. Finish Phase 2 polish on Agendas and Programs.
2. Build Phase 3 link-later actions and gating.
3. Design and implement Phase 4 detail-surface split.
4. Perform Phase 5 builder split once detail routes and backend contracts are stable.
5. Reconnect downstream workflows in Phase 6.
6. Finish cleanup and containment in Phases 7 and 8.
7. Run final QA in Phase 9.

## Acceptance Criteria For Overall Completion
The frontend transformation is complete when all of the following are true:

1. Users can create agendas, programs, meetings, and events independently.
2. Users can link these entities later from explicit UI actions.
3. Agendas and Programs are clearly first-class workspaces with dedicated list and detail experiences.
4. Meetings and Events are clearly distinct entities with their own detail contexts.
5. Publish/share/conduct flows enforce only the minimum required linkage.
6. Legacy workflows are hidden from normal discovery.
7. Major user-facing copy no longer conflates plans, meetings, and events.
8. Desktop and mobile navigation both reflect the same IA contract.

## Suggested Tracking Method
Track each phase with:
1. Scope doc or implementation plan
2. Backend dependency checklist
3. Frontend deliverables
4. Acceptance checklist
5. QA checklist

Recommended execution style:
1. Ship in small phases behind coherent UI boundaries.
2. Avoid mixed-mode pages where old and new mental models compete in the same surface.
3. Prefer explicit temporary constraints over ambiguous transitional behavior.
