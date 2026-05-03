"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SidebarState } from "@/components/dashboard/sidebar-types"

const STORAGE_KEY = "beespo-sidebar-state"
const DEBOUNCE_MS = 300

const defaultState: SidebarState = {
  isPinned: true,
  expandedGroups: {},
}

/**
 * Hook to manage sidebar state with localStorage persistence.
 * isPinned controls whether the sidebar stays expanded (true) or
 * collapses by default and only expands on hover (false).
 */
export function useSidebarState(defaultExpandedGroups?: Record<string, boolean>) {
  const [state, setState] = useState<SidebarState>({
    ...defaultState,
    expandedGroups: defaultExpandedGroups ?? {},
  })
  const [isHydrated, setIsHydrated] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SidebarState>
        setState((prev) => ({
          isPinned: parsed.isPinned ?? prev.isPinned,
          expandedGroups: {
            ...prev.expandedGroups,
            ...parsed.expandedGroups,
          },
        }))
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsHydrated(true)
  }, [])

  // Debounced localStorage write
  useEffect(() => {
    if (!isHydrated) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Ignore localStorage errors
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [state, isHydrated])

  const setIsPinned = useCallback((pinned: boolean) => {
    setState((prev) => ({ ...prev, isPinned: pinned }))
  }, [])

  const togglePinned = useCallback(() => {
    setState((prev) => ({ ...prev, isPinned: !prev.isPinned }))
  }, [])

  const setGroupExpanded = useCallback((groupId: string, expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      expandedGroups: {
        ...prev.expandedGroups,
        [groupId]: expanded,
      },
    }))
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setState((prev) => ({
      ...prev,
      expandedGroups: {
        ...prev.expandedGroups,
        [groupId]: !prev.expandedGroups[groupId],
      },
    }))
  }, [])

  const isGroupExpanded = useCallback(
    (groupId: string, defaultOpen?: boolean) => {
      if (groupId in state.expandedGroups) {
        return state.expandedGroups[groupId]
      }
      return defaultOpen ?? false
    },
    [state.expandedGroups]
  )

  return {
    isPinned: state.isPinned,
    setIsPinned,
    togglePinned,
    isGroupExpanded,
    setGroupExpanded,
    toggleGroup,
    isHydrated,
  }
}
