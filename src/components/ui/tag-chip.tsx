import { X } from 'lucide-react'
import type { DirectoryTag } from '@/types/database'

interface TagChipProps {
  tag: DirectoryTag
  onRemove?: () => void
}

export function TagChip({ tag, onRemove }: TagChipProps) {
  const backgroundColor = tag.color + '20'

  return (
    <span
      style={{ backgroundColor, color: tag.color }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}
