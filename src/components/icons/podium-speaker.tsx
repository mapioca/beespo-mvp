import { cn } from "@/lib/utils"

interface PodiumSpeakerProps {
  className?: string
}

export function PodiumSpeaker({ className }: PodiumSpeakerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      {/* Head */}
      <circle cx="12" cy="5.5" r="2.3" />
      {/* Hair swoop */}
      <path d="M10.2 4.2c0.5-1 1.5-1.3 2.5-1.1 0.7 0.15 1.3 0.6 1.5 1.1" />
      {/* Shoulders & jacket */}
      <path d="M8.5 13.5 L8.5 9.5 C8.5 8.5 9.5 7.8 10.5 7.8 L12 7.8 L13.5 7.8 C14.5 7.8 15.5 8.5 15.5 9.5 L15.5 13.5" />
      {/* Tie */}
      <path d="M12 7.8 L11.5 11 L12 13 L12.5 11 L12 7.8Z" />
      {/* Podium top surface */}
      <path d="M6.5 13.5 L17.5 13.5" strokeWidth={2} />
      {/* Podium body */}
      <path d="M7.5 14.5 L8.5 21 L15.5 21 L16.5 14.5" />
    </svg>
  )
}
