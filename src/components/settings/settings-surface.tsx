import { cn } from "@/lib/utils"

interface SettingsPageShellProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerClassName?: string
}

interface SettingsSectionProps {
  label?: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  labelClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

interface SettingsGroupProps {
  children: React.ReactNode
  className?: string
}

interface SettingsRowProps {
  title: string
  description?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}

interface SettingsFieldRowProps {
  label: string
  labelClassName?: string
  hint?: string
  hintClassName?: string
  children: React.ReactNode
  className?: string
  dividerStyle?: "full" | "inset" | "none"
  align?: "start" | "center"
}

export const settingsInputClassName =
  "h-10 border-[hsl(var(--settings-input-border))] bg-[hsl(var(--settings-input-bg))] shadow-none focus-visible:border-[hsl(var(--settings-input-focus))] focus-visible:ring-0"

export function SettingsPageShell({
  title,
  description,
  children,
  className,
  contentClassName,
  headerClassName,
}: SettingsPageShellProps) {
  return (
    <div className="min-h-full">
      <div
        className={cn(
          "mx-auto w-full max-w-[var(--settings-shell-max-width)] px-[var(--settings-shell-pad-x)] py-[var(--settings-shell-pad-y)]",
          className
        )}
      >
        <header className={cn("space-y-1 pb-6", headerClassName)}>
          <h1 className="text-[length:var(--settings-title-size)] font-semibold leading-tight">{title}</h1>
          {description ? (
            <p className="max-w-[70ch] text-[length:var(--settings-description-size)] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
        <div className={cn("space-y-8", contentClassName)}>{children}</div>
      </div>
    </div>
  )
}

export function SettingsSection({
  label,
  title,
  description,
  children,
  className,
  labelClassName,
  titleClassName,
  descriptionClassName,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        {label ? (
          <p
            className={cn(
              "text-[length:var(--settings-label-size)] font-medium tracking-[0.02em] text-muted-foreground",
              labelClassName
            )}
          >
            {label}
          </p>
        ) : null}
        <h2 className={cn("text-[length:var(--settings-body-size)] font-semibold", titleClassName)}>{title}</h2>
        {description ? (
          <p
            className={cn(
              "text-[length:var(--settings-body-size)] text-muted-foreground",
              descriptionClassName
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function SettingsGroup({ children, className }: SettingsGroupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--settings-surface-radius)] border border-[hsl(var(--settings-surface-border))] bg-[hsl(var(--settings-surface-bg))]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SettingsRow({ title, description, leading, trailing, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        "grid min-h-[var(--settings-row-min-height)] grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[hsl(var(--settings-divider))] px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)] transition-colors last:border-b-0 hover:bg-[hsl(var(--settings-row-hover))]",
        className
      )}
    >
      {leading ? <div className="flex items-center justify-center">{leading}</div> : <div />}
      <div className="min-w-0">
        <p className="truncate text-[length:var(--settings-body-size)] font-medium">{title}</p>
        {description ? (
          <p className="mt-0.5 truncate text-[length:var(--settings-meta-size)] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : <div />}
    </div>
  )
}

export function SettingsFieldRow({
  label,
  labelClassName,
  hint,
  hintClassName,
  children,
  className,
  dividerStyle = "full",
  align = "start",
}: SettingsFieldRowProps) {
  return (
    <div
      className={cn(
        "grid gap-2 px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)] md:grid-cols-[10rem_1fr]",
        dividerStyle === "full" && "border-b border-[hsl(var(--settings-divider))] last:border-b-0",
        dividerStyle === "inset" &&
          "relative border-b-0 after:absolute after:bottom-0 after:left-[var(--settings-row-padding-x)] after:right-[var(--settings-row-padding-x)] after:h-px after:bg-[hsl(var(--settings-divider)/0.35)] last:after:hidden",
        className
      )}
    >
      <div className={cn(align === "center" ? "py-2" : "pt-1")}>
        <p className={cn("text-[length:var(--settings-body-size)] font-medium", labelClassName)}>{label}</p>
        {hint ? (
          <p
            className={cn(
              "mt-0.5 text-[length:var(--settings-meta-size)] text-muted-foreground",
              hintClassName
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
