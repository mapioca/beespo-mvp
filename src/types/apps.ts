// Apps Hub types for marketplace integrations

// App status in workspace
export type WorkspaceAppStatus = 'pending' | 'connected' | 'disconnected' | 'error';

// App categories
export type AppCategory = 'design' | 'productivity' | 'communication' | 'analytics';

// Available features that apps can unlock
export type AppFeature = 'event_invitations' | 'design_studio';

// App from the marketplace
export interface App {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: AppCategory | null;
  is_active: boolean;
  requires_oauth: boolean;
  oauth_scopes: string[];
  features: AppFeature[];
  created_at: string;
}

// App connected to a workspace
export interface WorkspaceApp {
  id: string;
  workspace_id: string;
  app_id: string;
  connected_by: string | null;
  status: WorkspaceAppStatus;
  settings: Record<string, unknown>;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  app?: App;
}

// OAuth token for an app
export interface AppToken {
  id: string;
  user_id: string;
  app_id: string;
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

// Workspace app with joined app data (for display)
export interface WorkspaceAppWithApp extends WorkspaceApp {
  app: App;
}

// API response for listing apps
export interface AppsListResponse {
  apps: App[];
}

// API response for workspace apps
export interface WorkspaceAppsResponse {
  workspaceApps: WorkspaceAppWithApp[];
}

// Add app to workspace request
export interface AddAppRequest {
  app_slug: string;
}

// App connection state for UI
export interface AppConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  status: WorkspaceAppStatus | null;
  error: string | null;
}

// Check if a specific feature is enabled
export function hasFeature(workspaceApps: WorkspaceAppWithApp[], feature: AppFeature): boolean {
  return workspaceApps.some(
    (wa) => wa.status === 'connected' && wa.app.features.includes(feature)
  );
}

// Check if Canva is connected
export function isCanvaConnected(workspaceApps: WorkspaceAppWithApp[]): boolean {
  return workspaceApps.some(
    (wa) => wa.app.slug === 'canva' && wa.status === 'connected'
  );
}
