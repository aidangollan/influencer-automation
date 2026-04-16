"use client";

import { useState, useRef } from "react";
import { useFlow } from "@/context/flow-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Film,
  User,
  ArrowUp,
  Check,
  Upload,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const PRESET_IMAGES = Array.from({ length: 25 }, (_, i) => ({
  id: `preset-${i + 1}`,
  src: `/influencers/ai-influencer-ref-${String(i + 1).padStart(3, "0")}.jpg`,
}));

export function InputsStep() {
  const {
    reelUrl,
    setReelUrl,
    productInfo,
    setProductInfo,
    productUrl,
    setProductUrl,
    influencerImage,
    setInfluencerImage,
    setStep,
    setIsGeneratingScript,
    setGenerationStatus,
    setScriptLines,
    setProductImages,
    setProductSummary,
  } = useFlow();

  const [reelModalOpen, setReelModalOpen] = useState(false);
  const [productUrlModalOpen, setProductUrlModalOpen] = useState(false);
  const [influencerModalOpen, setInfluencerModalOpen] = useState(false);
  const [reelInput, setReelInput] = useState(reelUrl);
  const [productUrlInput, setProductUrlInput] = useState(productUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingInfluencer, setPendingInfluencer] = useState<string | null>(influencerImage);

  const canSubmit = productInfo.trim() && reelUrl.trim() && influencerImage;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsGeneratingScript(true);
    setGenerationStatus(productUrl ? "Researching product..." : "Extracting reel...");

    const reelPromise = fetch("/api/extract-reel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reelUrl }),
    })
      .then((r) => r.json())
      .catch(() => ({ transcript: "" }));

    const productPromise = productUrl
      ? fetch("/api/research-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productUrl, productInfo }),
        })
          .then((r) => r.json())
          .then((data) => {
            setGenerationStatus("Extracting reel...");
            return data;
          })
          .catch(() => ({ summary: "" }))
      : Promise.resolve({ summary: "" });

    const [reelResult, productResult] = await Promise.all([reelPromise, productPromise]);

    // Store product research results
    if (productResult.summary) setProductSummary(productResult.summary);
    if (productResult.productImages) setProductImages(productResult.productImages);

    setGenerationStatus("Planning your video...");

    const scriptRes = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productInfo,
        productSummary: productResult.summary,
        reelTranscript: reelResult.transcript,
        influencerImage,
      }),
    });

    const scriptData = await scriptRes.json();
    setScriptLines(scriptData.lines);
    setIsGeneratingScript(false);
    setGenerationStatus("");
    setStep(2);
  }

  function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    setPendingInfluencer(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleSelectPreset(src: string) {
    setPendingInfluencer(src);
  }

  function handleConfirmInfluencer() {
    if (pendingInfluencer) {
      setInfluencerImage(pendingInfluencer);
    }
    setInfluencerModalOpen(false);
  }

  function handleOpenInfluencerModal() {
    setPendingInfluencer(influencerImage);
    setInfluencerModalOpen(true);
  }

  return (
    <div>
      <div className="max-w-[660px] w-full">
        {/* Heading */}
        <h1 className="text-[28px] font-bold text-[#111827] leading-tight tracking-[-0.01em]">
          Create New Video
        </h1>
        <p className="text-[15px] text-[#6b7280] mt-2 leading-relaxed">
          Describe your video, make sure to explain the product being sold, and
          add reference videos.
        </p>

        {/* Prompt card */}
        <div className="mt-7 rounded-[16px] border border-[#e5e7eb] bg-[#f3f4f6] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <textarea
            value={productInfo}
            onChange={(e) => setProductInfo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe the video you want to create and the product being promoted..."
            className="w-full resize-none bg-transparent px-6 pt-6 pb-4 text-[15px] text-[#111827] placeholder:text-[#9ca3af] focus:placeholder:text-transparent focus:outline-none min-h-[110px] leading-relaxed"
            rows={3}
          />

          {/* Tags + submit */}
          <div className="flex items-center justify-between px-6 pb-5">
            <div className="flex items-center gap-2">
              {/* Reel tag */}
              <button
                onClick={() => setReelModalOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors border cursor-pointer",
                  reelUrl
                    ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                    : "bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#d1d5db]"
                )}
              >
                <Film className="h-3.5 w-3.5" />
                {reelUrl ? "1 reel" : "Reference Reel"}
              </button>

              {/* Product URL tag */}
              <button
                onClick={() => {
                  setProductUrlInput(productUrl);
                  setProductUrlModalOpen(true);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors border cursor-pointer",
                  productUrl
                    ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                    : "bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#d1d5db]"
                )}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                {productUrl ? "Product" : "Product URL"}
              </button>

              {/* Influencer tag */}
              <button
                onClick={handleOpenInfluencerModal}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full text-sm font-medium transition-colors border cursor-pointer",
                  influencerImage
                    ? "bg-[#3b82f6] text-white border-[#3b82f6] pl-[3px] pr-3 py-[3px]"
                    : "bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#d1d5db] px-3 py-1"
                )}
              >
                {influencerImage ? (
                  <div className="h-[22px] w-[22px] rounded-full overflow-hidden border border-white/30">
                    <Image
                      src={influencerImage}
                      alt=""
                      width={22}
                      height={22}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
                Influencer
              </button>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "h-[38px] w-[38px] rounded-full flex items-center justify-center transition-all shadow-sm",
                canSubmit
                  ? "bg-[#3b82f6] text-white hover:bg-[#2563eb] cursor-pointer"
                  : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
              )}
            >
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Reference Reel Modal */}
      <Dialog open={reelModalOpen} onOpenChange={setReelModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-[16px] border-[#e5e7eb] shadow-xl">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[8px] bg-[#eff6ff] flex items-center justify-center">
                <Film className="h-4 w-4 text-[#3b82f6]" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                Reference Reel
              </h2>
            </div>
            <p className="text-[14px] text-[#6b7280] mt-2 leading-relaxed">
              Paste a link to the Instagram reel you want to replicate. The AI
              will analyze the script and sales style.
            </p>
          </div>

          <div className="px-6 pb-4">
            <Input
              placeholder="https://www.instagram.com/reel/..."
              value={reelInput}
              onChange={(e) => setReelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && reelInput.trim()) {
                  setReelUrl(reelInput.trim());
                  setReelModalOpen(false);
                }
              }}
              className="h-10 text-[14px] rounded-[8px] border-[#e5e7eb] placeholder:text-[#9ca3af]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb] rounded-b-[16px]">
            <Button
              variant="outline"
              onClick={() => setReelModalOpen(false)}
              className="h-9 px-4 rounded-[8px] text-[14px] border-[#e5e7eb] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setReelUrl(reelInput.trim());
                setReelModalOpen(false);
              }}
              disabled={!reelInput.trim()}
              className="h-9 px-4 gap-1.5 rounded-[8px] text-[14px] cursor-pointer"
            >
              <Film className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product URL Modal */}
      <Dialog open={productUrlModalOpen} onOpenChange={setProductUrlModalOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-[16px] border-[#e5e7eb] shadow-xl">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[8px] bg-[#eff6ff] flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-[#3b82f6]" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                Product URL
              </h2>
            </div>
            <p className="text-[14px] text-[#6b7280] mt-2 leading-relaxed">
              Add a link to the product page. The AI will research the product
              to generate accurate content.
            </p>
          </div>

          <div className="px-6 pb-4">
            <Input
              placeholder="https://www.example.com/product..."
              value={productUrlInput}
              onChange={(e) => setProductUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && productUrlInput.trim()) {
                  setProductUrl(productUrlInput.trim());
                  setProductUrlModalOpen(false);
                }
              }}
              className="h-10 text-[14px] rounded-[8px] border-[#e5e7eb] placeholder:text-[#9ca3af]"
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb] rounded-b-[16px]">
            <button
              onClick={() => {
                setProductUrl("");
                setProductUrlInput("");
              }}
              className="flex items-center gap-1.5 text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                onClick={() => setProductUrlModalOpen(false)}
                className="h-9 px-4 rounded-[8px] text-[14px] border-[#e5e7eb] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setProductUrl(productUrlInput.trim());
                  setProductUrlModalOpen(false);
                }}
                disabled={!productUrlInput.trim()}
                className="h-9 px-4 gap-1.5 rounded-[8px] text-[14px] cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Influencer Picker Modal */}
      <Dialog open={influencerModalOpen} onOpenChange={setInfluencerModalOpen}>
        <DialogContent className="sm:max-w-[640px] p-0 gap-0 max-h-[85vh] flex flex-col rounded-[16px] border-[#e5e7eb] shadow-xl">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[8px] bg-[#eff6ff] flex items-center justify-center">
                <User className="h-4 w-4 text-[#3b82f6]" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                Choose Influencer
              </h2>
            </div>
            <p className="text-[14px] text-[#6b7280] mt-2 leading-relaxed">
              Select a base influencer image or upload your own.
            </p>
          </div>

          <div className="flex-1 overflow-auto px-6 pb-4 space-y-3">
            {/* Upload drop zone — full width */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "h-[100px] rounded-[12px] border-2 border-dashed flex items-center justify-center gap-3 transition-all cursor-pointer",
                isDragging
                  ? "border-[#3b82f6] bg-[#eff6ff]"
                  : "border-[#d1d5db] hover:border-[#3b82f6] hover:bg-[#eff6ff]"
              )}
            >
              {uploadedPreview ? (
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-[8px] overflow-hidden border border-[#e5e7eb]">
                    <Image
                      src={uploadedPreview}
                      alt="Uploaded"
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#111827]">Image uploaded</p>
                    <p className="text-[12px] text-[#9ca3af]">Click or drag to replace</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-[#9ca3af]" />
                  <div>
                    <p className="text-[13px] font-medium text-[#6b7280]">Upload your own</p>
                    <p className="text-[12px] text-[#9ca3af]">Click to browse or drag an image here</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Preset grid */}
            <div className="grid grid-cols-5 gap-3">
              {/* Presets */}
              {PRESET_IMAGES.map((img) => (
                <button
                  key={img.id}
                  onClick={() => handleSelectPreset(img.src)}
                  className={cn(
                    "aspect-[3/4] rounded-[12px] overflow-hidden border-2 transition-all relative cursor-pointer",
                    pendingInfluencer === img.src
                      ? "border-[#3b82f6] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                      : "border-transparent hover:border-[#d1d5db]"
                  )}
                >
                  <Image
                    src={img.src}
                    alt="Influencer"
                    fill
                    className="object-cover"
                  />
                  {pendingInfluencer === img.src && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#3b82f6] flex items-center justify-center shadow-sm">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#e5e7eb] bg-[#f9fafb] rounded-b-[16px]">
            <Button
              variant="outline"
              onClick={() => setInfluencerModalOpen(false)}
              className="h-9 px-4 rounded-[8px] text-[14px] border-[#e5e7eb] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInfluencer}
              disabled={!pendingInfluencer}
              className="h-9 px-4 gap-1.5 rounded-[8px] text-[14px] cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
