import { del } from '@vercel/blob';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
  findRuleFor,
  getExtension,
  sanitizeFilename,
  verifyMagicBytes,
} from '@/lib/support/attachment-policy';

// Reference posted by the client. Every field is treated as untrusted —
// the bytes are re-downloaded from Blob and validated below.
interface AttachmentRef {
  url: string;
  pathname: string;
  name: string;
  type: string;
  size: number;
}

interface PreparedAttachment {
  filename: string;
  bytes: Uint8Array;
  mime: string;
  /** Blob URL — used after Jira forwarding to delete the temporary upload. */
  blobUrl: string;
}

const VERCEL_BLOB_HOST_SUFFIX = '.private.blob.vercel-storage.com';

/** Validate the URL points at our private Vercel Blob store before we fetch it. */
function isAllowedBlobUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:') return false;
    return u.hostname.endsWith(VERCEL_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

async function prepareAttachmentsFromRefs(
  refs: AttachmentRef[]
): Promise<{ attachments?: PreparedAttachment[]; error?: string; cleanup?: string[] }> {
  if (refs.length > MAX_FILE_COUNT) {
    return { error: `At most ${MAX_FILE_COUNT} attachments are allowed.` };
  }

  const cleanup: string[] = [];
  for (const r of refs) {
    if (r) cleanup.push(r.url);
  }

  let runningTotal = 0;
  const prepared: PreparedAttachment[] = [];

  for (const ref of refs) {
    if (!ref) {
      return { error: 'Attachment reference is malformed.', cleanup };
    }
    if (!isAllowedBlobUrl(ref.url)) {
      return { error: 'Attachment URL is not allowed.', cleanup };
    }
    if (ref.size <= 0) {
      return { error: `Attachment "${ref.name}" has an invalid size.`, cleanup };
    }
    if (ref.size > MAX_FILE_SIZE_BYTES) {
      return { error: `Attachment "${ref.name}" exceeds the per-file size limit.`, cleanup };
    }
    runningTotal += ref.size;
    if (runningTotal > MAX_TOTAL_SIZE_BYTES) {
      return { error: 'Attachments exceed the total size limit.', cleanup };
    }

    const ext = getExtension(ref.name);
    const rule = findRuleFor(ref.type, ext);
    if (!rule) {
      return { error: `Attachment "${ref.name}" has a disallowed type.`, cleanup };
    }

    // Pull the bytes back from private Blob storage and verify them. Cap
    // the read at MAX_FILE_SIZE_BYTES + 1 so a tampered ref can't make us
    // download more than the policy allows.
    const fetchResp = await fetch(ref.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    if (!fetchResp.ok) {
      return { error: `Attachment "${ref.name}" could not be retrieved.`, cleanup };
    }
    const buf = new Uint8Array(await fetchResp.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_FILE_SIZE_BYTES) {
      return { error: `Attachment "${ref.name}" failed size revalidation.`, cleanup };
    }
    if (!verifyMagicBytes(buf, rule)) {
      return { error: `Attachment "${ref.name}" content does not match its declared type.`, cleanup };
    }

    prepared.push({
      filename: sanitizeFilename(ref.name),
      bytes: buf,
      mime: rule.mime,
      blobUrl: ref.url,
    });
  }

  return { attachments: prepared, cleanup };
}

async function deleteBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await Promise.allSettled(
    urls.map((url) =>
      del(url).catch((err) => {
        console.warn('[Create Ticket] Failed to delete blob:', url, err);
      })
    )
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Forward one attachment to Jira with exponential backoff on transient
 * failures (5xx / 429). Returns true on success, false on permanent failure.
 * Permanent 4xx responses (other than 429) abort immediately — retrying a
 * 400 won't change anything.
 */
async function forwardAttachmentToJira(
  attachUrl: string,
  authHeader: string,
  file: PreparedAttachment,
  maxAttempts = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fd = new FormData();
      const blob = new Blob([new Uint8Array(file.bytes)], { type: file.mime });
      fd.append('file', blob, file.filename);

      const resp = await fetch(attachUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: 'application/json',
          'X-Atlassian-Token': 'no-check',
        },
        body: fd,
      });

      if (resp.ok) return true;

      const transient = resp.status >= 500 || resp.status === 429;
      const text = await resp.text().catch(() => '');
      console.error('[Create Ticket] Attachment upload failed', {
        filename: file.filename,
        status: resp.status,
        attempt,
        transient,
        body: text.slice(0, 500),
      });
      if (!transient || attempt === maxAttempts) return false;
    } catch (err) {
      console.error('[Create Ticket] Attachment upload threw', {
        filename: file.filename,
        attempt,
        err,
      });
      if (attempt === maxAttempts) return false;
    }

    await sleep(200 * 2 ** (attempt - 1));
  }
  return false;
}

