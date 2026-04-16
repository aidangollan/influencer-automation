import { fal, ApiError } from "@fal-ai/client";
import { NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_API_KEY! });

interface FalImageOutput {
  images: { url: string }[];
}

interface FalVideoOutput {
  video: { url: string };
}

const KLING_MODEL = "fal-ai/kling-video/v3/pro/image-to-video";

export async function POST(req: Request) {
  const { jobId, model, phase, videoPrompt, clipDuration, firstFrameUrl } =
    await req.json();

  try {
    const status = await fal.queue.status(model, { requestId: jobId });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(model, { requestId: jobId });

      if (phase === "image") {
        const data = result.data as FalImageOutput;
        const imageUrl = data.images[0].url;

        console.log("[Scene Status] Image complete:", imageUrl);
        console.log("[Scene Status] Submitting Kling video gen with audio enabled");

        const klingDuration = String(clipDuration ?? 5);

        const videoResult = await fal.queue.submit(KLING_MODEL, {
          input: {
            prompt: videoPrompt,
            start_image_url: imageUrl,
            duration: klingDuration,
            generate_audio: true,
          } as never,
        });

        return NextResponse.json({
          status: "generating_video",
          firstFrameUrl: imageUrl,
          videoJobId: videoResult.request_id,
          videoModel: KLING_MODEL,
        });
      }

      if (phase === "video") {
        const data = result.data as FalVideoOutput;
        console.log("[Scene Status] Video complete:", data.video.url);
        return NextResponse.json({
          status: "complete",
          videoUrl: data.video.url,
          firstFrameUrl,
        });
      }
    }

    if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
      return NextResponse.json({ status: "pending" });
    }

    console.log("[Scene Status] Unexpected status:", status.status);
    return NextResponse.json({ status: "failed", error: `Unexpected status: ${status.status}` });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("[Scene Status] fal.ai API error:", error.status, JSON.stringify(error.body));
      return NextResponse.json({ status: "failed", error: String(error.message) });
    }
    console.error("[Scene Status] Error:", error);
    return NextResponse.json({ status: "failed", error: String(error) });
  }
}
