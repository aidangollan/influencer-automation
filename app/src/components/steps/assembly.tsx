"use client";

import { useEffect, useRef, useState } from "react";
import { useFlow } from "@/context/flow-context";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, Film, Check, Sparkles } from "lucide-react";

export function AssemblyStep() {
  const { finalVideoUrl, setFinalVideoUrl, scenes, resetFlow } = useFlow();
  const [status, setStatus] = useState<"submitting" | "transcribing" | "rendering" | "complete" | "failed">("submitting");
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const submittedRef = useRef(false);

  // Submit auto-cut job on mount
  useEffect(() => {
    if (submittedRef.current || finalVideoUrl) return;
    submittedRef.current = true;

    const clipUrls = scenes
      .filter((s) => s.status === "complete" && s.videoUrl)
      .map((s) => s.videoUrl);

    if (clipUrls.length === 0) {
      setStatus("failed");
      setError("No completed clips to assemble");
      return;
    }

    setStatus("transcribing");

    fetch("/api/auto-cut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipUrls }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus("failed");
          setError(data.error);
          return;
        }

        setStatus("rendering");

        // Start polling for render status
        pollingRef.current = setInterval(async () => {
          const res = await fetch(`/api/auto-cut?jobId=${data.jobId}`);
          const statusData = await res.json();

          if (statusData.status === "complete") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setFinalVideoUrl(statusData.videoUrl);
            setStatus("complete");
          } else if (statusData.status === "failed") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setStatus("failed");
            setError(statusData.error);
          }
        }, 3000);
      })
      .catch((err) => {
        setStatus("failed");
        setError(String(err));
      });

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [scenes, finalVideoUrl, setFinalVideoUrl]);

  const isProcessing = status === "submitting" || status === "transcribing" || status === "rendering";

  const statusText = {
    submitting: "Preparing clips...",
    transcribing: "Transcribing audio...",
    rendering: "Cutting and assembling...",
    complete: "",
    failed: "",
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="max-w-[400px] w-full px-6">
        {isProcessing && (
          <div className="text-center">
            <div className="relative h-[72px] w-[72px] mx-auto mb-5">
              <svg className="absolute inset-0 animate-spin" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="#dbeafe" strokeWidth="5" />
                <path d="M36 6a30 30 0 0 1 30 30" fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-[#3b82f6]" />
              </div>
            </div>
            <h2 className="text-[17px] font-semibold text-[#111827]">
              {statusText[status]}
            </h2>
            <p className="text-[14px] text-[#9ca3af] mt-1">
              Removing dead space from {scenes.length} clips
            </p>
          </div>
        )}

        {status === "complete" && finalVideoUrl && (
          <div className="space-y-5">
            <div className="aspect-[9/16] bg-[#f3f4f6] border border-[#e5e7eb] rounded-[14px] overflow-hidden mx-auto max-w-[260px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <video
                src={finalVideoUrl}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[13px] text-[#3b82f6] font-medium">
              <Check className="h-4 w-4" />
              Video assembled
            </div>

            <div className="flex gap-2.5">
              <a
                href={finalVideoUrl}
                download="ugc-video.mp4"
                className="flex-1 flex items-center justify-center gap-2 h-[38px] rounded-[8px] text-[14px] font-medium bg-[#3b82f6] hover:bg-[#2563eb] text-white cursor-pointer transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <Button
                variant="outline"
                onClick={resetFlow}
                className="gap-2 h-[38px] rounded-[8px] text-[14px] border-[#e5e7eb] text-[#6b7280] hover:text-[#111827] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                New Video
              </Button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center space-y-4">
            <div className="h-[72px] w-[72px] mx-auto rounded-full bg-[#fef2f2] flex items-center justify-center">
              <Film className="h-8 w-8 text-[#ef4444]" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#111827]">Assembly failed</h2>
              <p className="text-[14px] text-[#9ca3af] mt-1">{error}</p>
            </div>
            <Button
              onClick={() => {
                submittedRef.current = false;
                setStatus("submitting");
                setError(null);
                setFinalVideoUrl(null);
              }}
              className="gap-2 h-[38px] rounded-[8px] text-[14px] bg-[#3b82f6] hover:bg-[#2563eb] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
