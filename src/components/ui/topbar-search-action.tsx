"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface TopbarSearchItem {
  id: string
  label: string
  actionLabel?: string
}

interface TopbarSearchActionProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label?: string
  items: TopbarSearchItem[]
  onSelect: (id: string) => void
  emptyText?: string
}

export function TopbarSearchAction({
  value,
  onChange,
  placeholder,
  label = "Search",
  items,
  onSelect,
  emptyText = "No matching results.",
}: TopbarSearchActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded-full border-0 px-2.5 text-[length:var(--agenda-control-font-size)] text-nav shadow-none ring-0 transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] data-[state=open]:bg-[hsl(var(--agenda-interactive-active))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Search className="h-3.5 w-3.5" />
          {value ? `Search: ${value}` : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-8 rounded-md border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <div className="mt-1 border-t border-border/60" />
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[length:var(--agenda-control-font-size)] text-nav hover:bg-nav-hover hover:text-nav-strong"
            >
              <span className="truncate font-medium">{item.label}</span>
              <span className="ml-2 shrink-0 text-[length:var(--table-micro-font-size)] text-nav-muted">
                {item.actionLabel ?? "Open"}
              </span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="px-2 py-1.5 text-[length:var(--table-header-font-size)] text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
