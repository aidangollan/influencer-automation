"use client";

import { useFlow } from "@/context/flow-context";
import { Sparkles } from "lucide-react";

export function ScriptLoading() {
  const { generationStatus } = useFlow();

  return (
    <>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40" />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-[20px] px-12 py-10 flex flex-col items-center gap-5 shadow-2xl w-[320px]">
          <div className="relative h-[72px] w-[72px]">
            <svg className="absolute inset-0 animate-spin" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="#dbeafe" strokeWidth="5" />
              <path d="M36 6a30 30 0 0 1 30 30" fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-[#3b82f6]" />
            </div>
          </div>
          <h3 className="text-[17px] font-semibold text-[#111827]">
            {generationStatus || "Generating your script"}
          </h3>
        </div>
      </div>
    </>
  );
}
