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
      {/* Navigation buttons */}
      {!hideNavigation && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {canGoBack && (
              <Button variant="outline" onClick={onBack} className="gap-2 font-medium">
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
                className="text-gray-500 font-medium hover:text-gray-900"
              >
                Skip this step
              </Button>
            )}
            <Button
              onClick={onContinue}
              disabled={!canContinue}
              className="gap-2 font-medium bg-black hover:bg-gray-900 text-white"
            >
              {continueLabel || (isLastStep ? 'Complete Setup' : 'Continue')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
