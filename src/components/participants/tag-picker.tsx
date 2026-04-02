'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagChip } from '@/components/ui/tag-chip'
import type { DirectoryTag } from '@/types/database'

const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#64748b', // slate
  '#0ea5e9', // sky
]

interface TagPickerProps {
  participantId: string
  currentTags: DirectoryTag[]
  workspaceTags: DirectoryTag[]
  canManage: boolean
  onToggle: (tag: DirectoryTag, add: boolean) => Promise<void>
  onCreateTag: (name: string, color: string) => Promise<DirectoryTag | null>
}

export function TagPicker({
  currentTags,
  workspaceTags,
  canManage,
  onToggle,
  onCreateTag,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [createMode, setCreateMode] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[5])
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentTagIds = new Set(currentTags.map((t) => t.id))

  const handleToggleTag = async (tag: DirectoryTag) => {
    setIsLoading(true)
    try {
      const isAdding = !currentTagIds.has(tag.id)
      await onToggle(tag, isAdding)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setIsCreating(true)
    try {
      const newTag = await onCreateTag(newTagName, selectedColor)
      if (newTag) {
        setNewTagName('')
        setSelectedColor(COLOR_PALETTE[5])
        setCreateMode(false)
        // Auto-assign the new tag
        await handleToggleTag(newTag)
      }
    } finally {
      setIsCreating(false)
    }
  }

  if (!canManage) {
    return (
      <div className="flex flex-wrap gap-2">
        {currentTags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No tags</span>
        ) : (
          currentTags.map((tag) => <TagChip key={tag.id} tag={tag} />)
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto justify-start p-0 text-left hover:bg-transparent"
        >
          {currentTags.length === 0 ? (
            <span className="flex items-center gap-2">
              <Plus className="h-3 w-3" />
              Add tag
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {currentTags.map((tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {createMode ? (
          <div className="space-y-3 p-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tag Name</label>
              <Input
                placeholder="Enter tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag()
                  if (e.key === 'Escape') setCreateMode(false)
                }}
                disabled={isCreating}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Color</label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-6 rounded border-2 transition-all ${
                      selectedColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreating}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateMode(false)
                  setNewTagName('')
                  setSelectedColor(COLOR_PALETTE[5])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {workspaceTags.map((tag) => {
                  const isSelected = currentTagIds.has(tag.id)
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleToggleTag(tag)}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm flex-1">{tag.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </Command>
            <div className="border-t p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => setCreateMode(true)}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Create tag
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
