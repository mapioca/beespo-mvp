# **Engineering Design Brief: Meetings v2 + Event-First IA + Secondary Pane**

### **Summary**

We are re-architecting Meetings because the current model conflates three separate concepts:

1. Meeting (a scheduled occurrence/workflow container)
2. Agenda (collaboration/decision artifact)
3. Program (audience-facing sequence/conducting artifact)

This conflation has created domain ambiguity, UI inconsistency, and growing implementation complexity.

Target state is an **event-first stack** with explicit layering:

- Event = canonical time/place occurrence
- Meeting = optional Beespo workflow layer attached to an event
- Plan = optional meeting plan, typed as agenda or program

In parallel, IA work introduces a **secondary pane (L1 context navigation)** for domains that have meaningful sub-modes. This is required to reduce primary-nav overload and make the new Event/Meeting/Plan stack discoverable and coherent.

---

## **1) Why We Are Making This Change (Technical Context)**

### **Current technical issues**

1. **Semantic overload in meetings**
    - Current model treats meetings as if they are always agendas.
    - “Program mode” was added into agenda workflows, creating mixed concerns in a single entity.
2. **Rule collisions**
    - Agenda-only capabilities (discussion/collaboration/voting) and Program-only capabilities (conducting/program procedural flows) coexist in one object.
    - This drives brittle conditional logic in backend and frontend.
3. **Split scheduling truth**
    - Calendar already has events, but meetings also represent schedule via scheduled_date.
    - Calendar pages currently merge events and meetings at query/render time, which is an anti-pattern for long-term consistency.
4. **Navigation/IA mismatch**
    - Primary sidebar carries too much section-specific detail.
    - Local workflows are distributed between chips/tabs/page controls without stable section-level navigation.

### **Product/engineering goals**

1. Restore clean domain boundaries.
2. Keep event workflows simple for non-meeting events.
3. Enable meeting workflows only when needed.
4. Make agenda/program explicit and type-safe.
5. Reduce future feature complexity and regression surface.
6. Introduce IA structure that scales (secondary pane).

---

## **2) Target Domain Architecture (Event-First)**

### **Canonical stack**

1. **Event (required base object)**
    - Temporal + location + recurrence + source metadata
    - Exists for all calendar occurrences
    - Can exist with no meeting layer
2. **Meeting (optional, attached to event)**
    - Workflow-enabled record for collaborative/church meeting operations
    - Adds Beespo capabilities: sharing, Zoom, role/permission flows, etc.
    - meeting.event_id is required when meeting exists
3. **Meeting Plan (optional, attached to meeting)**
    - Discriminated by type:
        - agenda
        - program
    - Meeting may exist with no plan

### **Key business semantics**

- Meeting != Agenda
- Meeting != Program
- Meeting may have Agenda or Program or neither

---

## **3) IA + Shell Architecture (including Secondary Pane)**

### **Navigation levels contract**

- L0: Global domains (primary sidebar)
- L1: Section destinations (secondary pane)
- L2: In-page controls (filters/sort/search/actions)
- L3: Object details pane (right side, non-navigational)

### **Why secondary pane is required**

Without L1, we overload either:

- primary sidebar (too many deep items), or
- page-level toolbars (too much persistent control clutter).

Secondary pane solves:

1. **Context separation**: global app map vs section-specific map
2. **Cognitive load reduction**: only show what is relevant in current domain
3. **Scalability**: supports Event-first model with explicit section modes

### **Proposed domains**

1. **Schedule (L0)**
    - L1: Calendar, Events, Settings
2. **Meetings (L0)**
- L1: Overview, Agendas, Programs, Assignments, Announcements

Notes:

- L1 entries are URL-backed section destinations.
- L2 controls stay contextual within each L1 page.
- Favorites/Recents remain global quick access, not L1.

---

## **4) Announcement Workflow Contract**

### **Finalized behavior**

- Prompt once at event creation: “Create announcement for this event?”
- Allow manual create/update later from event/meeting context.
- No automatic plan-stage rewriting based on agenda/program.

### **Why**

Announcements are read in other meetings and must remain concise/oral.

Automatic enrichment from full plan detail is usually noise, not value.

---

## **5) Data Model Target Changes (Engineering Scope)**

### **Existing model adjustments**

1. events becomes canonical schedule source.
2. meetings gains required event_id (for all non-legacy/new meetings).
3. Existing meetings.scheduled_date becomes transitional/derived/deprecated (migration-phase decision).

### **New/updated entities (logical contract)**

1. meetings
    - id
    - workspace_id
    - event_id (FK -> events.id)
    - meeting workflow metadata (status, sharing, Zoom, ownership, etc.)
    - plan metadata:
        - meeting_plan_type nullable (agenda|program) if plan attached
