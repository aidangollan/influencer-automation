"use client";

import { useState, useRef, useEffect } from "react";
import { useFlow } from "@/context/flow-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

export function ScriptEditorStep() {
  const {
    scriptLines,
    updateScriptLine,
    addScriptLine,
    removeScriptLine,
    setStep,
    setScriptLines,
    setScenePlans,
    setGenerationStatus,
    setIsGeneratingScript,
    productSummary,
    productInfo,
    chatMessages,
    addChatMessage,
  } = useFlow();

  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPlanningScenes, setIsPlanningScenes] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);


  function handleSendChat() {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput.trim(),
    };
    addChatMessage(userMessage);
    const message = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);

    const prevLines = [...scriptLines];

    fetch("/api/edit-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptLines, message }),
    })
      .then((res) => res.json())
      .then((data) => {
        const newLines: string[] = data.lines;
        setScriptLines(newLines);

        // Find changed lines
        const changed = new Set<number>();
        for (let i = 0; i < Math.max(prevLines.length, newLines.length); i++) {
          if (prevLines[i] !== newLines[i]) {
            changed.add(i);
          }
        }
        setHighlightedLines(changed);
        setTimeout(() => setHighlightedLines(new Set()), 2000);

        addChatMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.explanation ?? "Script updated.",
        });
      })
      .catch(() => {
        addChatMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong. Try again.",
        });
      })
      .finally(() => setIsChatLoading(false));
  }

  return (
    <div className="flex h-full bg-white">
      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#eceef1]">
        {/* Top bar */}
        <div className="h-[52px] border-b border-[#eceef1] flex items-center justify-between px-6 shrink-0">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-[14px] text-[#6b7280] hover:text-[#111827] transition-colors rounded-lg px-2.5 py-1.5 hover:bg-[#f3f4f6] cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Prompt
          </button>
          <Button
            disabled={isPlanningScenes}
            onClick={async () => {
              setIsPlanningScenes(true);
              setIsGeneratingScript(true);
              setGenerationStatus("Planning scenes...");

              const res = await fetch("/api/plan-scenes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scriptLines, productSummary, productInfo }),
              });

              const data = await res.json();
              setScenePlans(data.scenePlans);
              setIsGeneratingScript(false);
              setGenerationStatus("");
              setIsPlanningScenes(false);
              setStep(3);
            }}
            className="h-[34px] px-4 gap-1.5 rounded-[8px] text-[13px] font-medium bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer"
          >
            {isPlanningScenes ? "Planning scenes..." : "Generate Video"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Script lines */}
        <div className="flex-1 overflow-auto pl-[260px] pr-6">
          <div className="min-h-full flex items-center">
          <div className="w-full space-y-4 py-8 px-2">
            {scriptLines.map((line, index) => (
              <div
                key={index}
                className="flex items-center gap-3.5"
              >
                {/* Line number circle */}
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-white text-[13px] font-semibold">
                  {index + 1}
                </div>

                {/* Input */}
                <div className="flex-1 min-w-0">
                  <input
                    value={line}
                    onChange={(e) => updateScriptLine(index, e.target.value)}
                    className={cn(
                      "w-full rounded-[8px] px-4 py-[10px] text-[14px] text-[#111827] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:bg-white focus:shadow-sm transition-all border border-transparent focus:border-[#3b82f6]/30",
                      highlightedLines.has(index)
                        ? "bg-[#3b82f6]/10 border-[#3b82f6]/20"
                        : "bg-[#f3f4f6]"
                    )}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setChatInput(`Make the following changes to line ${index + 1}: `);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-[#93c5fd] hover:text-[#3b82f6] hover:bg-[#eff6ff] transition-colors cursor-pointer"
                    title="Edit with AI"
                  >
                    <Sparkles className="h-[15px] w-[15px]" />
                  </button>
                  <button
                    onClick={() => removeScriptLine(index)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-[#fca5a5] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                    title="Delete line"
                  >
                    <Trash2 className="h-[15px] w-[15px]" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add segment */}
            <button
              onClick={addScriptLine}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[8px] border border-dashed border-[#d1d5db] text-[13px] text-[#6b7280] font-medium hover:border-[#3b82f6] hover:text-[#3b82f6] hover:bg-[#eff6ff] transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Segment
            </button>
          </div>
          </div>
        </div>

      </div>

      {/* AI Chat Panel — right side */}
      <div className="w-[340px] flex flex-col shrink-0 bg-white">
        {/* Chat body */}
        <ScrollArea className="flex-1">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[500px] px-8">
              {/* Illustration matching reference — abstract list/edit icon */}
              <div className="mb-4 opacity-20">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  {/* List lines */}
                  <rect x="12" y="16" width="36" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="28" width="28" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="40" width="32" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="52" width="24" height="5" rx="2.5" fill="#6b7280" />
                  {/* Edit circle */}
                  <circle cx="58" cy="40" r="14" stroke="#6b7280" strokeWidth="3" fill="none" />
                  <path d="M53 40l4 4 7-8" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[14px] text-[#9ca3af] leading-relaxed">
                Ask AI to edit your script...
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[16px] px-4 py-2.5 text-[14px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-[#3b82f6] text-white"
                        : "bg-[#f3f4f6] text-[#111827]"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#f3f4f6] rounded-[16px] px-4 py-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Chat input */}
        <div className="p-4 border-t border-[#eceef1]">
          <div className="relative">
            <textarea
              placeholder="Ask to edit your script..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              rows={2}
              className="w-full resize-none rounded-[12px] border border-[#e5e7eb] bg-white px-4 py-3 pr-12 text-[14px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6]/30 transition-all leading-relaxed"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim()}
              className={cn(
                "absolute bottom-3 right-3 h-[30px] w-[30px] rounded-full flex items-center justify-center transition-all shadow-sm",
                chatInput.trim()
                  ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                  : "bg-[#e5e7eb] text-[#9ca3af]"
              )}
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
