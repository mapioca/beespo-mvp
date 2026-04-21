"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface PickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  searchSlot: React.ReactNode   // full search bar row (input + any extras like language selector)
  children: React.ReactNode     // list body
  maxWidth?: string             // e.g. "max-w-[560px]", defaults to max-w-[520px]
  bodyClassName?: string
}

export function PickerModal({
  open,
  onOpenChange,
  title,
  searchSlot,
  children,
  maxWidth = "max-w-[520px]",
  bodyClassName,
}: PickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[80vh] gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl",
          maxWidth
        )}
      >
        {/* Head */}
        <DialogHeader className="border-b border-border/70 px-[18px] py-3.5">
          <DialogTitle className="font-serif text-[15px] font-normal text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex border-b border-border/70 bg-[#f7f6f4] dark:bg-surface-sunken">
          {searchSlot}
        </div>

        {/* Body */}
        <div className={cn("overflow-y-auto py-1", bodyClassName)}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
