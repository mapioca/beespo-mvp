"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

const StandardPopoverMenu = DropdownMenuPrimitive.Root

const StandardPopoverMenuTrigger = DropdownMenuPrimitive.Trigger
const StandardPopoverMenuPortal = DropdownMenuPrimitive.Portal
const StandardPopoverMenuSub = DropdownMenuPrimitive.Sub

const StandardPopoverMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 origin-[--radix-dropdown-menu-content-transform-origin]",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
StandardPopoverMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const StandardPopoverMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[220px] overflow-hidden rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
StandardPopoverMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

interface StandardPopoverMenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  active?: boolean
}

const StandardPopoverMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  StandardPopoverMenuSubTriggerProps
>(({ className, active = false, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    data-active={active ? "true" : "false"}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-[hsl(var(--menu-text))] outline-none transition-colors",
      "focus:bg-[hsl(var(--menu-hover))] data-[state=open]:bg-[hsl(var(--menu-hover))] data-[active=true]:font-medium",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
  </DropdownMenuPrimitive.SubTrigger>
))
StandardPopoverMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

interface StandardPopoverMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  active?: boolean
}

const StandardPopoverMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  StandardPopoverMenuItemProps
>(({ className, active = false, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    data-active={active ? "true" : "false"}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-[hsl(var(--menu-text))] outline-none transition-colors",
      "focus:bg-[hsl(var(--menu-hover))] data-[active=true]:font-medium",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
StandardPopoverMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const StandardPopoverMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-[11px] text-muted-foreground tabular-nums",
      className
    )}
    {...props}
  />
)
StandardPopoverMenuShortcut.displayName = "StandardPopoverMenuShortcut"

export {
  StandardPopoverMenu,
  StandardPopoverMenuTrigger,
  StandardPopoverMenuPortal,
  StandardPopoverMenuSub,
  StandardPopoverMenuSubTrigger,
  StandardPopoverMenuSubContent,
  StandardPopoverMenuContent,
  StandardPopoverMenuItem,
  StandardPopoverMenuShortcut,
}
