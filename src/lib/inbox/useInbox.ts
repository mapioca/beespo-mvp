"use client";

import { useMemo } from "react";
import { deriveInbox } from "./deriveInbox";
import { useInboxReadState } from "./useInboxReadState";
import type { InboxItem } from "./types";
import type { Task, CallingProcess, CallingVacancy, Calling, CandidateName } from "./deriveInbox";

interface UseInboxProps {
  tasks: Task[];
  callingProcesses: CallingProcess[];
  vacancies: CallingVacancy[];
  callings: Calling[];
  candidateNames: CandidateName[];
  currentUserId: string;
}

export function useInbox({
  tasks,
  callingProcesses,
  vacancies,
  callings,
  candidateNames,
  currentUserId,
}: UseInboxProps) {
  const read = useInboxReadState();

  const items: InboxItem[] = useMemo(
    () =>
      deriveInbox({
        tasks,
        callingProcesses,
        vacancies,
        callings,
        candidateNames,
        currentUserId,
        readIds: read.readIds,
      }),
    [tasks, callingProcesses, vacancies, callings, candidateNames, currentUserId, read.readIds]
  );

  const unreadCount = items.filter((i) => !i.read).length;

  return { items, unreadCount, ...read };
}
