import { cn } from "@/lib/utils";

export interface SettingsSegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SettingsSegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SettingsSegmentedOption<T>[];
  disabled?: boolean;
  className?: string;
}

export function SettingsSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  className,
}: SettingsSegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex self-start h-10 rounded-lg border border-[hsl(var(--settings-input-border))] bg-muted/20 p-1 gap-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-8 rounded-md px-3 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value
              ? "bg-[#f9f7f5] text-[#1c1917] border border-[#e7e5e4] shadow-none"
              : "text-[#78716c] hover:text-[#1c1917] hover:bg-[#f9f7f5]/60",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
