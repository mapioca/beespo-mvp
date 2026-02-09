'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface PillOption {
  value: string;
  label: string;
  description: string; // Kept for data but NOT rendered
  icon?: ReactNode;
}

interface PillSelectorProps {
  options: PillOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  maxSelections?: number;
  ariaLabel?: string;
  className?: string;
}

export function PillSelector({
  options,
  value,
  onChange,
  multiple = false,
  maxSelections,
  ariaLabel,
  className,
}: PillSelectorProps) {
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
    <div
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className={cn(
        'flex flex-wrap justify-start gap-3',
        className
      )}
    >
      {options.map((option) => {
        const selected = isSelected(option.value);
        const disabled = isDisabled(option.value);

        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            aria-disabled={disabled}
            onClick={() => !disabled && handleSelect(option.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2.5',
              'px-5 py-2.5 whitespace-nowrap',
              'rounded-full border transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              // Default state - darker border for WCAG 3:1 contrast
              'border-gray-400 bg-background',
              // Hover state
              'hover:border-primary/50 hover:bg-accent/30',
              // Selected state
              selected && 'border-primary bg-primary/5 ring-1 ring-primary',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed hover:border-gray-400 hover:bg-transparent'
            )}
          >
            {/* Label */}
            <span
              className={cn(
                'text-sm font-medium',
                'transition-colors duration-150',
                selected ? 'text-primary' : 'text-foreground'
              )}
            >
              {option.label}
            </span>

            {/* Checkmark */}
            <div
              className={cn(
                'flex-shrink-0 w-4 h-4',
                'flex items-center justify-center',
                'transition-transform duration-150',
                selected ? 'scale-100' : 'scale-0'
              )}
            >
              <Check className="h-4 w-4 text-primary" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
