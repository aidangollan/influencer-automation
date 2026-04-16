import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_API_KEY! });

const INSTAGRAM_RAPIDAPI_HOST = "instagram-public-bulk-scraper.p.rapidapi.com";
const INSTAGRAM_RAPIDAPI_BASE = `https://${INSTAGRAM_RAPIDAPI_HOST}`;

async function getInstagramVideoDownloadUrl(postUrl: string) {
  const apiKey = process.env.RAPID_API_KEY;
  if (!apiKey) {
    throw new Error("RAPID_API_KEY is not configured");
  }

  const url = `${INSTAGRAM_RAPIDAPI_BASE}/v1/media_info?code_or_id_or_url=${encodeURIComponent(postUrl)}`;
  console.log("[Extract Reel] Instagram RapidAPI request:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": INSTAGRAM_RAPIDAPI_HOST,
    },
  });

  const text = await response.text();
  console.log("[Extract Reel] RapidAPI response status:", response.status);
  console.log("[Extract Reel] RapidAPI response body:", text.slice(0, 2000));

  const parsed = JSON.parse(text) as { data: { video_url?: string } };

  if (!parsed.data?.video_url) {
    throw new Error("No video URL found in Instagram response");
  }

  return parsed.data.video_url;
}

interface WhisperResult {
  text: string;
  chunks?: Array<{ timestamp: [number, number]; text: string }>;
}

async function transcribeVideo(videoUrl: string) {
  console.log("[Extract Reel] Transcribing with Whisper...");

  const result = await fal.subscribe("fal-ai/whisper", {
    input: {
      audio_url: videoUrl,
      task: "transcribe",
      chunk_level: "segment",
    },
  });

  const data = result.data as WhisperResult;
  console.log("[Extract Reel] Transcription complete:", data.text?.substring(0, 200));

  return data.text ?? "";
}

export async function POST(req: Request) {
  const { reelUrl } = await req.json();

  console.log("[Extract Reel] Starting extraction for:", reelUrl);

  // Step 1: Get download URL from Instagram
  const downloadUrl = await getInstagramVideoDownloadUrl(reelUrl);
  console.log("[Extract Reel] Got download URL:", downloadUrl.substring(0, 100));

  // Step 2: Transcribe the video
  const transcript = await transcribeVideo(downloadUrl);

  console.log("[Extract Reel] Final transcript:", transcript);

  return NextResponse.json({ transcript });
}