2. agenda_documents (or equivalent typed agenda root)
    - 1:1 with meeting where plan type is agenda
3. program_documents (or equivalent typed program root)
    - 1:1 with meeting where plan type is program
4. discussion_items (agenda-only)
    - required: topic, estimated_time
    - optional notes
    - child: action points
5. program_segments (program-only)
    - required: title, estimated_time
    - optional: description
    - optional assignees
    - segment typed support for prayer/hymn/spiritual/custom where needed
6. libraries
    - discussion_item_library
    - segment_library

### **Relationship constraints**

1. Meeting references exactly one event.
2. Meeting has at most one active plan type.
3. Agenda/program tables are mutually exclusive per meeting.
4. Plan-specific child entities enforce parent type validity.

---

## **6) API / Interface Contract Changes**

### **Command surfaces**

1. **Create Event**
    - Creates event only
    - Optional announcement prompt
2. **Enable Meeting Features**
    - Input: event_id
    - Output: creates meeting linked to event (if not exists)
3. **Attach Plan**
    - Input: meeting_id, meeting_plan_type (agenda or program)
    - Creates typed plan root and activates type
4. **Plan-specific operations**
    - Agenda endpoints operate only on agenda meetings
    - Program endpoints operate only on program meetings

### **Read surfaces**

All meeting reads must include:

1. event data (canonical schedule/location)
2. meeting workflow data
3. optional plan discriminator + typed payload

---

## **7) Frontend Architecture Changes**

### **Schedule surfaces**

1. Calendar and Events render from canonical events
2. Meeting-backed events expose “Open meeting” and “Enable meeting features” states

### **Meeting surfaces**

1. Meeting page supports 3 states:
    - no plan attached
    - agenda attached
    - program attached
2. Module gating:
    - agenda modules only for agenda type
    - program modules only for program type
    - shared modules available in both when applicable

### **Shell changes**

1. Add optional secondary pane region next to primary sidebar for L1 context
2. Domain-aware L1 pane population
3. Hide secondary pane for domains without meaningful L1 complexity (future rule)

---

## **8) Legacy Compatibility Strategy**

### **Chosen strategy**

Compatibility-lite:

1. Preserve existing agendas/meetings as legacy_read_only
2. Keep markdown snapshot as source representation
3. Block edits to legacy records
4. Offer manual “Rebuild as new Agenda/Program” flow (optional)

### **Why this strategy**

- Legacy volume is small.
- Full auto-conversion has high complexity and high semantic error risk.
- Read-only preservation protects history with low migration risk.

---

## **9) Rollout Plan (Technical Phases)**

1. **Phase A: IA shell groundwork**
    - Introduce secondary pane framework and domain-aware L1 rendering
    - No behavior change to data model yet
2. **Phase B: Event-first meeting linkage**
    - Add meeting.event_id path and new creation flow
    - Keep existing reads functional during transition
3. **Phase C: Plan split**
    - Introduce agenda/program typed document roots
    - Add module gating and plan attachment UX
4. **Phase D: Announcement workflow alignment**
    - Prompt-on-event-create only
    - manual later actions in event/meeting contexts
5. **Phase E: Legacy lock**
    - mark legacy read-only
    - expose rebuild actions
    - retire legacy edit paths

---

## **10) Test Plan (Decision-Critical Scenarios)**

### **Domain consistency**

1. Event can exist without meeting.
2. Meeting cannot exist without event (new path).
3. Meeting can exist without plan.
4. Meeting has only one active plan type at a time.

### **Workflow correctness**

1. Event creation prompts announcement once.
2. Enable meeting from event works and links correctly.
3. Attach agenda/program works from no-plan state.
4. Agenda-only and program-only modules are correctly gated.

### **IA/shell behavior**

1. L1 pane reflects current L0 domain.
2. L2 controls remain contextual (no persistent clutter).
3. Right details pane remains object-level context only.

### **Legacy behavior**

1. Legacy records open and render.
2. Legacy records are non-editable.
3. Rebuild flow creates new editable records without mutating legacy source.

---

## **11) Non-Goals (v1)**

1. Automatic semantic migration of legacy content into typed agenda/program docs.
2. Full bi-directional sync between old and new meeting schemas.
3. Introducing new announcement authoring complexity tied to plan lifecycle stages.

---

## **12) Assumptions**

1. events remains the canonical temporal table.
2. Secondary pane adoption is approved as shell direction for complex domains.
3. Agenda/program split is a product-level commitment, not experimental.
4. Legacy read-only is acceptable for historical records.