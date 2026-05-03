import type { UserRole } from '@/types/database';

export const ALL_ROLES = ['owner', 'admin', 'editor', 'commenter', 'viewer'] as const;

export const EDIT_ROLES = ['owner', 'admin', 'editor'] as const;
export const MANAGE_ROLES = ['owner', 'admin'] as const;
export const INVITABLE_ROLES = ['admin', 'editor', 'commenter', 'viewer'] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const canEdit = (role?: string | null): boolean =>
    !!role && (EDIT_ROLES as readonly string[]).includes(role);

export const canManage = (role?: string | null): boolean =>
    !!role && (MANAGE_ROLES as readonly string[]).includes(role);

export const isOwner = (role?: string | null): boolean => role === 'owner';

export const isInvitableRole = (role: unknown): role is InvitableRole =>
    typeof role === 'string' && (INVITABLE_ROLES as readonly string[]).includes(role);

const ROLE_LABELS: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    editor: 'Editor',
    commenter: 'Commenter',
    viewer: 'Viewer',
};

export const formatRoleLabel = (role?: string | null): string => {
    if (!role) return '';
    return ROLE_LABELS[role as UserRole] ?? role.charAt(0).toUpperCase() + role.slice(1);
};
