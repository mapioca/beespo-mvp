A user creates a group and adds people by email — the system resolves whether they're Beespo users or external

at share-time.

User creates "Stake Leadership" group

→ bishop@ward1.org (Beespo user, Workspace A)

→ bishop@ward2.org (Beespo user, Workspace B)

→ exec.secretary@gmail.com (external)

When a meeting is shared:

- Beespo users get an in-app notification + email

- External users get an email with a view link

- No workspace linking required

1. **Sharing** **Groups** **are** **at the workspace level** — admins and leaders can create and manage the groups

2. **Groups** **contain** **emails** — the system resolves Beespo users vs. external at share-time

3. **Beespo** **users** **get** **rich** **experience** — in-app notifications, dashboard access

4. **External** **users** **get** **lightweight** **experience** — email with view link

5. **No** **workspace** **coupling** — workspaces stay independent

Shared meetings should appear natively in both workspaces. For those whom the meeting is being shared with, it is another record in their meetings table, except that there is a

badge that will allow the user to distinguish a shared meeting from his own meetings. For the person sharing the meeting apeears in the table as well just as any other meeting but

there is also a badge or icon indicating that the meeting is a shared meeting.

Groups at a workspace level:

- Groups persist across leadership changes (critical for church context)

- Any authorized member can use existing groups

- Admins can manage/audit groups centrally

- Groups become an organizational asset, not a personal one

- New leaders inherit a fully configured workspace

**Who** **can** **manage** **them?**

- **Create/edit/delete** **groups:** Admins and Leaders

- **Use** **groups** **for** **sharing:** Anyone with sharing permissions

- **View** **group** **membership:** Anyone in the workspace

This mirrors how distribution lists work in Exchange/Google Workspace — they belong to the org, not the individual.

- Groups have **no** **default** **permission** **level**

- Permission is set **at** **share** **time**: "Share this meeting with Stake Leadership as viewers/editors"

- This matches how Google Drive works — you choose the group AND the permission each time

You said shared meetings should appear in the recipient's meetings table.

**For** **Beespo** **Users** **(Cross-Workspace)**

When bishop@ward2.org logs into their workspace, they see:

My Meetings

┌──────────────────────────────────────┐

│ 🔵 Bishopric Meeting    Mar 30  Own │

│ 🔵 Youth Planning      Mar 28  Own │

│ 🟡 Stake Council        Mar 27  ↗️   │  ← shared from Ward 1

│ 🔵 Ward Council         Mar 25  Own │

│ 🟡 Leadership Training  Mar 22  ↗️   │  ← shared from Ward 1

└──────────────────────────────────────┘

**Key** **decisions:**

- The shared meeting badge (↗️  or similar) tells users it's from another workspace

- Tapping it shows: "Shared by Bishop Smith from Washington D.C. 1st Ward"

- **Read** **access:** User can view agenda, download PDF, but fields are non-editable

- **Write** **access:** User can edit agenda items (changes sync back to the original)

- The meeting lives in the **source** **workspace** — recipients see a **reference** to it

**Data** **Model** **Consideration**

- The meetings table keeps the meeting in the source workspace

- A meeting_shares table links recipients to the meeting

- When querying "my meetings," you query both owned meetings AND shares

- This avoids data duplication and sync nightmares

**For** **External** **Users**

They receive an email with:

- Meeting title, date, agenda summary

- "View Full Agenda" button → opens a public (but token-protected) read-only page

- No Beespo account needed

- The link expires when the share is revoked

**Areas** **You** **Haven't** **Considered** **Yet**

**1.** **Share** **Revocation** **&** **Lifecycle**

- What happens when you **unshare** a meeting? Does it disappear from the recipient's view immediately?

- Can you revoke access for a **single** **member** of a group, or only the whole group?

- If someone is in **multiple** **groups** that share the same meeting, what happens when you revoke one group?

Direction that we will take: Track shares at the individual recipient level, even when initiated via a group. This way you can revoke per-person without affecting others.

**2.** **Notification** **Fatigue**

If "Stake Leadership" has 15 people, sharing one meeting generates 15 notifications + 15 emails. Consider:

