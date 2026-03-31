import { useEffect } from "react";

/**
 * Global keyboard shortcut hook.
 * Listens for Cmd (Mac) or Ctrl (Windows/Linux) + key combinations.
 * Ignores events when focus is inside form elements.
 */
export function useHotkeys(key: string, callback: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Skip when focus is inside form elements
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        callback();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, callback]);
}
