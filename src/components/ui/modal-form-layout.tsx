"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const ModalForm = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ className, ...props }, ref) => (
  <form
    ref={ref}
    className={cn("flex h-full min-h-0 flex-col", className)}
    {...props}
  />
))
ModalForm.displayName = "ModalForm"

const ModalFormBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}
    {...props}
  />
))
ModalFormBody.displayName = "ModalFormBody"

const ModalFormSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <section ref={ref} className={cn("space-y-4", className)} {...props} />
))
ModalFormSection.displayName = "ModalFormSection"

const ModalFormSectionHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1", className)}
    {...props}
  />
))
ModalFormSectionHeader.displayName = "ModalFormSectionHeader"

const ModalFormSectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-sm font-semibold tracking-tight text-foreground", className)}
    {...props}
  />
))
ModalFormSectionTitle.displayName = "ModalFormSectionTitle"

const ModalFormSectionDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
))
ModalFormSectionDescription.displayName = "ModalFormSectionDescription"

const ModalFormFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border/60 bg-[hsl(var(--chrome)/0.95)] px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--chrome)/0.9)]",
      className
    )}
    {...props}
  />
))
ModalFormFooter.displayName = "ModalFormFooter"

export {
  ModalForm,
  ModalFormBody,
  ModalFormSection,
  ModalFormSectionHeader,
  ModalFormSectionTitle,
  ModalFormSectionDescription,
  ModalFormFooter,
}

