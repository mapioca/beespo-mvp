import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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

    // Check if Jira is configured
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

        // 1. Find Jira User by Email
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
            // User likely hasn't created any tickets yet
            return NextResponse.json({ tickets: [] });
        }

        // 2. Query Jira for issues reported by this user
        // JQL: project = KEY AND reporter = accountId ORDER BY created DESC
        const jql = `project = "${jiraProjectKey}" AND reporter = "${accountId}" ORDER BY created DESC`;


        // Fields to retrieve
        const fields = ['summary', 'status', 'created', 'updated', 'issuetype'];

        const searchIssuesResponse = await fetch(
            `${jiraDomain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields.join(',')}`,
            { headers }
        );

        if (!searchIssuesResponse.ok) {
            const errorData = await searchIssuesResponse.json().catch(() => ({}));
            console.error('Jira JQL search error:', {
                status: searchIssuesResponse.status,
                error: errorData,
            });
            throw new Error('Failed to fetch tickets from Jira');
        }

        const data = await searchIssuesResponse.json();

        // Transform response
        const tickets = data.issues.map((issue: { key: string; fields: { summary: string; status: { name: string; statusCategory: { colorName: string } }; created: string; updated: string; issuetype: { name: string; iconUrl: string } } }) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            statusColor: issue.fields.status.statusCategory.colorName, // useful for UI
            created: issue.fields.created,
            updated: issue.fields.updated,
            type: issue.fields.issuetype.name,
        }));

        return NextResponse.json({ tickets });
    } catch (error) {
        console.error('Error fetching Jira tickets:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.' },
            { status: 500 }
        );
    }
}
