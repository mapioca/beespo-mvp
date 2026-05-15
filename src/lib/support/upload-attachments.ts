"use client";

import { put } from "@vercel/blob/client";

import { sanitizeFilename } from "./attachment-policy";

interface BlobClientTokenResponse {
  clientToken?: string;
  error?: string;
}

/**
 * Reference to a file that has been uploaded to Vercel Blob and is ready
 * to be forwarded to Jira by the API route. Kept intentionally narrow —
 * the server re-validates and refuses to trust any of these fields without
 * fetching and inspecting the actual bytes.
 */
export interface UploadedAttachmentRef {
  url: string;
  pathname: string;
  name: string;
  type: string;
  size: number;
}

async function getBlobClientToken(pathname: string): Promise<string> {
  const response = await fetch("/api/support/blob-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname,
        clientPayload: null,
        multipart: false,
      },
    }),
  });

  let data: BlobClientTokenResponse = {};
  try {
    data = (await response.json()) as BlobClientTokenResponse;
  } catch {
    // Keep the fallback below when the route returns a non-JSON error page.
  }

  if (!response.ok || !data.clientToken) {
    throw new Error(
      data.error ||
        "Unable to start the attachment upload. Please try again or contact support."
    );
  }

  return data.clientToken;
}

/**
 * Upload each File directly to Vercel Blob via `/api/support/blob-token`.
 * Uploads run in parallel; if any one fails, the entire batch rejects so
 * the caller can surface a single error to the user.
 */
export async function uploadAttachmentsToBlob(
  files: File[]
): Promise<UploadedAttachmentRef[]> {
  if (files.length === 0) return [];

  const uploads = files.map(async (file) => {
    const safeName = sanitizeFilename(file.name);
    const pathname = `support-attachments/${safeName}`;
    const token = await getBlobClientToken(pathname);
    const blob = await put(pathname, file, {
      access: "private",
      token,
      contentType: file.type,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      name: safeName,
      type: file.type,
      size: file.size,
    } satisfies UploadedAttachmentRef;
  });

  return Promise.all(uploads);
}