- **Batch** **notifications:** "3 meetings were shared with you" instead of 3 separate notifications

- **Digest** **mode:** Daily summary instead of real-time for less urgent shares

- **Per-group** **notification** **preferences:** Users might want instant alerts for "Bishopric" but daily digests for "Stake"

Direction to take: For now sharing a meeting with 15 people will generate 15 emails. Later we will work to make this process efficient. 

**3.** **Cascading** **Changes**

When the sharer **updates** the meeting after sharing:

- Do recipients see changes in real-time? (Recommended: yes)

- Do they get notified of changes? (Recommended: only for significant changes like date/time)

- What if the meeting is **deleted**? (Recommended: shared references show "This meeting was removed by the owner")

Direction to take: Follow the recommendations

**4.** **Who** **Shared** **What** **—** **Audit** **Trail**

Leaders change frequently. You'll want:

- "This meeting was shared with Stake Leadership by Bishop Smith on Mar 23"

- History of who added/removed groups

- This matters for accountability in church leadership contexts

Direction to take: There should be a History somewhere where the history of all these events will be displayed. What, when, and who 

**5.** **External** **User** **Upgrade** **Path**

When exec.secretary@gmail.com eventually signs up for Beespo:

- Do their previously shared meetings automatically appear in their dashboard?

- **Recommendation:** Yes — at signup, check for any existing shares by email and link them to the new account. This is a delightful onboarding moment.

Direction to take: Go with the recommendation

**6.** **Group** **Membership** **Changes**

If you add someone to the "Stake Leadership" group:

- Do they retroactively get access to all previously shared meetings? Or only future shares?

- **Recommendation:** Future only. Retroactive access is unpredictable and potentially a security concern.

If you remove someone:

- Do they lose access to previously shared meetings?

- **Recommendation:** Yes — access is tied to group membership. Removal = revocation.

Direction to take: Go with the recommendation. 

**7.** **Sharing** **Groups** **vs.** **Meeting** **Participants**

Right now you have meeting participants (people assigned to speak, pray, etc.). Sharing groups are different — they're about who can SEE the meeting, not who PARTICIPATES. Make

sure the UI clearly distinguishes:

- **Participants** = people with roles in the meeting

- **Shared** **with** = people who can view/edit the agenda

**8.** **Search** **&** **Filtering**

Users with many shared meetings will need:

- Filter: "My meetings" vs. "Shared with me" vs. "All"

- Search across both owned and shared meetings

- Sort by workspace source

Direction to take: In the meetings table we will have three different categories:

1. My meetings
2. Shared with me
3. All

It is important that this implementation is in any way possible reusable/flexible/be able to build upon and applied in other areas as in the near future users will be able to share not only meetings but also forms, tables, and other features. 

Sharing groups would appear in exactly **two** **places**:

**1.** **Settings** **→** **Sharing** **Groups** **(Management)**

This is where you create, edit, and delete groups. A new tab in your existing settings page:

Settings

┌──────────────────────────────────────────────────┐

│  Profile │ Workspace │ Members │ Sharing Groups │ Integrations  │

│                                  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔                │

│                                                                  │

│  Sharing Groups                          + New Group             │

│                                                                  │

│  ┌────────────────────────────────────────────────────────┐      │

│  │  📋 Stake Leadership                    8 members  ✎  │      │

│  │  📋 Bishopric                           3 members  ✎  │      │

│  │  📋 Relief Society Board                5 members  ✎  │      │

│  │  📋 Youth Leaders                       6 members  ✎  │      │

│  └────────────────────────────────────────────────────────┘      │

│                                                                  │

│  Groups are used when sharing meetings. Any workspace            │

│  admin or leader can create and manage groups.                   │

└──────────────────────────────────────────────────────────────────┘

**2.** **Meeting** **Share** **Dialog** **(Usage)**

When a user clicks "Share" on a meeting, the dialog would look like:

┌──────────────────────────────────────────────────┐

│  Share Meeting                              ✕    │

│                                                  │

│  ┌──────────────────────────────────────────┐    │