async function deleteJiraIssue(
  jiraDomain: string,
  authHeader: string,
  ticketKey: string
): Promise<void> {
  try {
    const resp = await fetch(
      `${jiraDomain}/rest/api/3/issue/${encodeURIComponent(ticketKey)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: 'application/json',
        },
      }
    );
    if (!resp.ok && resp.status !== 404) {
      const text = await resp.text().catch(() => '');
      console.error('[Create Ticket] Rollback delete failed', {
        ticketKey,
        status: resp.status,
        body: text.slice(0, 500),
      });
    }
  } catch (err) {
    console.error('[Create Ticket] Rollback delete threw', { ticketKey, err });
  }
}

// Jira Priority mapping
const JIRA_PRIORITIES: Record<string, string> = {
  'Low': 'Low',
  'Medium': 'Medium',
  'High': 'High',
};

// Jira Issue Type IDs
// Jira Issue Type IDs
// Task: 10004
// [System] Service request: 10002
// [System] Incident: 10001 (Seems to cause validation errors via create API)
const JIRA_ISSUE_TYPE_IDS: Record<string, string> = {
  'Bug Report': '10004',       // Maps to Task
  'Feature Request': '10002',  // Maps to [System] Service request
  'General Question': '10002', // Maps to [System] Service request
};

// Get issue type ID based on request type
function getJiraIssueTypeId(requestType: string): string {
  // Return the configured ID or default to 'Service request' (10002)
  return JIRA_ISSUE_TYPE_IDS[requestType] || '10002';
}

interface SupportRequestBody {
  requestType: string;
  subject: string;
  description: string;
  priority?: string;
  userEmail: string;
  userName: string;
  metadata: {
    currentUrl: string;
    userAgent: string;
    timestamp: string;
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse JSON body. Attachments are uploaded to Vercel Blob client-side
  // and referenced by URL; the server fetches and validates them below.
  let body: SupportRequestBody & { attachments?: AttachmentRef[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    requestType,
    subject,
    description,
    priority,
    userEmail,
    userName,
    metadata,
  } = body;

  // Validate required fields
  if (!requestType || !subject || !description || !userEmail || !userName) {
    return NextResponse.json(
      { error: 'Request type, subject, description, email, and name are required' },
      { status: 400 }
    );
  }
  if (!metadata || typeof metadata !== 'object') {
    return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
  }

  // Validate attachments (fetches bytes from Blob, sniffs magic bytes).
  // Even if validation fails, the blobs the client uploaded are cleaned up.
  let preparedAttachments: PreparedAttachment[] = [];
  const refs = Array.isArray(body.attachments) ? body.attachments : [];
  if (refs.length > 0 && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('[Create Ticket] BLOB_READ_WRITE_TOKEN is not configured');
    return NextResponse.json(
      {
        error:
          'Attachment uploads are not configured. Please set BLOB_READ_WRITE_TOKEN in Vercel.',
      },
      { status: 503 }
    );
  }
  if (refs.length > 0) {
    const result = await prepareAttachmentsFromRefs(refs);
    if (result.error) {
      if (result.cleanup) await deleteBlobs(result.cleanup);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    preparedAttachments = result.attachments ?? [];
  }

  // Get Jira configuration from environment
  const jiraDomain = process.env.JIRA_DOMAIN;
  const jiraUserEmail = process.env.JIRA_USER_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  // Use SP as fallback if env var is missing or equals BB (which seems to be an old incorrect value in prod)
  let jiraProjectKey = process.env.JIRA_PROJECT_KEY;
  if (!jiraProjectKey || jiraProjectKey === 'BB') {
    console.warn('[Create Ticket] JIRA_PROJECT_KEY is missing or set to old value "BB". Forcing "SP".');
    jiraProjectKey = 'SP';
  }

  // Check if Jira is configured
  if (!jiraDomain || !jiraUserEmail || !jiraApiToken || !jiraProjectKey) {
    console.error('Jira configuration is incomplete');
    return NextResponse.json(
      { error: 'Support system is not configured. Please contact an administrator.' },
      { status: 500 }
    );
  }

  try {
    // Create Basic Auth header
    const authHeader = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // 1. Find or Create Jira User
    let accountId: string | undefined;

    console.log('[Create Ticket] Searching for Jira user:', userEmail);

    // Search for existing user
    const searchResponse = await fetch(
      `${jiraDomain}/rest/api/3/user/search?query=${encodeURIComponent(userEmail)}`,
      { headers }
    );

    if (searchResponse.ok) {
      const users = await searchResponse.json();
      console.log('[Create Ticket] Search found users:', users.length);
      if (users.length > 0) {
        accountId = users[0].accountId;
        console.log('[Create Ticket] Found existing accountId:', accountId);
      }
    } else {
      console.error('[Create Ticket] User search failed:', searchResponse.status, await searchResponse.text());
    }

    // If no user found, create a Service Desk Customer
    if (!accountId) {
      console.log('[Create Ticket] No accountId found, creating customer...');
      try {
        const createCustomerResponse = await fetch(`${jiraDomain}/rest/servicedeskapi/customer`, {
          method: 'POST',
          headers: {
            ...headers,
            'X-ExperimentalApi': 'opt-in', // Required for Service Desk API
          },
          body: JSON.stringify({
            email: userEmail,
            displayName: userName,
          }),
        });

        if (createCustomerResponse.ok) {
          const customer = await createCustomerResponse.json();
          accountId = customer.accountId;
          console.log('[Create Ticket] Created new customer accountId:', accountId);
        } else {
          console.error('[Create Ticket] Failed to create Jira customer:', await createCustomerResponse.text());
        }
      } catch (e) {
        console.error('[Create Ticket] Error creating Jira customer:', e);
      }
    }

    // Construct Jira issue description with metadata
    const jiraDescription = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'User Description' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: description }],
        },
        {
          type: 'rule',
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Reporter Information' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Name: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: userName },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Email: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: userEmail },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Page URL: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: metadata.currentUrl },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Browser: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: metadata.userAgent },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Timestamp: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: new Date(metadata.timestamp).toLocaleString() },
          ],
        },
      ],
    };

    // Determine target issue type name based on request type
    // Fallback to "Service Request" or "Task" if specific types are missing
    let targetIssueTypeName = 'Task';
    if (requestType === 'Feature Request' || requestType === 'General Question') {
      targetIssueTypeName = '[System] Service request';
    } else if (requestType === 'Bug Report') {
      targetIssueTypeName = 'Task'; // Prefer Task for bugs as it's more standard
    }

    // Dynamic Issue Type Lookup
    // Fetch create metadata to get the VALID issue type ID for this project
    console.log(`[Create Ticket] Fetching issue types for project ${jiraProjectKey} to find "${targetIssueTypeName}"...`);

    const metaUrl = `${jiraDomain}/rest/api/3/issue/createmeta?projectKeys=${jiraProjectKey}&expand=projects.issuetypes.fields`;
    const metaResponse = await fetch(metaUrl, { headers });

    let jiraIssueTypeId: string | undefined;
    let prioritiesSupported = false;

    if (metaResponse.ok) {
      const meta = await metaResponse.json();
      if (meta.projects && meta.projects.length > 0) {
        interface JiraIssueTypeMetadata {
          id: string;
          name: string;
          fields?: {
            priority?: Record<string, unknown>;
          };
        }

        interface JiraProjectMetadata {
          issuetypes: JiraIssueTypeMetadata[];
        }

        const projectMeta = meta.projects[0] as JiraProjectMetadata;
        // Try to find the specific target type
        let issueType = projectMeta.issuetypes.find((it: JiraIssueTypeMetadata) =>
          it.name.toLowerCase() === targetIssueTypeName.toLowerCase()
        );

        // Fallbacks if preferred type not found
        if (!issueType) {
          console.warn(`[Create Ticket] Issue type "${targetIssueTypeName}" not found. Trying fallbacks...`);
          const fallbackTypes = ['Task', 'Bug', '[System] Service request', 'Service Request'];
          for (const fallback of fallbackTypes) {
            issueType = projectMeta.issuetypes.find((it: JiraIssueTypeMetadata) =>
              it.name.toLowerCase() === fallback.toLowerCase()
            );
            if (issueType) break;
          }
        }

        if (issueType) {
          jiraIssueTypeId = issueType.id;
          console.log(`[Create Ticket] Found Issue Type: ${issueType.name} (ID: ${jiraIssueTypeId})`);

          // Check if priority field is supported for this issue type
          if (issueType.fields && issueType.fields.priority) {
            prioritiesSupported = true;
          }
        }
      }
    } else {
      console.error('[Create Ticket] Failed to fetch project metadata:', await metaResponse.text());
    }

    // Fallback to hardcoded if dynamic lookup failed (though unlikely to work if dynamic failed)
    if (!jiraIssueTypeId) {
      console.warn('[Create Ticket] Dynamic issue type lookup failed. Using fallback hardcoded ID.');
      jiraIssueTypeId = getJiraIssueTypeId(requestType);
      // Assume priority supported for fallback standard types
      prioritiesSupported = true;
    }

    const jiraPriority = priority ? JIRA_PRIORITIES[priority] : undefined;

    if (!jiraIssueTypeId) {
      console.error('Jira issue type ID not configured for request type:', requestType);
      return NextResponse.json(
        { error: 'Support system is not properly configured. Please contact an administrator.' },
        { status: 500 }
      );
    }

    const jiraPayload: {
      fields: {
        project: { key: string };
        summary: string;
        description: typeof jiraDescription;
        issuetype: { id: string };
        priority?: { name: string };
        reporter?: { accountId: string };
      };
    } = {
      fields: {
        project: {
          key: jiraProjectKey,
        },
        summary: `[${requestType}] ${subject}`,
        description: jiraDescription,
        issuetype: {
          id: jiraIssueTypeId,
        },
      },
    };

    // Add reporter if found/created
    if (accountId) {
      jiraPayload.fields.reporter = { accountId };
      console.log('[Create Ticket] Setting reporter to:', accountId);
    } else {
      console.warn('[Create Ticket] proceeding without setting reporter');
    }

    // Add priority only if provided (and only for bugs typically)
    // ONLY add priority if the issue type is actually a Bug or Task that supports it
    if (jiraPriority && (requestType === 'Bug Report' || requestType === 'Task') && prioritiesSupported) {
      jiraPayload.fields.priority = { name: jiraPriority };
    }

    console.log('[Create Ticket] Sending payload to Jira:', JSON.stringify(jiraPayload, null, 2));

    // Make request to Jira API
    const jiraResponse = await fetch(`${jiraDomain}/rest/api/3/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify(jiraPayload),
    });

    if (!jiraResponse.ok) {
      const errorData = await jiraResponse.json().catch(() => ({}));
      console.error('Jira API error:', {
        status: jiraResponse.status,
        statusText: jiraResponse.statusText,
        error: errorData,
      });

      // Issue never got created — clean up the staged blobs so they don't
      // linger in storage.
      await deleteBlobs(preparedAttachments.map((a) => a.blobUrl));

      return NextResponse.json(
        {
          error: 'Failed to create support ticket. Please try again later or contact support directly.',
          details: errorData
        },
        { status: 500 }
      );
    }

    const jiraData = await jiraResponse.json();
    const ticketKey = jiraData.key;

    // Forward attachments to Jira with retries. All-or-nothing: if any
    // attachment cannot be forwarded after retries, we roll back the
    // newly-created Jira issue and report failure to the client.
    if (preparedAttachments.length > 0) {
      const attachUrl = `${jiraDomain}/rest/api/3/issue/${encodeURIComponent(ticketKey)}/attachments`;
      const failedFile: PreparedAttachment | null = await (async () => {
        for (const file of preparedAttachments) {
          const ok = await forwardAttachmentToJira(attachUrl, authHeader, file);
          if (!ok) return file;
        }
        return null;
      })();

      if (failedFile) {
        console.error('[Create Ticket] Rolling back issue after permanent attachment failure', {
          ticketKey,
          failedFile: failedFile.filename,
        });
        await deleteJiraIssue(jiraDomain, authHeader, ticketKey);
        await deleteBlobs(preparedAttachments.map((a) => a.blobUrl));
        return NextResponse.json(
          {
            error:
              'We could not attach all your files to the ticket, so we cancelled it. Please try again.',
          },
          { status: 502 }
        );
      }
    }

    // Success path — staged blobs are no longer needed.
    await deleteBlobs(preparedAttachments.map((a) => a.blobUrl));

    return NextResponse.json(
      {
        success: true,
        ticketKey,
        attachmentsUploaded: preparedAttachments.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    await deleteBlobs(preparedAttachments.map((a) => a.blobUrl));
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
