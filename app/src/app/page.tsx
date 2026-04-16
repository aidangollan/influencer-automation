"use client";

import { FlowProvider, useFlow } from "@/context/flow-context";
import { StepProgress } from "@/components/step-progress";
import { InputsStep } from "@/components/steps/inputs";
import { ScriptEditorStep } from "@/components/steps/script-editor";
import { GenerationStep } from "@/components/steps/generation";
import { AssemblyStep } from "@/components/steps/assembly";
import { ScriptLoading } from "@/components/steps/script-loading";

function CurrentStep() {
  const { step } = useFlow();

  switch (step) {
    case 1:
      return <InputsStep />;
    case 2:
      return <ScriptEditorStep />;
    case 3:
      return <GenerationStep />;
    case 4:
      return <AssemblyStep />;
  }
}

function Layout() {
  const { step, isGeneratingScript } = useFlow();
  const isCentered = step === 1 || step === 4;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Step progress — always visible, absolutely positioned */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
        <StepProgress />
      </div>

      {/* Content */}
      {isCentered ? (
        <div className="h-full flex items-center justify-center overflow-auto">
          <CurrentStep />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CurrentStep />
        </div>
      )}

      {/* Loading overlay */}
      {isGeneratingScript && <ScriptLoading />}
    </div>
  );
}

export default function Home() {
  return (
    <FlowProvider>
      <div className="flex flex-col h-full bg-[#f3f4f6]">
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden pt-4 pl-4">
          <div className="flex-1 flex flex-col bg-white rounded-tl-2xl overflow-hidden">
            <Layout />
          </div>
        </main>
      </div>
    </FlowProvider>
  );
}
