export interface ZoomTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds until expiry
  token_type: string;
  scope: string;
}

export interface ZoomMeetingResponse {
  id: number;
  join_url: string;
  start_url: string;
  topic: string;
  start_time: string;
  password?: string;
}

export interface ZoomMeetingUpdatePayload {
  topic?: string;
  start_time?: string;
  timezone?: string;
  duration?: number; // minutes
}
