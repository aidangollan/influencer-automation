"use client";

import { useFlow } from "@/context/flow-context";
import type { Step } from "@/types";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps: { step: Step; label: string; subtitle: string }[] = [
  { step: 1, label: "Create Video", subtitle: "Describe your video" },
  { step: 2, label: "Edit Script", subtitle: "Review and refine" },
  { step: 3, label: "Generate Clips", subtitle: "Create video scenes" },
  { step: 4, label: "Auto Cut", subtitle: "Final video" },
];

export function StepProgress() {
  const { step: currentStep } = useFlow();

  return (
    <div className="w-[250px] shrink-0 pl-10 pr-4">
      <div className="flex flex-col">
        {steps.map(({ step, label, subtitle }, index) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;
          const isLast = index === steps.length - 1;

          return (
            <div key={step} className="flex items-start gap-4">
              {/* Dot column */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div
                  className={cn(
                    "flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[15px] font-semibold transition-colors",
                    isActive && "bg-[#3b82f6] text-white shadow-[0_0_0_4px_rgba(59,130,246,0.12)]",
                    isCompleted && "bg-[#3b82f6] text-white",
                    !isActive && !isCompleted && "bg-white border-[1.5px] border-[#e5e7eb] text-[#9ca3af]"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    step
                  )}
                </div>
                {/* Line */}
                {!isLast && (
                  <div
                    className={cn(
                      "w-px h-10",
                      isCompleted ? "bg-[#3b82f6]" : "bg-[#e5e7eb]"
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-2 pb-10 last:pb-0">
                <p
                  className={cn(
                    "text-[15px] font-semibold leading-tight",
                    isActive && "text-[#3b82f6]",
                    isCompleted && "text-[#111827]",
                    !isActive && !isCompleted && "text-[#9ca3af]"
                  )}
                >
                  {label}
                </p>
                {isActive && (
                  <p className="text-[13px] text-[#93c5fd] mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
