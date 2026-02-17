import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Jira configuration from environment
    const jiraDomain = process.env.JIRA_DOMAIN;
    const jiraUserEmail = process.env.JIRA_USER_EMAIL;
    const jiraApiToken = process.env.JIRA_API_TOKEN;
    const jiraProjectKey = process.env.JIRA_PROJECT_KEY;

    if (!jiraDomain || !jiraUserEmail || !jiraApiToken || !jiraProjectKey) {
        console.error('Jira configuration is incomplete');
        return NextResponse.json(
            { error: 'Support system is not configured.' },
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

        // 1. Fetch User's Account ID (to verify ownership)
        let accountId: string | undefined;
        // Optimization: In a real app we might store this in user metadata to avoid fetching every time
        const searchResponse = await fetch(
            `${jiraDomain}/rest/api/3/user/search?query=${encodeURIComponent(user.email || '')}`,
            { headers }
        );

        if (searchResponse.ok) {
            const users = await searchResponse.json();
            if (users.length > 0) {
                accountId = users[0].accountId;
            }
        }

        if (!accountId) {
            return NextResponse.json({ error: 'User not found in support system' }, { status: 404 });
        }

        // 2. Fetch Issue Details
        // We fetch summary, description, status, comments, and reporter to verify ownership
        const fields = ['summary', 'description', 'status', 'comment', 'reporter', 'created', 'updated'];
        const issueResponse = await fetch(
            `${jiraDomain}/rest/api/3/issue/${key}?fields=${fields.join(',')}&expand=renderedFields`,
            { headers }
        );

        if (!issueResponse.ok) {
            if (issueResponse.status === 404) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }
            throw new Error(`Jira API error: ${issueResponse.status}`);
        }

        const issue = await issueResponse.json();

        // 3. Verify Ownership
        // Ensure the current user is the reporter. 
        // Note: accountId comparison should be robust.
        const reporterAccountId = issue.fields.reporter?.accountId;
        if (reporterAccountId !== accountId) {
            // For privacy, we return 404 if they don't own it, rather than 403, 
            // to prevent probing for ticket existence.
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // 4. Transform response
        interface JiraAuthor {
            displayName: string;
            accountId: string;
        }

        interface JiraComment {
            id: string;
            author: JiraAuthor;
            body: unknown;
            created: string;
        }

        interface RenderedComment {
            id: string;
            body: string;
        }

        // Map rendered comments by ID for easy lookup
        const renderedCommentsMap = new Map<string, string>();
        if (issue.renderedFields?.comment?.comments) {
            issue.renderedFields.comment.comments.forEach((c: RenderedComment) => {
                renderedCommentsMap.set(c.id, c.body);
            });
        }

        const ticketDetails = {
            key: issue.key,
            summary: issue.fields.summary,
            description: issue.renderedFields?.description || issue.fields.description,
            status: issue.fields.status.name,
            statusColor: issue.fields.status.statusCategory.colorName,
            created: issue.fields.created,
            updated: issue.fields.updated,
            comments: issue.fields.comment?.comments.map((c: JiraComment) => ({
                id: c.id,
                author: c.author.displayName,
                // Use the rendered HTML body if available, otherwise fallback to handling the raw body
                body: renderedCommentsMap.get(c.id) || (typeof c.body === 'string' ? c.body : JSON.stringify(c.body)),
                created: c.created,
                isSupport: c.author.accountId !== accountId
            })) || []
        };

        return NextResponse.json(ticketDetails);

    } catch (error) {
        console.error('Error fetching ticket details:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
