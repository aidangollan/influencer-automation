"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFlow } from "@/context/flow-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Film,
  ArrowRight,
  ArrowUp,
  X,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scene, ChatMessage } from "@/types";

export function GenerationStep() {
  const {
    scriptLines,
    scenePlans,
    scenes,
    setScenes,
    updateScene,
    setStep,
    setScenePlans,
    influencerImage,
    productImages,
    productSummary,
    chatMessages,
    addChatMessage,
  } = useFlow();

  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const submittingRef = useRef(false);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize scenes from script lines + scene plans
  useEffect(() => {
    if (scenes.length === 0 && scriptLines.length > 0) {
      const newScenes: Scene[] = scriptLines.map((line, i) => {
        const plan = scenePlans[i];
        return {
          id: crypto.randomUUID(),
          scriptLine: line,
          status: "pending",
          videoUrl: null,
          thumbnailUrl: null,
          accepted: false,
          imagePrompt: plan?.imagePrompt ?? "",
          imageSource: plan?.imageSource ?? "original",
          showProduct: plan?.showProduct ?? false,
          videoPrompt: plan?.videoPrompt ?? "",
          phase: "idle",
          jobId: null,
          jobModel: null,
          clipDuration: plan?.clipDuration ?? 5,
          duration: plan?.estimatedDuration ?? null,
        };
      });
      setScenes(newScenes);
    }
  }, [scenes.length, scriptLines, scenePlans, setScenes]);

  // Submit scenes sequentially
  useEffect(() => {
    if (submittingRef.current) return;

    const pendingIndex = scenes.findIndex((s) => s.status === "pending");
    if (pendingIndex === -1) return;

    const scene = scenes[pendingIndex];
    if (scene.imageSource === "previous" && pendingIndex > 0) {
      const prevScene = scenes[pendingIndex - 1];
      if (prevScene.status !== "complete" && !prevScene.thumbnailUrl) return;
    }

    let inputImage = influencerImage;
    if (scene.imageSource === "previous" && pendingIndex > 0) {
      const prevScene = scenes[pendingIndex - 1];
      if (prevScene.thumbnailUrl) {
        inputImage = prevScene.thumbnailUrl;
      }
    }

    const skipImageGen = scene.imageSource === "skip" || !scene.imagePrompt;

    submittingRef.current = true;
    updateScene(scene.id, { status: "generating", phase: skipImageGen ? "video" : "image" });

    if (skipImageGen) {
      fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageSource: "skip",
          influencerImage: inputImage,
          videoPrompt: scene.videoPrompt,
          clipDuration: scene.clipDuration,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          updateScene(scene.id, {
            phase: "video",
            jobId: data.videoJobId,
            jobModel: data.videoModel,
            thumbnailUrl: inputImage,
          });
        })
        .finally(() => { submittingRef.current = false; });
    } else {
      fetch("/api/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageSource: scene.imageSource,
          imagePrompt: scene.imagePrompt,
          showProduct: scene.showProduct,
          influencerImage: inputImage,
          productImage: scene.showProduct ? productImages[0] ?? null : null,
          videoPrompt: scene.videoPrompt,
          clipDuration: scene.clipDuration,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          updateScene(scene.id, {
            phase: "image",
            jobId: data.imageJobId,
            jobModel: data.imageModel,
          });
        })
        .finally(() => { submittingRef.current = false; });
    }
  }, [scenes, influencerImage, productImages, updateScene]);

  // Poll for job status
  useEffect(() => {
    const generatingScenes = scenes.filter(
      (s) => s.status === "generating" && s.jobId
    );
    if (generatingScenes.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      for (const scene of generatingScenes) {
        if (!scene.jobId || !scene.jobModel) continue;

        const res = await fetch("/api/scene-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: scene.jobId,
            model: scene.jobModel,
            phase: scene.phase,
            videoPrompt: scene.videoPrompt,
            clipDuration: scene.clipDuration,
            firstFrameUrl: scene.thumbnailUrl,
          }),
        });

        const data = await res.json();

        if (data.status === "generating_video") {
          updateScene(scene.id, {
            phase: "video",
            jobId: data.videoJobId,
            jobModel: data.videoModel,
            thumbnailUrl: data.firstFrameUrl,
          });
        } else if (data.status === "complete") {
          updateScene(scene.id, {
            status: "complete",
            videoUrl: data.videoUrl,
            thumbnailUrl: data.firstFrameUrl ?? scene.thumbnailUrl,
            phase: "idle",
            jobId: null,
            jobModel: null,
          });
        } else if (data.status === "failed") {
          updateScene(scene.id, {
            status: "failed",
            phase: "idle",
            jobId: null,
            jobModel: null,
          });
        }
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [scenes, updateScene]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle hover autoplay
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === hoveredScene) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [hoveredScene]);

  const allComplete = scenes.length > 0 && scenes.every((s) => s.status === "complete");
  const completedCount = scenes.filter((s) => s.status === "complete").length;

  // AI Edit chat
  async function handleSendChat() {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput.trim(),
    };
    addChatMessage(userMessage);
    const editRequest = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);

    const res = await fetch("/api/edit-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenePlans,
        scriptLines,
        editRequest,
        productSummary,
      }),
    });

    const data = await res.json();
    const affected: Array<{
      index: number;
      imagePrompt: string;
      imageSource: "original" | "previous" | "skip";
      showProduct: boolean;
      videoPrompt: string;
    }> = data.affectedScenes;

    // Update scene plans
    const newPlans = [...scenePlans];
    for (const updated of affected) {
      if (newPlans[updated.index]) {
        newPlans[updated.index] = {
          ...newPlans[updated.index],
          imagePrompt: updated.imagePrompt,
          imageSource: updated.imageSource,
          showProduct: updated.showProduct,
          videoPrompt: updated.videoPrompt,
        };
      }
    }
    setScenePlans(newPlans);

    // Mark affected scenes as pending for regeneration
    for (const updated of affected) {
      const scene = scenes[updated.index];
      if (scene) {
        updateScene(scene.id, {
          status: "pending",
          videoUrl: null,
          thumbnailUrl: null,
          phase: "idle",
          jobId: null,
          jobModel: null,
          imagePrompt: updated.imagePrompt,
          imageSource: updated.imageSource,
          showProduct: updated.showProduct,
          videoPrompt: updated.videoPrompt,
        });
      }
    }

    addChatMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Regenerating ${affected.length} scene${affected.length === 1 ? "" : "s"}: ${affected.map((a) => `#${a.index + 1}`).join(", ")}.`,
    });

    setIsChatLoading(false);
  }

  return (
    <div className="flex h-full bg-white">
      {/* Main content — video clips */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#eceef1]">
        {/* Top bar */}
        <div className="h-[52px] border-b border-[#eceef1] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowBackConfirm(true)}
              className="flex items-center gap-1 text-[14px] text-[#6b7280] hover:text-[#111827] transition-colors rounded-lg px-2.5 py-1.5 hover:bg-[#f3f4f6] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Script
            </button>
            <div className="h-5 w-px bg-[#e5e7eb]" />
            <span className="text-[13px] text-[#9ca3af]">
              {completedCount}/{scenes.length} clips
            </span>
          </div>
          <Button
            disabled={!allComplete}
            onClick={() => setStep(4)}
            className="h-[34px] px-4 gap-1.5 rounded-[8px] text-[13px] font-medium bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Auto Cut
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Clips row */}
        <div className="flex-1 overflow-auto pl-[260px] pr-6 bg-[#f9fafb]">
          <div className="min-h-full flex items-center justify-center">
          <div className="flex flex-wrap gap-4 justify-center py-6">
            {scenes.map((scene, index) => (
              <div key={scene.id} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "relative rounded-[14px] overflow-hidden bg-white transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)] w-[180px] aspect-[9/16] cursor-pointer",
                  hoveredScene === scene.id
                    ? "border-2 border-[#3b82f6] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                    : "border border-[#e5e7eb]"
                )}
                onMouseEnter={() => setHoveredScene(scene.id)}
                onMouseLeave={() => setHoveredScene(null)}
              >
                {/* Video / loading states */}
                <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center relative overflow-hidden">
                  {scene.status === "pending" && (
                    <div className="text-center">
                      <Film className="h-6 w-6 mx-auto mb-1.5 text-[#d1d5db]" />
                      <p className="text-[11px] text-[#d1d5db] font-medium">
                        {scene.imageSource === "previous" && index > 0 && scenes[index - 1].status !== "complete"
                          ? "Waiting..."
                          : "Queued"}
                      </p>
                    </div>
                  )}

                  {scene.status === "generating" && (
                    <>
                      {scene.thumbnailUrl && (
                        <img src={scene.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="relative text-center">
                        <div className="relative h-8 w-8 mx-auto mb-1.5">
                          <svg className="animate-spin" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="12" fill="none" stroke={scene.thumbnailUrl ? "rgba(255,255,255,0.3)" : "#dbeafe"} strokeWidth="2.5" />
                            <path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke={scene.thumbnailUrl ? "white" : "#3b82f6"} strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p className={`text-[11px] font-medium ${scene.thumbnailUrl ? "text-white drop-shadow-md" : "text-[#9ca3af]"}`}>
                          {scene.phase === "image" ? "Generating Image..." : "Generating Video..."}
                        </p>
                      </div>
                    </>
                  )}

                  {scene.status === "complete" && scene.videoUrl && (
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(scene.id, el);
                        else videoRefs.current.delete(scene.id);
                      }}
                      src={scene.videoUrl}
                      className="w-full h-full object-cover"
                      playsInline
                      loop
                    />
                  )}

                  {scene.status === "failed" && (
                    <div className="text-center">
                      <X className="h-6 w-6 mx-auto mb-1.5 text-[#ef4444]" />
                      <p className="text-[11px] text-[#ef4444] font-medium">Failed</p>
                    </div>
                  )}
                </div>

                {/* Scene number badge */}
                <div className="absolute top-2.5 left-2.5 h-[22px] w-[22px] rounded-full bg-black/40 backdrop-blur-sm text-white text-[11px] flex items-center justify-center font-semibold">
                  {index + 1}
                </div>

              </div>

                {/* AI Edit button below video */}
                {scene.status === "complete" && (
                  <button
                    onClick={() => {
                      setChatInput(`Edit video ${index + 1} so it `);
                      setTimeout(() => chatInputRef.current?.focus(), 0);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#3b82f6] text-white text-[12px] font-medium cursor-pointer hover:bg-[#2563eb] transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Edit
                  </button>
                )}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <div className="w-[340px] flex flex-col shrink-0 bg-white">
        <ScrollArea className="flex-1">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full min-h-[400px] px-8">
              <div className="mb-4 opacity-20">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="12" y="16" width="36" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="28" width="28" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="40" width="32" height="5" rx="2.5" fill="#6b7280" />
                  <rect x="12" y="52" width="24" height="5" rx="2.5" fill="#6b7280" />
                  <circle cx="58" cy="40" r="14" stroke="#6b7280" strokeWidth="3" fill="none" />
                  <path d="M53 40l4 4 7-8" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[14px] text-[#9ca3af] leading-relaxed">
                Hover a clip and click AI Edit, or type a change below...
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
              ref={chatInputRef}
              placeholder="Describe changes to any scene..."
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
              disabled={!chatInput.trim() || isChatLoading}
              className={cn(
                "absolute bottom-3 right-3 h-[30px] w-[30px] rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer",
                chatInput.trim() && !isChatLoading
                  ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                  : "bg-[#e5e7eb] text-[#9ca3af]"
              )}
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Back confirmation modal */}
      <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0 rounded-[16px] border-[#e5e7eb] shadow-xl">
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">
              Go back to script?
            </h2>
            <p className="text-[14px] text-[#6b7280] mt-2 leading-relaxed">
              Your generated video clips will be lost. You&apos;ll need to regenerate them after editing the script.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb] rounded-b-[16px]">
            <Button
              variant="outline"
              onClick={() => setShowBackConfirm(false)}
              className="h-9 px-4 rounded-[8px] text-[14px] border-[#e5e7eb] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setScenes([]);
                setScenePlans([]);
                setShowBackConfirm(false);
                setStep(2);
              }}
              className="h-9 px-4 rounded-[8px] text-[14px] bg-[#ef4444] hover:bg-[#dc2626] cursor-pointer"
            >
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
