// Canva API client

import type {
  CanvaCreateDesignResponse,
  CanvaExportJobResponse,
} from '@/types/canva';

const CANVA_API_BASE = 'https://api.canva.com/rest/v1';

/**
 * Canva API client for making authenticated requests
 */
export class CanvaClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${CANVA_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Canva API error (${response.status}):`, error);
      throw new Error(`Canva API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a new design in Canva
   */
  async createDesign(
    title: string,
    width: number,
    height: number
  ): Promise<CanvaCreateDesignResponse> {
    return this.request<CanvaCreateDesignResponse>('/designs', {
      method: 'POST',
      body: JSON.stringify({
        design_type: {
          type: 'custom',
          width,
          height,
        },
        title,
      }),
    });
  }

  /**
   * Get design details
   */
  async getDesign(designId: string): Promise<CanvaCreateDesignResponse> {
    return this.request<CanvaCreateDesignResponse>(`/designs/${designId}`);
  }

  /**
   * Start an export job for a design
   */
  async startExport(
    designId: string,
    format: 'png' | 'jpg' | 'pdf' = 'png'
  ): Promise<CanvaExportJobResponse> {
    return this.request<CanvaExportJobResponse>('/exports', {
      method: 'POST',
      body: JSON.stringify({
        design_id: designId,
        format: {
          type: format,
        },
      }),
    });
  }

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<CanvaExportJobResponse> {
    return this.request<CanvaExportJobResponse>(`/exports/${jobId}`);
  }

  /**
   * Poll export job until completion
   */
  async waitForExport(
    jobId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<CanvaExportJobResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getExportStatus(jobId);

      if (status.job.status === 'success' || status.job.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Export job timed out');
  }
}

/**
 * Download an image from a URL and return as buffer
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
