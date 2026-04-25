"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "beespo.inbox.read.v1";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function save(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function useInboxReadState() {
  const [readIds, setReadIds] = useState<Set<string>>(() => load());

  useEffect(() => {
    save(readIds);
  }, [readIds]);

  const markRead = useCallback((id: string) => {
    setReadIds((s) => {
      if (s.has(id)) return s;
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }, []);

  const markUnread = useCallback((id: string) => {
    setReadIds((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    setReadIds((s) => {
      const next = new Set(s);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setReadIds(new Set()), []);

  return { readIds, markRead, markUnread, markAllRead, clear };
}