│  │ 🔍 Search groups or type email...        │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  Suggested Groups                                │

│  ┌──────────────────────────────────────────┐    │

│  │ 📋 Stake Leadership (8)           Add ▸  │    │

│  │ 📋 Bishopric (3)                  Add ▸  │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  Recently Shared With                            │

│  ┌──────────────────────────────────────────┐    │

│  │ 👤 bishop@ward2.org               Add ▸  │    │

│  │ 👤 exec.secretary@gmail.com       Add ▸  │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  ─── Sharing With ──────────────────────────     │

│  📋 Stake Leadership (8)     Editor    ✕         │

│  👤 john@example.com         Viewer    ✕         │

│                                                  │

│             [ Cancel ]  [ Share ]                │

└──────────────────────────────────────────────────┘

Key UX details:

- **Single** **search** **field** handles both groups and individual emails

- **Permission** **is** **set** **per-recipient/group** in the "Sharing With" section

- **"Add** **▸"** adds to the sharing list below, doesn't share immediately

- **"Share"** **button** executes all shares at once

- Groups and individuals can be mixed freely

---

**Creating** **a** **New** **Group**

Two ways to create, both important:

**From** **Settings** **(Planned** **Setup)**

Clicking "+ New Group" opens an inline form or slide-over panel:

┌──────────────────────────────────────────────────┐

│  New Sharing Group                          ✕    │

│                                                  │

│  Group Name                                      │

│  ┌──────────────────────────────────────────┐    │

│  │ Stake Leadership                         │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  Description (optional)                          │

│  ┌──────────────────────────────────────────┐    │

│  │ All bishops and stake presidency         │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  Members                                         │

│  ┌──────────────────────────────────────────┐    │

│  │ 🔍 Search members or type email...       │    │

│  └──────────────────────────────────────────┘    │

│                                                  │

│  👤 bishop@ward1.org              ✕              │

│  👤 bishop@ward2.org              ✕              │

│  👤 bishop@ward3.org              ✕              │

│  👤 exec.secretary@gmail.com  External  ✕        │

│                                                  │

│  ℹ️  External emails will receive view-only       │

│     links when meetings are shared.              │

│                                                  │

│             [ Cancel ]  [ Create Group ]         │

└──────────────────────────────────────────────────┘

Key details:

- The member search should autocomplete from workspace members first, then allow any email

- External emails get a subtle "External" badge

- The search should also pull from other groups' members for easy cross-referencing

**From** **the** **Share** **Dialog** **(Spontaneous)**

When sharing a meeting, after adding several people manually, a subtle prompt appears:

─── Sharing With ──────────────────────────

👤 bishop@ward1.org         Editor    ✕

👤 bishop@ward2.org         Editor    ✕

👤 bishop@ward3.org         Editor    ✕

💡 Save these 3 recipients as a group?  [Save as Group]

Clicking "Save as Group" opens a small inline form:

Group name: [                    ]  [Save]

This is powerful because it captures groups **organically** from real usage patterns rather than requiring upfront planning.

---

**Summary**

┌───────────────────────┬────────────────────────────────────────────────────────────┐

│       Question        │                           Answer                           │

├───────────────────────┼────────────────────────────────────────────────────────────┤

│ Where do groups live? │ Settings → Sharing Groups tab                              │

├───────────────────────┼────────────────────────────────────────────────────────────┤

│ Nav bar item?         │ No — settings tab is sufficient                            │

├───────────────────────┼────────────────────────────────────────────────────────────┤

│ Editable in settings? │ Yes — create, edit, delete from Settings                   │

├───────────────────────┼────────────────────────────────────────────────────────────┤

│ Where will they go?   │ Settings for management, Share dialog for usage            │

├───────────────────────┼────────────────────────────────────────────────────────────┤

│ Creating a new group? │ Two paths: Settings (planned) + Share dialog (spontaneous) │

└───────────────────────┴────────────────────────────────────────────────────────────┘

The key principle: **Groups** **are** **configured** **in** **settings,** **consumed** **in** **context.** Users shouldn't have to leave their workflow to use a group, and they shouldn't have to navigate away

from settings to manage one.