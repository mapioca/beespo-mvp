'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canSkip: boolean;
  canContinue: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
  className?: string;
}

export function StickyNavigation({
  currentStep,
  totalSteps,
  canGoBack,
  canSkip,
  canContinue,
  isLastStep,
  onBack,
  onSkip,
  onContinue,
  className,
}: StickyNavigationProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div
      className={cn(
        'sticky bottom-0 left-0 right-0',
        'bg-background/95 backdrop-blur-sm',
        'border-t border-border',
        'py-4 px-6',
        className
      )}
    >
      {/* Progress bar only - no text */}
      <div className="mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          {canGoBack && (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {canSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Skip this step
            </Button>
          )}
          <Button
            onClick={onContinue}
            disabled={!canContinue}
            className="gap-2"
          >
            {isLastStep ? 'Complete Setup' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
