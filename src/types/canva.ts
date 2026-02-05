// Canva integration types

// Export status for designs
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Event design record
export interface EventDesign {
  id: string;
  event_id: string;
  workspace_id: string;
  canva_design_id: string;
  canva_edit_url: string | null;
  edit_url_expires_at: string | null;
  title: string;
  width: number;
  height: number;
  export_status: ExportStatus;
  export_job_id: string | null;
  storage_path: string | null;
  public_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Canva design type
export interface CanvaDesignType {
  type: 'custom';
  width: number;
  height: number;
}

// Create design request
export interface CreateDesignRequest {
  event_id: string;
  title?: string;
  width?: number;
  height?: number;
}

// Create design response from Canva API
export interface CanvaCreateDesignResponse {
  design: {
    id: string;
    owner: {
      user_id: string;
      team_id?: string;
    };
    urls: {
      edit_url: string;
      view_url: string;
    };
    created_at: number;
    updated_at: number;
    title?: string;
    thumbnail?: {
      width: number;
      height: number;
      url: string;
    };
  };
}

// Export design request
export interface ExportDesignRequest {
  design_id: string;
  format?: 'png' | 'jpg' | 'pdf';
}

// Canva export job response
export interface CanvaExportJobResponse {
  job: {
    id: string;
    status: 'in_progress' | 'success' | 'failed';
    result?: {
      type: 'png' | 'jpg' | 'pdf';
      urls: string[];
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

// Export status response for polling
export interface ExportStatusResponse {
  job_id: string;
  status: 'in_progress' | 'success' | 'failed';
  download_url?: string;
  error?: string;
}

// Save design request
export interface SaveDesignRequest {
  download_url: string;
}

// OAuth state stored in cookie
export interface CanvaOAuthState {
  code_verifier: string;
  workspace_id: string;
  app_id: string;
  redirect_after: string;
}

// Token response from Canva OAuth
export interface CanvaTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Design modal state
export interface DesignModalState {
  isOpen: boolean;
  eventId: string | null;
  eventTitle: string | null;
  designs: EventDesign[];
  isLoading: boolean;
  isCreating: boolean;
  isExporting: boolean;
  error: string | null;
}

// Event data for reference panel (copy-to-clipboard)
export interface EventReferenceData {
  title: string;
  date: string;
  time: string;
  location: string | null;
  description: string | null;
}

// Preset design sizes
export interface DesignPreset {
  name: string;
  width: number;
  height: number;
  description: string;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    description: 'Square format for Instagram',
  },
  {
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    description: 'Vertical format for stories',
  },
  {
    name: 'Invitation (Portrait)',
    width: 480,
    height: 672,
    description: 'Standard invitation card',
  },
  {
    name: 'Invitation (Landscape)',
    width: 672,
    height: 480,
    description: 'Horizontal invitation card',
  },
  {
    name: 'Flyer (Letter)',
    width: 816,
    height: 1056,
    description: 'US Letter size flyer',
  },
  {
    name: 'Flyer (A4)',
    width: 794,
    height: 1123,
    description: 'A4 size flyer',
  },
];
