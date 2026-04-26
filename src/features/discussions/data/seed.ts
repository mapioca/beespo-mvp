"use client";

import type { AppUser, Discussion, DiscussionTask, Meeting } from "./types";

const now = new Date();
const iso = (daysAgo: number, h = 9, m = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const isoFuture = (daysAhead: number, h = 9, m = 0) => iso(-daysAhead, h, m);

export const users: AppUser[] = [
  { id: "u1", name: "Moises Carpio", initials: "MC", role: "Bishopric" },
  { id: "u2", name: "Elena Reyes", initials: "ER", role: "Relief Society" },
  { id: "u3", name: "Sam Hollis", initials: "SH", role: "Elders Quorum" },
  { id: "u4", name: "Jade Park", initials: "JP", role: "Young Women" },
];

export const currentUserId = "u1";

export const tasks: DiscussionTask[] = [];

export const meetings: Meeting[] = [
  {
    id: "mt1",
    title: "Bishopric weekly",
    type: "bishopric",
    startsAt: iso(2, 7, 0),
    durationMin: 60,
    discussionIds: ["d1", "d3"],
  },
  {
    id: "mt2",
    title: "Ward Council April",
    type: "ward_council",
    startsAt: iso(5, 9, 0),
    durationMin: 75,
    discussionIds: ["d1", "d2", "d4"],
  },
  {
    id: "mt3",
    title: "Bishopric next",
    type: "bishopric",
    startsAt: isoFuture(3, 7, 0),
    durationMin: 60,
    discussionIds: ["d2", "d5"],
  },
];

export const discussions: Discussion[] = [
  {
    id: "d1",
    title: "Easter sacrament meeting program",
    description:
      "Plan music, speakers, and the overall flow for Easter Sunday. Include the youth choir and a brief member testimony segment.",
    state: "active",
    priority: "high",
    tags: ["sacrament", "easter", "music"],
    ownerId: "u1",
    dueAt: isoFuture(10, 11, 0),
    createdAt: iso(8, 8, 0),
    notes: [
      {
        id: "n1",
        kind: "idea",
        authorId: "u2",
        body: "What if we close with the youth choir performing Gethsemane? Sister Park has been rehearsing it.",
        createdAt: iso(7, 10, 0),
        meetingId: "mt2",
        replies: [
          {
            id: "nr1",
            authorId: "u1",
            body: "Beautiful. Let's reach out to confirm.",
            createdAt: iso(6, 14, 0),
          },
        ],
        mentions: [],
      },
      {
        id: "n2",
        kind: "proposal",
        authorId: "u1",
        body: "Two speakers: Brother Hollis for 10 minutes and Sister Reyes for 15. Theme: He is risen.",
        createdAt: iso(5, 9, 30),
        meetingId: "mt2",
        replies: [],
        mentions: [],
      },
      {
        id: "n3",
        kind: "risk",
        authorId: "u3",
        body: "We're cutting it close on rehearsal time. Choir only has two more Sundays.",
        createdAt: iso(2, 7, 20),
        meetingId: "mt1",
        replies: [],
        mentions: [],
      },
    ],
    impressions: [
      {
        id: "i1",
        authorId: "u1",
        body: "I keep feeling we should leave space for an unscheduled testimony at the end. Pray about it.",
        createdAt: iso(3, 22, 0),
        updatedAt: iso(3, 22, 0),
      },
    ],
    votes: [],
    taskIds: [],
    meetingIds: ["mt1", "mt2"],
    timeline: [
      { id: "tl1", kind: "created", at: iso(8, 8, 0), actorId: "u1" },
      { id: "tl2", kind: "discussed_in_meeting", at: iso(5, 9, 0), actorId: "u1", data: { meetingId: "mt2" } },
      { id: "tl3", kind: "note_added", at: iso(7, 10, 0), actorId: "u2", data: { kind: "idea" } },
      { id: "tl4", kind: "note_added", at: iso(5, 9, 30), actorId: "u1", data: { kind: "proposal" } },
      { id: "tl5", kind: "discussed_in_meeting", at: iso(2, 7, 0), actorId: "u1", data: { meetingId: "mt1" } },
      { id: "tl6", kind: "note_added", at: iso(2, 7, 20), actorId: "u3", data: { kind: "risk" } },
    ],
  },
  {
    id: "d2",
    title: "Ministering route restructure",
    description:
      "Several people have moved or asked for changes. We need a fresh pass on companionships before next quarter.",
    state: "active",
    priority: "medium",
    tags: ["ministering"],
    ownerId: "u2",
    createdAt: iso(14, 11, 0),
    notes: [
      {
        id: "n4",
        kind: "key_point",
        authorId: "u2",
        body: "RS presidency has the new spreadsheet ready. EQ side still needs updates.",
        createdAt: iso(10, 10, 0),
        replies: [],
        mentions: [],
      },
      {
        id: "n5",
        kind: "question",
        authorId: "u4",
        body: "Do we wait for the new EQ counselor to be set apart before finalizing?",
        createdAt: iso(4, 16, 0),
        meetingId: "mt2",
        replies: [],
        mentions: ["u1"],
      },
    ],
    impressions: [],
    votes: [],
    taskIds: [],
    meetingIds: ["mt2"],
    timeline: [
      { id: "tl7", kind: "created", at: iso(14, 11, 0), actorId: "u2" },
      { id: "tl8", kind: "note_added", at: iso(10, 10, 0), actorId: "u2", data: { kind: "key_point" } },
      { id: "tl9", kind: "discussed_in_meeting", at: iso(5, 9, 0), actorId: "u1", data: { meetingId: "mt2" } },
    ],
  },
  {
    id: "d3",
    title: "Replace Primary pianist",
    description: "Sister Tran declined. Pipeline is paused. Who else could we approach?",
    state: "active",
    priority: "urgent",
    tags: ["calling", "primary"],
    ownerId: "u1",
    dueAt: isoFuture(5, 12, 0),
    createdAt: iso(6, 9, 0),
    notes: [
      {
        id: "n6",
        kind: "idea",
        authorId: "u3",
        body: "Sister Calloway plays beautifully. Newer in the ward but worth a quiet conversation first.",
        createdAt: iso(2, 7, 30),
        meetingId: "mt1",
        replies: [],
        mentions: [],
      },
    ],
    impressions: [],
    votes: [],
    taskIds: [],
    meetingIds: ["mt1"],
    timeline: [
      { id: "tl10", kind: "created", at: iso(6, 9, 0), actorId: "u1" },
      { id: "tl11", kind: "discussed_in_meeting", at: iso(2, 7, 0), actorId: "u1", data: { meetingId: "mt1" } },
    ],
  },
  {
    id: "d4",
    title: "Q3 ward activity calendar",
    description: "Coordinate with auxiliaries to lock in dates and avoid conflicts.",
    state: "closed",
    resolution: "decision_made",
    decision:
      "Confirmed three activities: Father's Day breakfast, a service project at the food bank, and a multi-stake youth dance.",
    priority: "low",
    tags: ["activities", "calendar"],
    ownerId: "u3",
    createdAt: iso(20, 9, 0),
    closedAt: iso(5, 11, 0),
    notes: [
      {
        id: "n7",
        kind: "proposal",
        authorId: "u3",
        body: "Three anchor activities for Q3. Keep monthly cadence and leave one Sunday open.",
        createdAt: iso(8, 9, 0),
        replies: [],
        mentions: [],
      },
    ],
    impressions: [],
    votes: [
      {
        openedAt: iso(5, 9, 30),
        openedByUserId: "u1",
        closedAt: iso(5, 9, 45),
        ballots: { u1: "yes", u2: "yes", u3: "yes", u4: "yes" },
      },
    ],
    taskIds: [],
    meetingIds: ["mt2"],
    timeline: [
      { id: "tl12", kind: "created", at: iso(20, 9, 0), actorId: "u3" },
      { id: "tl13", kind: "note_added", at: iso(8, 9, 0), actorId: "u3", data: { kind: "proposal" } },
      { id: "tl14", kind: "discussed_in_meeting", at: iso(5, 9, 0), actorId: "u1", data: { meetingId: "mt2" } },
      { id: "tl15", kind: "vote_opened", at: iso(5, 9, 30), actorId: "u1" },
      { id: "tl16", kind: "vote_closed", at: iso(5, 9, 45), actorId: "u1", data: { result: "unanimous_yes" } },
      { id: "tl17", kind: "decision_recorded", at: iso(5, 11, 0), actorId: "u1" },
      { id: "tl18", kind: "state_changed", at: iso(5, 11, 0), actorId: "u1", data: { to: "closed", resolution: "decision_made" } },
    ],
  },
  {
    id: "d5",
    title: "Temple recommend interview cadence",
    description: "Discussion draft. Gather thoughts before the next bishopric meeting.",
    state: "draft",
    priority: "low",
    tags: ["temple", "interviews"],
    ownerId: "u1",
    createdAt: iso(1, 20, 0),
    notes: [],
    impressions: [],
    votes: [],
    taskIds: [],
    meetingIds: [],
    timeline: [{ id: "tl19", kind: "created", at: iso(1, 20, 0), actorId: "u1" }],
  },
];
