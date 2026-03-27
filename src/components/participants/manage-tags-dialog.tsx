'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Pencil } from 'lucide-react'
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

interface ManageTagsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: DirectoryTag[]
  onUpdateTag: (id: string, name: string, color: string) => Promise<void>
  onDeleteTag: (id: string) => Promise<void>
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  tags,
  onUpdateTag,
  onDeleteTag,
}: ManageTagsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const startEdit = (tag: DirectoryTag) => {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const handleSave = async (id: string) => {
    if (!editName.trim()) return
    setIsProcessing(id)
    try {
      await onUpdateTag(id, editName.trim(), editColor)
      setEditingId(null)
    } finally {
      setIsProcessing(null)
    }
  }

  const handleDelete = async (id: string) => {
    setIsProcessing(id)
    try {
      await onDeleteTag(id)
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Edit or delete existing tags. Deleting a tag removes it from all associated people.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tags created yet.</p>
          ) : (
            tags.map((tag) => {
              const isEditing = editingId === tag.id
              const isBusy = isProcessing === tag.id

              if (isEditing) {
                return (
                  <div key={tag.id} className="p-3 border rounded-md space-y-3 bg-muted/30">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Tag name"
                      disabled={isBusy}
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          disabled={isBusy}
                          style={{ backgroundColor: color }}
                          className={`h-6 w-6 rounded-full border-2 transition-all disabled:opacity-50 ${
                            editColor === color
                              ? 'border-foreground shadow-sm'
                              : 'border-transparent'
                          }`}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 justify-end pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isBusy}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(tag.id)}
                        disabled={isBusy || !editName.trim()}
                      >
                        {isBusy ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2 border rounded-md group hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium text-sm">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => startEdit(tag)}
                      disabled={isBusy || isProcessing !== null}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(tag.id)}
                      disabled={isBusy || isProcessing !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
