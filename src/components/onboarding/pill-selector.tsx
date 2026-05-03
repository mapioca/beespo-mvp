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

  const unselectedStyle = {
    background: 'var(--lp-bg)',
    color: 'var(--lp-ink)',
    border: '1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)',
  };
  const selectedStyle = {
    background: 'var(--lp-accent)',
    color: 'var(--lp-bg)',
    border: '1px solid var(--lp-accent)',
  };

  return (
    <div
      role={multiple ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className={cn('flex flex-wrap justify-start gap-3', className)}
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
            style={selected ? selectedStyle : unselectedStyle}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5',
              'transition-all duration-200 ease-in-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              !selected && !disabled && 'hover:opacity-90',
              disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            <span className="text-sm font-medium">{option.label}</span>
            <div
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center transition-all duration-200',
                selected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
