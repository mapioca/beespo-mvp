'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tags } from 'lucide-react'
import type { DirectoryTag } from '@/types/database'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

interface TagFilterDropdownProps {
  workspaceTags: DirectoryTag[]
  selectedTagIds: string[]
  onSelectionChange: (ids: string[]) => void
  canManage?: boolean
  onCreateTag?: () => void
  onManageTags?: () => void
}

export function TagFilterDropdown({
  workspaceTags,
  selectedTagIds,
  onSelectionChange,
  canManage,
  onCreateTag,
  onManageTags,
}: TagFilterDropdownProps) {
  const isActive = selectedTagIds.length > 0

  const handleToggle = (tagId: string) => {
    const newIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    onSelectionChange(newIds)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 relative">
          <Tags className="h-4 w-4" />
          {isActive && (
            <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full h-5 w-5 text-[10px] font-semibold flex items-center justify-center">
              {selectedTagIds.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {workspaceTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleToggle(tag.id)}
                  className="cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTagIds.includes(tag.id)}
                    className="mr-2"
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0 mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span>{tag.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {isActive && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClearAll}
                    className="cursor-pointer justify-center text-center font-medium"
                  >
                    Clear all
                  </CommandItem>
                </CommandGroup>
              </>
            )}
            {canManage && (onCreateTag || onManageTags) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {onManageTags && (
                    <CommandItem
                      onSelect={() => {
                        onManageTags()
                      }}
                      className="cursor-pointer text-muted-foreground transition-all hover:text-foreground"
                    >
                      Manage tags
                    </CommandItem>
                  )}
                  {onCreateTag && (
                    <CommandItem
                      onSelect={() => {
                        onCreateTag()
                      }}
                      className="cursor-pointer text-muted-foreground transition-all hover:text-foreground"
                    >
                      Create new tag
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
