import { cn } from "@/lib/utils"

// ─── Shared input class ────────────────────────────────────────────────────────
// Use this on every Input / Textarea / SelectTrigger inside a form-surface form.
export const formInputClassName =
  "h-[var(--form-input-height)] rounded-[var(--form-input-radius)] border-[var(--form-input-border)] bg-background shadow-none focus-visible:ring-0 focus-visible:border-foreground/30 text-sm placeholder:text-muted-foreground"

// ─── FormShell ─────────────────────────────────────────────────────────────────
interface FormShellProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormShell({ title, description, children, className }: FormShellProps) {
  return (
    <div className="min-h-full">
      <div className={cn("mx-auto w-full max-w-2xl px-6 py-8", className)}>
        <header className="mb-8">
          <h1 className="text-[17px] font-medium tracking-[-0.01em] text-foreground/90">{title}</h1>
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
          )}
        </header>
        <div
          className="flex flex-col"
          style={{ gap: "var(--form-section-gap)" }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── FormSection ───────────────────────────────────────────────────────────────
interface FormSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <section className={cn("flex flex-col", className)} style={{ gap: "var(--form-field-gap)" }}>
      {title && (
        <p
          className="uppercase font-medium"
          style={{
            fontSize: "var(--form-section-header-size)",
            color: "var(--form-section-header-color)",
            letterSpacing: "var(--form-section-header-spacing)",
          }}
        >
          {title}
        </p>
      )}
      {children}
    </section>
  )
}

// ─── FormField ─────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, htmlFor, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="font-medium"
        style={{
          fontSize: "var(--form-label-size)",
          color: "var(--form-label-color)",
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
