'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { id: 'payment', label: 'Payment' },
  { id: 'broker', label: 'Broker' },
  { id: 'prop', label: 'Prop Firm' },
  { id: 'review', label: 'Review' },
] as const;

export type WizardStepId = (typeof STEPS)[number]['id'];

interface OnboardingStepperProps {
  current: WizardStepId;
  /** Steps already completed (rendered with a check mark) */
  completed?: WizardStepId[];
}

export function OnboardingStepper({ current, completed = [] }: OnboardingStepperProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card elevation-1 p-4 sm:p-5">
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto">
        <ol
          aria-label="Onboarding progress"
          className="flex items-center min-w-max px-2 sm:px-0"
        >
          {STEPS.map((step, index) => {
            const isCurrent = step.id === current;
            const isDone = completed.includes(step.id);

            return (
              <li key={step.id} className="flex items-center">
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className={`mx-2 h-0.5 w-8 flex-shrink-0 rounded-full transition-colors sm:mx-4 sm:w-16 ${
                      isDone || isCurrent ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
                <div
                  className="flex flex-shrink-0 items-center gap-2 sm:gap-2.5"
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:h-9 sm:w-9 sm:text-sm ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                        : isDone
                          ? 'bg-success/15 text-success ring-1 ring-inset ring-success/25'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span
                    className={`whitespace-nowrap text-xs sm:text-sm ${
                      isCurrent
                        ? 'font-semibold text-foreground'
                        : isDone
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
