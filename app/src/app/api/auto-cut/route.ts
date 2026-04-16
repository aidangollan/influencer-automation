import { fal } from "@fal-ai/client";
import { NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_API_KEY! });

const RENDER_BASE_URL = "https://render.ugc.inc";
const RENDER_SUBMIT_URL = `${RENDER_BASE_URL}/submit-job`;
const RENDER_STATUS_URL = `${RENDER_BASE_URL}/get-status`;

interface WhisperResult {
  text: string;
  chunks?: Array<{ timestamp: [number, number]; text: string }>;
  words?: Array<{ word: string; start: number; end: number }>;
}

async function transcribeClip(videoUrl: string) {
  console.log("[Auto Cut] Transcribing clip:", videoUrl.substring(0, 80));

  const result = await fal.subscribe("fal-ai/whisper", {
    input: {
      audio_url: videoUrl,
      task: "transcribe",
      chunk_level: "word",
    },
  });

  const data = result.data as WhisperResult;

  let speechEndMs = 0;

  if (data.words && data.words.length > 0) {
    const lastWord = data.words[data.words.length - 1];
    speechEndMs = Math.round(lastWord.end * 1000);
  } else if (data.chunks && data.chunks.length > 0) {
    const lastChunk = data.chunks[data.chunks.length - 1];
    speechEndMs = Math.round(lastChunk.timestamp[1] * 1000);
  }

  // Add 300ms buffer after last word
  const cutPointMs = speechEndMs + 300;

  console.log("[Auto Cut] Speech ends at", speechEndMs, "ms, cut at", cutPointMs, "ms");
  console.log("[Auto Cut] Transcript:", data.text?.substring(0, 100));

  return cutPointMs;
}

export async function POST(req: Request) {
  const { clipUrls } = await req.json();

  console.log("[Auto Cut] Processing", clipUrls.length, "clips");

  // Step 1: Transcribe all clips in parallel to find cut points
  const cutPoints = await Promise.all(
    (clipUrls as string[]).map((url) => transcribeClip(url))
  );

  console.log("[Auto Cut] Cut points (ms):", cutPoints);

  // Step 2: Build video composition config using individual video segments
  const segments = (clipUrls as string[]).map((url: string, i: number) => ({
    id: `clip-${i}`,
    type: "video" as const,
    source: url,
    order: i,
    offset: { type: "relative" as const, value: 0 },
    duration: { type: "absolute" as const, value: cutPoints[i] },
    xOffset: 0,
    yOffset: 0,
    width: 1080,
    height: 1920,
    zIndex: 0,
    volume: 100,
    fit: "cover" as const,
  }));

  const config = {
    width: 1080,
    height: 1920,
    fps: 30,
    channels: [
      {
        id: "main-track",
        name: "Main Track",
        segments,
      },
    ],
  };

  console.log("[Auto Cut] Submitting render job with", segments.length, "segments");
  console.log("[Auto Cut] Config:", JSON.stringify(config, null, 2));

  // Step 3: Submit to Modal renderer
  const submitResponse = await fetch(RENDER_SUBMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      output_type: "video",
      video_codec: "h264",
    }),
  });

  const submitData = await submitResponse.json();

  if (!submitResponse.ok || submitData.status === "error") {
    console.error("[Auto Cut] Submit failed:", submitData);
    return NextResponse.json(
      { error: submitData.error ?? submitData.message ?? "Failed to submit render job" },
      { status: 500 }
    );
  }

  console.log("[Auto Cut] Job submitted:", submitData.job_id);

  return NextResponse.json({ jobId: submitData.job_id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const statusResponse = await fetch(RENDER_STATUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });

  const statusData = await statusResponse.json();

  console.log("[Auto Cut] Job", jobId, "full response:", JSON.stringify(statusData));

  if (statusData.status === "completed") {
    return NextResponse.json({
      status: "complete",
      videoUrl: statusData.download_url,
    });
  }

  if (statusData.status === "failed" || statusData.status === "error") {
    return NextResponse.json({
      status: "failed",
      error: statusData.error ?? statusData.message ?? "Render failed",
    });
  }

  return NextResponse.json({ status: "pending" });
}
