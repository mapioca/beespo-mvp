"use client"

interface MeetingsHubShellProps {
  children: React.ReactNode
}

export function MeetingsHubShell({ children }: MeetingsHubShellProps) {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
