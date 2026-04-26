"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  currentUserId as seedCurrentUserId,
  discussions as seedDiscussions,
  meetings as seedMeetings,
  tasks as seedTasks,
  users as seedUsers,
} from "../data/seed";
import type {
  AppUser,
  Discussion,
  DiscussionNote,
  DiscussionPriority,
  DiscussionResolution,
  DiscussionState,
  DiscussionTask,
  Meeting,
  NoteKind,
  NoteReply,
  SpiritualImpression,
  TaskPriority,
  TimelineEvent,
  TimelineEventKind,
  VoteValue,
} from "../data/types";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function pushTimeline(
  discussion: Discussion,
  kind: TimelineEventKind,
  actorId: string,
  data?: Record<string, unknown>,
): Discussion {
  const event: TimelineEvent = {
    id: uid("ev"),
    kind,
    at: new Date().toISOString(),
    actorId,
    data,
  };
  return { ...discussion, timeline: [...discussion.timeline, event] };
}

interface DiscussionContextValue {
  currentUserId: string;
  users: AppUser[];
  tasks: DiscussionTask[];
  discussions: Discussion[];
  meetings: Meeting[];
  createDiscussion: (input: {
    title: string;
    description?: string;
    priority?: DiscussionPriority;
    tags?: string[];
    dueAt?: string;
    state?: DiscussionState;
  }) => string;
  updateDiscussion: (
    id: string,
    patch: Partial<Pick<Discussion, "title" | "description" | "priority" | "tags" | "dueAt">>,
  ) => void;
  setDiscussionState: (id: string, state: DiscussionState) => void;
  closeDiscussion: (id: string, resolution: DiscussionResolution, decision?: string) => void;
  reopenDiscussion: (id: string) => void;
  addNote: (discussionId: string, input: { kind: NoteKind; body: string; meetingId?: string }) => string;
  addReply: (discussionId: string, noteId: string, body: string, meetingId?: string) => void;
  promoteNoteToTask: (
    discussionId: string,
    noteId: string,
    taskInput: { assigneeId: string; priority?: TaskPriority; dueAt?: string },
  ) => string;
  addTask: (input: {
    title: string;
    description?: string;
    assigneeId: string;
    priority?: TaskPriority;
    dueAt?: string;
    tags?: string[];
  }) => string;
  linkTaskToDiscussion: (discussionId: string, taskId: string) => void;
  addImpression: (discussionId: string, body: string) => string;
  updateImpression: (discussionId: string, impressionId: string, body: string) => void;
  deleteImpression: (discussionId: string, impressionId: string) => void;
  promoteImpression: (discussionId: string, impressionId: string, kind: NoteKind) => void;
  openVote: (discussionId: string, noteId?: string) => void;
  castVote: (discussionId: string, value: VoteValue) => void;
  closeVote: (discussionId: string) => void;
}

const DiscussionsContext = createContext<DiscussionContextValue | null>(null);

