import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import {
  ATTACHMENT_RULES,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/support/attachment-policy';

const ALLOWED_CONTENT_TYPES = ATTACHMENT_RULES.map((r) => r.mime);

/**
 * Mint short-lived client upload tokens for support-ticket attachments.
 *
 * The browser calls this before uploading with `@vercel/blob/client`. We
 * authenticate the caller and pin the token to the allow-listed MIME types
 * and per-file size cap so the upload that actually lands in Blob storage
 * is already constrained. The API route at /api/support/create-ticket then
 * re-validates the bytes (magic-byte sniff, sanitize filename) before
 * forwarding to Jira and deletes the blob.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[Blob Token] BLOB_READ_WRITE_TOKEN is not configured');
    return NextResponse.json(
      {
        error:
          'Attachment uploads are not configured. Please set BLOB_READ_WRITE_TOKEN in Vercel.',
      },
      { status: 503 }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
        addRandomSuffix: true,
        // Cleanup is handled in /api/support/create-ticket after the
        // attachment is forwarded to Jira, so no payload is needed here.
        tokenPayload: JSON.stringify({ userId: user.id }),
      }),
      onUploadCompleted: async () => {
        // Intentionally a no-op. Vercel can't reach localhost for this
        // callback during dev anyway. Cleanup happens server-side when
        // the ticket is created.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error('[Blob Token] handleUpload failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate upload token' },
      { status: 400 }
    );
  }
}
