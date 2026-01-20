import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Jira Issue Type mapping
const JIRA_ISSUE_TYPES: Record<string, string> = {
  'Bug Report': 'Bug',
  'Feature Request': 'Story',
  'General Question': 'Task',
};

// Jira Priority mapping
const JIRA_PRIORITIES: Record<string, string> = {
  'Low': 'Low',
  'Medium': 'Medium',
  'High': 'High',
};

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

  // Parse request body
  let body: SupportRequestBody;
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
  if (!requestType || !subject || !description) {
    return NextResponse.json(
      { error: 'Request type, subject, and description are required' },
      { status: 400 }
    );
  }

  // Get Jira configuration from environment
  const jiraDomain = process.env.JIRA_DOMAIN;
  const jiraUserEmail = process.env.JIRA_USER_EMAIL;
  const jiraApiToken = process.env.JIRA_API_TOKEN;
  const jiraProjectKey = process.env.JIRA_PROJECT_KEY;

  // Check if Jira is configured
  if (!jiraDomain || !jiraUserEmail || !jiraApiToken || !jiraProjectKey) {
    console.error('Jira configuration is incomplete');
    return NextResponse.json(
      { error: 'Support system is not configured. Please contact an administrator.' },
      { status: 500 }
    );
  }

  try {
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

    // Construct Jira issue payload
    const jiraIssueType = JIRA_ISSUE_TYPES[requestType] || 'Task';
    const jiraPriority = priority ? JIRA_PRIORITIES[priority] : undefined;

    const jiraPayload: {
      fields: {
        project: { key: string };
        summary: string;
        description: typeof jiraDescription;
        issuetype: { name: string };
        priority?: { name: string };
      };
    } = {
      fields: {
        project: {
          key: jiraProjectKey,
        },
        summary: `[${requestType}] ${subject}`,
        description: jiraDescription,
        issuetype: {
          name: jiraIssueType,
        },
      },
    };

    // Add priority only if provided (and only for bugs typically)
    if (jiraPriority && requestType === 'Bug Report') {
      jiraPayload.fields.priority = { name: jiraPriority };
    }

    // Create Basic Auth header
    const authHeader = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64');

    // Make request to Jira API
    const jiraResponse = await fetch(`${jiraDomain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(jiraPayload),
    });

    if (!jiraResponse.ok) {
      const errorData = await jiraResponse.json().catch(() => ({}));
      console.error('Jira API error:', {
        status: jiraResponse.status,
        statusText: jiraResponse.statusText,
        error: errorData,
      });

      // Return a user-friendly error message
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

    return NextResponse.json(
      {
        success: true,
        ticketKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating Jira ticket:', error);
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
