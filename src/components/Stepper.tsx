import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  current: 1 | 2 | 3 | 4 | 5;
}

const steps = [
  { id: 1, label: 'OCR' },
  { id: 2, label: 'Validation' },
  { id: 3, label: 'IPFS' },
  { id: 4, label: 'Mint' },
  { id: 5, label: 'Indexation' },
];

export function Stepper({ current }: StepperProps) {
  return (
    <nav aria-label="Mint progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isDone = step.id < current;
          const isActive = step.id === current;
          const isTodo = step.id > current;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                    isDone && 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg',
                    isActive && 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white ring-4 ring-violet-200 dark:ring-violet-900/40 shadow-xl scale-110',
                    isTodo && 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors',
                    (isDone || isActive) && 'text-violet-700 dark:text-violet-300',
                    isTodo && 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-all duration-500',
                    isDone && 'bg-gradient-to-r from-violet-600 to-fuchsia-600',
                    !isDone && 'bg-slate-200 dark:bg-slate-700'
                  )}
                  style={{ marginTop: '-2rem' }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
