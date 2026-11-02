import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={step.title}>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200",
                    isCompleted && "bg-accent text-dark",
                    isCurrent && "bg-dark text-white ring-4 ring-accent/20",
                    !isCompleted && !isCurrent && "bg-ink/10 text-ink-mute"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center hidden sm:block max-w-[90px]",
                    isCurrent ? "text-ink font-semibold" : "text-ink-mute"
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors duration-200",
                    index < currentStep ? "bg-accent" : "bg-ink/10"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

