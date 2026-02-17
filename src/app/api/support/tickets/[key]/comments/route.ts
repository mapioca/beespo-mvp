import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    const { key } = await params;
    const body = await request.json();
    const { comment } = body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
        return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

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

    if (!jiraDomain || !jiraUserEmail || !jiraApiToken) {
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
        // We verify ownership again to ensure they can comment on this ticket
        let accountId: string | undefined;
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

        // 2. Fetch Issue to verify ownership
        const issueResponse = await fetch(
            `${jiraDomain}/rest/api/3/issue/${key}?fields=reporter`,
            { headers }
        );

        if (!issueResponse.ok) {
            if (issueResponse.status === 404) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }
            throw new Error(`Jira API error: ${issueResponse.status}`);
        }

        const issue = await issueResponse.json();
        const reporterAccountId = issue.fields.reporter?.accountId;

        if (reporterAccountId !== accountId) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // 3. Post Comment to Jira
        const commentPayload = {
            body: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: comment
                            }
                        ]
                    }
                ]
            }
        };

        const commentResponse = await fetch(
            `${jiraDomain}/rest/api/3/issue/${key}/comment`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(commentPayload)
            }
        );

        if (!commentResponse.ok) {
            throw new Error(`Failed to post comment to Jira: ${commentResponse.status}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error posting comment:', error);
        return NextResponse.json(
            { error: 'Failed to post comment.' },
            { status: 500 }
        );
    }
}
