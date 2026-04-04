# Canonical UI Migration Notes

This file lists existing components that overlap with the canonical UI primitives in `src/components/ui`.
Use it to plan Phase 5 migrations. No page migrations were performed here.

## Button
Existing purpose-overlap components:
- `src/components/apps/add-app-button.tsx`
- `src/components/auth/google-oauth-button.tsx`
- `src/components/canva/design-invitation-button.tsx`
- `src/components/conduct/timestamp-button.tsx`
- `src/components/navigation/favorite-button.tsx`
- `src/components/meetings/meeting-favorite-button.tsx`

## Input / Textarea / Select / Checkbox / Radio
Existing purpose-overlap components:
- `src/components/auth/invite-code-input.tsx`
- `src/components/mfa/totp-input.tsx`
- `src/components/admin/mfa/totp-input.tsx`
- `src/components/meetings/editable/inline-input.tsx`
- `src/components/meetings/editable/inline-combobox.tsx`
- `src/components/settings/member-search-input.tsx`
- `src/components/tables/renderer/cells/select-cell.tsx`
- `src/components/tables/renderer/cells/multi-select-cell.tsx`
- `src/components/tables/renderer/cells/checkbox-cell.tsx`

## Card
Existing purpose-overlap components:
- `src/components/apps/app-card.tsx`
- `src/components/callings/calling-card.tsx`
- `src/components/callings/calling-board-card.tsx`
- `src/components/callings/candidate-pool-card.tsx`
- `src/components/callings/consideration-pool-card.tsx`
- `src/components/dashboard/widgets/kpi-card.tsx`
- `src/components/dashboard/widgets/widget-card.tsx`
- `src/components/notebooks/notebook-card.tsx`
- `src/components/tasks/task-card.tsx`
- `src/components/settings/sharing-group-card.tsx`
- `src/components/templates/library/template-library-card.tsx`
- `src/components/landing/editorial-card.tsx`

## Modal / Dialog
Existing purpose-overlap components:
- `src/components/admin/invitations/create-invitation-dialog.tsx`
- `src/components/admin/users/invite-user-dialog.tsx`
- `src/components/auth/delete-account-dialog.tsx`
- `src/components/auth/terms-of-service-dialog.tsx`
- `src/components/calendar/calendar-settings-dialog.tsx`
- `src/components/calendar/create-event-dialog.tsx`
- `src/components/callings/calling-detail-modal.tsx`
- `src/components/canva/design-invitation-modal.tsx`
- `src/components/common/create-view-dialog.tsx`
- `src/components/conduct/share-dialog.tsx`
- `src/components/events/event-dialog.tsx`
- `src/components/forms/share-form-modal.tsx`
- `src/components/meetings/add-item-dialog.tsx`
- `src/components/meetings/add-meeting-item-dialog.tsx`
- `src/components/meetings/create-speaker-dialog.tsx`
- `src/components/meetings/create-view-dialog.tsx`
- `src/components/meetings/hymn-selector-modal.tsx`
- `src/components/meetings/preview-modal.tsx`
- `src/components/meetings/unified-selector-modal.tsx`
- `src/components/meetings/validation-modal.tsx`
- `src/components/notebooks/create-notebook-modal.tsx`
- `src/components/participants/create-directory-view-dialog.tsx`
- `src/components/participants/create-tag-dialog.tsx`
- `src/components/participants/manage-tags-dialog.tsx`
- `src/components/release-notes/release-note-modal.tsx`
- `src/components/support/support-modal.tsx`
- `src/components/tasks/create-task-dialog.tsx`
- `src/components/tasks/task-completion-dialog.tsx`
- `src/components/tasks/task-labels-dialog.tsx`
- `src/components/team/invite-member-dialog.tsx`
- `src/components/templates/add-template-item-dialog.tsx`
- `src/components/templates/library/template-preview-dialog.tsx`
- `src/components/tables/dialogs/add-column-dialog.tsx`
- `src/components/tables/dialogs/delete-column-dialog.tsx`
- `src/components/tables/dialogs/edit-column-dialog.tsx`
- `src/components/tables/dialogs/recover-column-dialog.tsx`

## Dropdown / Popover
Existing purpose-overlap components:
- `src/components/participants/tag-filter-dropdown.tsx`
- `src/components/tasks/task-status-dropdown.tsx`
- `src/components/meetings/builder/announcement-selector-popover.tsx`
- `src/components/meetings/builder/business-selector-popover.tsx`
- `src/components/meetings/builder/discussion-selector-popover.tsx`
- `src/components/meetings/builder/hymn-selector-popover.tsx`
- `src/components/meetings/builder/participant-selector-popover.tsx`
- `src/components/meetings/builder/speaker-selector-popover.tsx`
- `src/components/meetings/editable/hymn-popover.tsx`
- `src/components/meetings/editable/participant-popover.tsx`

## Badge
Existing purpose-overlap components:
- `src/components/meetings/meeting-share-badge.tsx`
- `src/components/meetings/meeting-status-badge.tsx`
- `src/components/meetings/meeting-type-badge.tsx`

## Table
Existing purpose-overlap components:
- `src/components/admin/invitations/invitations-data-table.tsx`
- `src/components/admin/release-notes/release-notes-data-table.tsx`
- `src/components/admin/users/users-data-table.tsx`
- `src/components/announcements/announcements-table.tsx`
- `src/components/business/business-table.tsx`
- `src/components/discussions/discussions-table.tsx`
- `src/components/events/events-table.tsx`
- `src/components/forms/forms-table.tsx`
- `src/components/meetings/meetings-table.tsx`
- `src/components/participants/directory-table.tsx`
- `src/components/speakers/speakers-table.tsx`
- `src/components/tables/tables-list-table.tsx`
- `src/components/tables/renderer/table-renderer.tsx`
- `src/components/tasks/tasks-table.tsx`

## Toast / Notifications
Existing purpose-overlap components:
- `src/components/ui/toast-container.tsx` (standardized)
- `src/components/ui/toast-pill.tsx` (standardized)
- `src/lib/toast.ts` (store + API)

## EmptyState
Ad-hoc empty-state implementations to migrate:
- `src/app/app-shell-preview/page.tsx` (`EmptyStatePreview`)
- `src/components/events/events-table.tsx`
- `src/components/forms/forms-table.tsx`
- `src/components/tasks/tasks-table.tsx`
- `src/components/speakers/speakers-table.tsx`
- `src/components/business/business-table.tsx`
- `src/components/calendar/events/events-list-client.tsx`

## Avatar
Purpose-overlap usages to audit:
- `src/components/dashboard/sidebar-user-profile.tsx`
- `src/components/tables/renderer/cells/user-link-cell.tsx`
- `src/components/participants/participant-drawer.tsx`

## Tooltip
Custom tooltip-like implementations to migrate:
- `src/components/meetings/builder/toolbox-pane.tsx` (hover helper patterns)
- `src/components/meetings/builder/icon-picker.tsx` (hover helper patterns)

