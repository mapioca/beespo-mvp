'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

interface CreateTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTag: (name: string, color: string) => Promise<void>
  isLoading?: boolean
}

export function CreateTagDialog({
  open,
  onOpenChange,
  onCreateTag,
  isLoading,
}: CreateTagDialogProps) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[5])

  const handleCreate = async () => {
    if (!name.trim()) return
    await onCreateTag(name, selectedColor)
    setName('')
    setSelectedColor(COLOR_PALETTE[5])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag to organize people in your directory
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name *</Label>
            <Input
              id="tag-name"
              placeholder="e.g. Leadership, Volunteers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && !isLoading) {
                  handleCreate()
                }
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  disabled={isLoading}
                  style={{ backgroundColor: color }}
                  className={`h-8 rounded border-2 transition-all disabled:opacity-50 ${
                    selectedColor === color ? 'border-foreground' : 'border-transparent'
                  }`}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Tag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
