'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Step progress indicator for wizard (e.g. 6 steps including "Your Details").
 * currentStep: 1-based index.
 * steps: array of { label, shortLabel?, icon? }.
 */
function ProgressSteps({ steps, currentStep, onStepClick, className }) {
  return (
    <nav
      aria-label="Progress"
      className={cn('flex items-center justify-center gap-1 sm:gap-2', className)}
    >
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCurrent = currentStep === stepNum;
        const isPast = currentStep > stepNum;
        const isClickable = onStepClick && isPast;
        const label = step.shortLabel ?? step.label;
        const displayLabel = step.icon ? `${step.icon} ${label}` : label;
        return (
          <React.Fragment key={stepNum}>
            {i > 0 && (
              <span
                className={cn(
                  'hidden sm:inline h-0.5 w-4 rounded',
                  isPast ? 'bg-primary' : 'bg-muted'
                )}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={isClickable ? () => onStepClick(stepNum) : undefined}
              disabled={!isClickable}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Step ${stepNum}: ${step.label}`}
              className={cn(
                'flex items-center justify-center min-w-[2rem] sm:min-w-0 h-9 px-2 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isCurrent &&
                  'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                isPast && 'bg-primary/90 text-primary-foreground hover:bg-primary/80',
                !isCurrent && !isPast && 'bg-muted text-muted-foreground',
                isClickable && 'cursor-pointer'
              )}
            >
              <span className="hidden sm:inline">{displayLabel}</span>
              <span className="sm:hidden">
                {step.icon ? `${step.icon} ` : ''}
                {stepNum}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export { ProgressSteps };
