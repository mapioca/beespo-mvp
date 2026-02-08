'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface TileOption {
  value: string;
  label: string;
  description: string;
  icon?: ReactNode;
}

interface TileSelectorProps {
  options: TileOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  maxSelections?: number;
  ariaLabel?: string;
  className?: string;
}

export function TileSelector({
  options,
  value,
  onChange,
  multiple = false,
  maxSelections,
  ariaLabel,
  className,
}: TileSelectorProps) {
  const selectedValues = Array.isArray(value) ? value : [value];

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const currentValues = selectedValues.filter((v) => v !== '');
      if (currentValues.includes(optionValue)) {
        onChange(currentValues.filter((v) => v !== optionValue));
      } else {
        if (maxSelections && currentValues.length >= maxSelections) {
          return;
        }
        onChange([...currentValues, optionValue]);
      }
    } else {
      onChange(optionValue);
    }
  };

  const isSelected = (optionValue: string) => selectedValues.includes(optionValue);

  const isDisabled = (optionValue: string) => {
    if (!multiple || !maxSelections) return false;
    const currentValues = selectedValues.filter((v) => v !== '');
    return currentValues.length >= maxSelections && !currentValues.includes(optionValue);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        role={multiple ? 'group' : 'radiogroup'}
        aria-label={ariaLabel}
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 gap-3',
          className
        )}
      >
        {options.map((option) => {
          const selected = isSelected(option.value);
          const disabled = isDisabled(option.value);

          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role={multiple ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  aria-disabled={disabled}
                  onClick={() => !disabled && handleSelect(option.value)}
                  disabled={disabled}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-2',
                    'aspect-square p-4',
                    'rounded-lg border-2 transition-all duration-150 ease-out',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    // Default state
                    'border-muted bg-background',
                    // Hover state
                    'hover:border-primary/50 hover:bg-accent/30 hover:scale-[1.02]',
                    // Active/pressed state
                    'active:scale-[0.98]',
                    // Selected state
                    selected && 'border-primary bg-primary/5 ring-2 ring-primary',
                    // Disabled state
                    disabled && 'opacity-50 cursor-not-allowed hover:border-muted hover:bg-transparent hover:scale-100'
                  )}
                >
                  {/* Checkmark badge */}
                  <div
                    className={cn(
                      'absolute top-1.5 right-1.5',
                      'w-[18px] h-[18px] rounded-full',
                      'bg-primary flex items-center justify-center',
                      'transition-transform duration-150 ease-out',
                      selected ? 'scale-100' : 'scale-0'
                    )}
                  >
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>

                  {/* Icon */}
                  {option.icon && (
                    <div
                      className={cn(
                        'flex items-center justify-center',
                        'transition-colors duration-150',
                        selected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {option.icon}
                    </div>
                  )}

                  {/* Label */}
                  <span
                    className={cn(
                      'text-sm font-semibold text-center leading-tight line-clamp-2',
                      'transition-colors duration-150',
                      selected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center">
                <p>{option.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
