"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkspaceMember {
  email: string;
  full_name: string | null;
}

interface MemberSearchInputProps {
  members: string[];                          // current list of emails
  workspaceMembers?: WorkspaceMember[];       // for autocomplete
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isWorkspaceMember(email: string, workspaceMembers: WorkspaceMember[]) {
  return workspaceMembers.some(
    (m) => m.email.toLowerCase() === email.toLowerCase()
  );
}

export function MemberSearchInput({
  members,
  workspaceMembers = [],
  onAdd,
  onRemove,
  placeholder = "Search members or type email...",
  disabled = false,
}: MemberSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = workspaceMembers.filter(
    (m) =>
      !members.includes(m.email) &&
      (m.email.toLowerCase().includes(inputValue.toLowerCase()) ||
        (m.full_name?.toLowerCase() || "").includes(inputValue.toLowerCase()))
  );

  const handleAdd = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (members.includes(trimmed)) {
      setError("This email is already added");
      return;
    }
    onAdd(trimmed);
    setInputValue("");
    setError(null);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(inputValue);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Search / Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-9"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => handleAdd(inputValue)}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Add"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
            {suggestions.slice(0, 6).map((m) => (
              <button
                key={m.email}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  handleAdd(m.email);
                }}
              >
                <span className="font-medium">{m.full_name || m.email}</span>
                {m.full_name && (
                  <span className="text-muted-foreground">{m.email}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Added members list */}
      {members.length > 0 && (
        <div className="space-y-1.5">
          {members.map((email) => {
            const wsMember = workspaceMembers.find(
              (m) => m.email.toLowerCase() === email.toLowerCase()
            );
            const isExternal = !isWorkspaceMember(email, workspaceMembers);
            return (
              <div
                key={email}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">
                    {wsMember?.full_name ? (
                      <>
                        <span className="font-medium">{wsMember.full_name}</span>
                        <span className="ml-1 text-muted-foreground">
                          {email}
                        </span>
                      </>
                    ) : (
                      email
                    )}
                  </span>
                  {isExternal && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        "text-amber-600 border-amber-300 bg-amber-50"
                      )}
                    >
                      External
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(email)}
                  disabled={disabled}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {workspaceMembers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Workspace members are suggested as you type. External emails are accepted too.
        </p>
      )}
    </div>
  );
}