export function DiscussionsProvider({ children }: { children: ReactNode }) {
  const [discussions, setDiscussions] = useState<Discussion[]>(seedDiscussions);
  const [meetings] = useState<Meeting[]>(seedMeetings);
  const [users] = useState<AppUser[]>(seedUsers);
  const [tasks, setTasks] = useState<DiscussionTask[]>(seedTasks);
  const currentUserId = seedCurrentUserId;

  const update = useCallback((id: string, fn: (discussion: Discussion) => Discussion) => {
    setDiscussions((items) => items.map((item) => (item.id === id ? fn(item) : item)));
  }, []);

  const createDiscussion: DiscussionContextValue["createDiscussion"] = useCallback(
    (input) => {
      const id = uid("d");
      const discussion: Discussion = {
        id,
        title: input.title,
        description: input.description,
        state: input.state ?? "active",
        priority: input.priority ?? "medium",
        tags: input.tags ?? [],
        ownerId: currentUserId,
        dueAt: input.dueAt,
        createdAt: new Date().toISOString(),
        notes: [],
        impressions: [],
        votes: [],
        taskIds: [],
        meetingIds: [],
        timeline: [{ id: uid("ev"), kind: "created", at: new Date().toISOString(), actorId: currentUserId }],
      };
      setDiscussions((items) => [discussion, ...items]);
      return id;
    },
    [currentUserId],
  );

  const updateDiscussion: DiscussionContextValue["updateDiscussion"] = useCallback(
    (id, patch) => update(id, (discussion) => ({ ...discussion, ...patch })),
    [update],
  );

  const setDiscussionState: DiscussionContextValue["setDiscussionState"] = useCallback(
    (id, state) => update(id, (discussion) => pushTimeline({ ...discussion, state }, "state_changed", currentUserId, { to: state })),
    [currentUserId, update],
  );

  const closeDiscussion: DiscussionContextValue["closeDiscussion"] = useCallback(
    (id, resolution, decision) => {
      update(id, (discussion) => {
        let next: Discussion = {
          ...discussion,
          state: "closed",
          resolution,
          decision,
          closedAt: new Date().toISOString(),
        };
        if (resolution === "decision_made") {
          next = pushTimeline(next, "decision_recorded", currentUserId, { decision });
        }
        return pushTimeline(next, "state_changed", currentUserId, { to: "closed", resolution });
      });
    },
    [currentUserId, update],
  );

  const reopenDiscussion: DiscussionContextValue["reopenDiscussion"] = useCallback(
    (id) => update(id, (discussion) => pushTimeline(
      { ...discussion, state: "active", resolution: undefined, closedAt: undefined },
      "state_changed",
      currentUserId,
      { to: "active" },
    )),
    [currentUserId, update],
  );

  const addTask: DiscussionContextValue["addTask"] = useCallback(
    (input) => {
      const id = uid("task");
      const task: DiscussionTask = {
        id,
        title: input.title,
        description: input.description,
        status: "todo",
        priority: input.priority ?? "medium",
        tags: input.tags ?? [],
        reporterId: currentUserId,
        assigneeId: input.assigneeId,
        dueAt: input.dueAt,
        createdAt: new Date().toISOString(),
      };
      setTasks((items) => [task, ...items]);
      return id;
    },
    [currentUserId],
  );

  const parseMentions = (body: string): string[] => {
    const matches = body.match(/@\w+/g) ?? [];
    return Array.from(new Set(matches.map((match) => match.slice(1).toLowerCase())));
  };

  const addNote: DiscussionContextValue["addNote"] = useCallback(
    (discussionId, input) => {
      const noteId = uid("n");
      update(discussionId, (discussion) => {
        const note: DiscussionNote = {
          id: noteId,
          kind: input.kind,
          authorId: currentUserId,
          body: input.body,
          createdAt: new Date().toISOString(),
          meetingId: input.meetingId,
          replies: [],
          mentions: parseMentions(input.body),
        };
        return pushTimeline({ ...discussion, notes: [...discussion.notes, note] }, "note_added", currentUserId, {
          kind: input.kind,
          noteId,
        });
      });
      return noteId;
    },
    [currentUserId, update],
  );

  const addReply: DiscussionContextValue["addReply"] = useCallback(
    (discussionId, noteId, body, meetingId) => {
      update(discussionId, (discussion) => {
        const reply: NoteReply = {
          id: uid("nr"),
          authorId: currentUserId,
          body,
          createdAt: new Date().toISOString(),
          meetingId,
        };
        const next = {
          ...discussion,
          notes: discussion.notes.map((note) =>
            note.id === noteId ? { ...note, replies: [...note.replies, reply] } : note,
          ),
        };
        return pushTimeline(next, "reply_added", currentUserId, { noteId });
      });
    },
    [currentUserId, update],
  );

  const linkTaskToDiscussion: DiscussionContextValue["linkTaskToDiscussion"] = useCallback(
    (discussionId, taskId) => {
      update(discussionId, (discussion) =>
        discussion.taskIds.includes(taskId)
          ? discussion
          : pushTimeline({ ...discussion, taskIds: [...discussion.taskIds, taskId] }, "task_created", currentUserId, { taskId }),
      );
    },
    [currentUserId, update],
  );

  const promoteNoteToTask: DiscussionContextValue["promoteNoteToTask"] = useCallback(
    (discussionId, noteId, taskInput) => {
      const discussion = discussions.find((item) => item.id === discussionId);
      const note = discussion?.notes.find((item) => item.id === noteId);
      if (!discussion || !note) return "";

      const taskId = addTask({
        title: note.body.slice(0, 80),
        description: `Promoted from discussion: ${discussion.title}`,
        assigneeId: taskInput.assigneeId,
        priority: taskInput.priority ?? "medium",
        dueAt: taskInput.dueAt,
        tags: ["discussion", ...discussion.tags],
      });

      update(discussionId, (current) => {
        const next = {
          ...current,
          taskIds: [...current.taskIds, taskId],
          notes: current.notes.map((item) => (item.id === noteId ? { ...item, promotedTaskId: taskId } : item)),
        };
        return pushTimeline(next, "task_created", currentUserId, { taskId, fromNoteId: noteId });
      });
      return taskId;
    },
    [addTask, currentUserId, discussions, update],
  );

  const addImpression: DiscussionContextValue["addImpression"] = useCallback(
    (discussionId, body) => {
      const id = uid("imp");
      update(discussionId, (discussion) => {
        const impression: SpiritualImpression = {
          id,
          authorId: currentUserId,
          body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...discussion, impressions: [...discussion.impressions, impression] };
      });
      return id;
    },
    [currentUserId, update],
  );

  const updateImpression: DiscussionContextValue["updateImpression"] = useCallback(
    (discussionId, impressionId, body) => {
      update(discussionId, (discussion) => ({
        ...discussion,
        impressions: discussion.impressions.map((item) =>
          item.id === impressionId ? { ...item, body, updatedAt: new Date().toISOString() } : item,
        ),
      }));
    },
    [update],
  );

  const deleteImpression: DiscussionContextValue["deleteImpression"] = useCallback(
    (discussionId, impressionId) => {
      update(discussionId, (discussion) => ({
        ...discussion,
        impressions: discussion.impressions.filter((item) => item.id !== impressionId),
      }));
    },
    [update],
  );

  const promoteImpression: DiscussionContextValue["promoteImpression"] = useCallback(
    (discussionId, impressionId, kind) => {
      update(discussionId, (discussion) => {
        const impression = discussion.impressions.find((item) => item.id === impressionId);
        if (!impression) return discussion;
        const noteId = uid("n");
        const note: DiscussionNote = {
          id: noteId,
          kind,
          authorId: impression.authorId,
          body: impression.body,
          createdAt: new Date().toISOString(),
          replies: [],
          mentions: [],
        };
        return pushTimeline(
          {
            ...discussion,
            notes: [...discussion.notes, note],
            impressions: discussion.impressions.map((item) =>
              item.id === impressionId ? { ...item, promotedNoteId: noteId } : item,
            ),
          },
          "impression_promoted",
          currentUserId,
          { noteId },
        );
      });
    },
    [currentUserId, update],
  );

  const openVote: DiscussionContextValue["openVote"] = useCallback(
    (discussionId, noteId) => {
      update(discussionId, (discussion) =>
        pushTimeline(
          {
            ...discussion,
            votes: [...discussion.votes, { noteId, ballots: {}, openedAt: new Date().toISOString(), openedByUserId: currentUserId }],
          },
          "vote_opened",
          currentUserId,
          { noteId },
        ),
      );
    },
    [currentUserId, update],
  );

  const castVote: DiscussionContextValue["castVote"] = useCallback(
    (discussionId, value) => {
      update(discussionId, (discussion) => {
        const index = discussion.votes.findIndex((vote) => !vote.closedAt);
        if (index < 0) return discussion;
        const votes = discussion.votes.slice();
        votes[index] = { ...votes[index], ballots: { ...votes[index].ballots, [currentUserId]: value } };
        return { ...discussion, votes };
      });
    },
    [currentUserId, update],
  );

  const closeVote: DiscussionContextValue["closeVote"] = useCallback(
    (discussionId) => {
      update(discussionId, (discussion) => {
        const index = discussion.votes.findIndex((vote) => !vote.closedAt);
        if (index < 0) return discussion;
        const votes = discussion.votes.slice();
        votes[index] = { ...votes[index], closedAt: new Date().toISOString() };
        return pushTimeline({ ...discussion, votes }, "vote_closed", currentUserId);
      });
    },
    [currentUserId, update],
  );

  const value = useMemo<DiscussionContextValue>(
    () => ({
      currentUserId,
      users,
      tasks,
      discussions,
      meetings,
      createDiscussion,
      updateDiscussion,
      setDiscussionState,
      closeDiscussion,
      reopenDiscussion,
      addNote,
      addReply,
      promoteNoteToTask,
      addTask,
      linkTaskToDiscussion,
      addImpression,
      updateImpression,
      deleteImpression,
      promoteImpression,
      openVote,
      castVote,
      closeVote,
    }),
    [
      addImpression,
      addNote,
      addReply,
      addTask,
      castVote,
      closeDiscussion,
      closeVote,
      createDiscussion,
      currentUserId,
      deleteImpression,
      discussions,
      linkTaskToDiscussion,
      meetings,
      openVote,
      promoteImpression,
      promoteNoteToTask,
      reopenDiscussion,
      setDiscussionState,
      tasks,
      updateDiscussion,
      updateImpression,
      users,
    ],
  );

  return <DiscussionsContext.Provider value={value}>{children}</DiscussionsContext.Provider>;
}

export function useDiscussions() {
  const context = useContext(DiscussionsContext);
  if (!context) throw new Error("useDiscussions must be inside DiscussionsProvider");
  return context;
}
