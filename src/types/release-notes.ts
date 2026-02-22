export type ReleaseNoteStatus = 'draft' | 'published';

export interface ReleaseNoteItem {
  type: 'feature' | 'fix';
  text: string;
}

export interface ReleaseNote {
  id: string;
  title: string;
  version: string | null;
  content: ReleaseNoteItem[];
  status: ReleaseNoteStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
