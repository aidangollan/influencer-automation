import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

fal.config({ credentials: process.env.FAL_API_KEY! });

const uploadCache = new Map<string, string>();

async function resolveImageUrl(imageRef: string): Promise<string> {
  if (imageRef.startsWith("http://") || imageRef.startsWith("https://")) {
    return imageRef;
  }

  if (uploadCache.has(imageRef)) {
    return uploadCache.get(imageRef)!;
  }

  const filePath = join(process.cwd(), "public", imageRef);
  console.log("[Generate Scene] Uploading local file to fal:", filePath);

  const fileBuffer = await readFile(filePath);
  const file = new File([fileBuffer], imageRef.split("/").pop() ?? "image.jpg", {
    type: "image/jpeg",
  });

  const url = await fal.storage.upload(file);
  console.log("[Generate Scene] Uploaded to fal:", url);

  uploadCache.set(imageRef, url);
  return url;
}

const KLING_MODEL = "fal-ai/kling-video/v3/pro/image-to-video";
const IMAGE_MODEL = "fal-ai/nano-banana-2/edit";

export async function POST(req: Request) {
  const {
    imageSource,
    imagePrompt,
    showProduct,
    influencerImage,
    productImage,
    videoPrompt,
    clipDuration,
  } = await req.json();

  const resolvedInfluencerImage = await resolveImageUrl(influencerImage);
  const klingDuration = String(clipDuration ?? 5) as "5" | "10";

  // "skip" — no image gen, submit directly to Kling with the input image
  if (imageSource === "skip") {
    console.log("[Generate Scene] Skipping image gen, submitting directly to Kling");
    console.log("[Generate Scene] Video prompt:", videoPrompt);
    console.log("[Generate Scene] Start image:", resolvedInfluencerImage);

    const videoResult = await fal.queue.submit(KLING_MODEL, {
      input: {
        prompt: videoPrompt,
        start_image_url: resolvedInfluencerImage,
        duration: klingDuration,
        generate_audio: true,
      } as never,
    });

    return NextResponse.json({
      videoJobId: videoResult.request_id,
      videoModel: KLING_MODEL,
    });
  }

  // "original" or "previous" — generate first frame with nano banana 2 edit
  const imageUrls = [resolvedInfluencerImage];

  if (showProduct && productImage) {
    const resolvedProductImage = await resolveImageUrl(productImage);
    imageUrls.push(resolvedProductImage);
  }

  console.log("[Generate Scene] Image gen with", IMAGE_MODEL);
  console.log("[Generate Scene] Image prompt:", imagePrompt);
  console.log("[Generate Scene] Reference images:", imageUrls.length);

  const imageResult = await fal.queue.submit(IMAGE_MODEL, {
    input: {
      prompt: imagePrompt,
      image_urls: imageUrls,
      num_images: 1,
      output_format: "png",
      aspect_ratio: "9:16",
    } as never,
  });

  return NextResponse.json({
    imageJobId: imageResult.request_id,
    imageModel: IMAGE_MODEL,
    videoPrompt,
    clipDuration: klingDuration,
  });
}
