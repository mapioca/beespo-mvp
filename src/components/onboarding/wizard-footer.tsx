'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canSkip: boolean;
  canContinue: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
  hideNavigation?: boolean;
  className?: string;
}

const inkSubtle = 'color-mix(in srgb, var(--lp-ink) 65%, transparent)';
const inkBorder = '1px solid color-mix(in srgb, var(--lp-ink) 18%, transparent)';
const trackBg = 'color-mix(in srgb, var(--lp-ink) 10%, transparent)';

export function WizardFooter({
  currentStep,
  totalSteps,
  canGoBack,
  canSkip,
  canContinue,
  isLastStep,
  onBack,
  onSkip,
  onContinue,
  continueLabel,
  hideNavigation = false,
  className,
}: WizardFooterProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      {!hideNavigation && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            {canGoBack && (
              <Button
                onClick={onBack}
                className="gap-2 rounded-md font-medium transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--lp-bg)',
                  color: 'var(--lp-ink)',
                  border: inkBorder,
                }}
              >
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
                className="bg-transparent font-medium transition-opacity hover:bg-transparent hover:opacity-100"
                style={{ color: inkSubtle }}
              >
                Skip this step
              </Button>
            )}
            <Button
              onClick={onContinue}
              disabled={!canContinue}
              className="gap-2 rounded-md border-0 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--lp-accent)', color: 'var(--lp-bg)' }}
            >
              {continueLabel || (isLastStep ? 'Complete setup' : 'Continue')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="h-1 overflow-hidden rounded-full" style={{ background: trackBg }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, background: 'var(--lp-accent)' }}
        />
      </div>
    </div>
  );
}
