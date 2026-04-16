import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const WORDS_PER_SECOND = 3.5;

function computeTiming(dialogue: string) {
  const wordCount = dialogue.split(/\s+/).filter(Boolean).length;
  const speechDuration = Math.ceil(wordCount / WORDS_PER_SECOND);
  const clipDuration = speechDuration <= 5 ? 5 : 10;
  const silencePadding = clipDuration - speechDuration;
  return { speechDuration, clipDuration: clipDuration as 5 | 10, silencePadding };
}

const SCENE_DIRECTOR_PROMPT = `You are directing a UGC video. You have a finalized script and a product description. Your job is to read each script line and decide: what should the viewer SEE while hearing this?

HOW IT WORKS:

You have two models:
1. An image model that takes a reference photo of the influencer and a short edit instruction ("Make her..."). It modifies the photo — changing appearance, adding a product to her hand, etc. The output becomes the first frame of the video clip.
2. A video model that takes that first frame and makes her speak a line of dialogue. It only needs to know what she says — the image already sets the visual scene.

SCENE TYPES — pick one per scene:

Each scene must be ONE of these distinct visual types. Never use the same type for two consecutive scenes.

1. PROBLEM — The influencer's appearance visually shows the problem the product solves. No product visible. imageSource: "original", showProduct: false.

2. SHOW PRODUCT — The influencer is holding or showing the product. The problem is still visible on her appearance. imageSource: "previous" (to keep the problem visible), showProduct: true.

3. USE PRODUCT — The influencer is applying or using the product. Her appearance is starting to improve. imageSource: "previous", showProduct: true.

4. RESULT — The transformation is complete. The influencer looks great — the product's promise is now visible on her. No product in hand. imageSource: "previous", showProduct: false.

5. CTA — Simple talking to camera. No image edit needed. imageSource: "skip", showProduct: false.

RULES:
- Never repeat the same scene type consecutively.
- Only include the product (showProduct: true) when there's a reason — she's holding it or using it. Don't keep it in frame for every scene.
- Each scene should look visually distinct from the one before it.
- If showProduct is true, imagePrompt MUST describe how she's interacting with the product (e.g. "Make her holding the product"). Never leave imagePrompt empty when showProduct is true — the image model needs the instruction to put the product in the frame.

FIELDS:

- imagePrompt: the edit instruction for the image model. Short, direct, "Make her..." style. Only describe what to CHANGE. Leave empty for "skip" scenes.
- imageSource: "original", "previous", or "skip"
- showProduct: true only for SHOW PRODUCT and USE PRODUCT scene types.
- videoPrompt: what the video model should make her say. Format: Make her say "[exact dialogue]". Nothing else — no movement or expression direction. Do NOT add silence padding — that will be calculated automatically.

You MUST respond with a JSON object:
{"scenes": [{"imagePrompt": "...", "imageSource": "original" | "previous" | "skip", "showProduct": true/false, "videoPrompt": "..."}, ...]}

One scene per script line, in order. No other text outside the JSON.`;

export async function POST(req: Request) {
  const { scriptLines, productSummary, productInfo } = await req.json();

  const userPrompt = `Product info:\n${productSummary ?? productInfo}\n\nScript lines:\n${scriptLines.map((l: string, i: number) => `${i + 1}. ${l}`).join("\n")}\n\nFor each line, decide what the viewer should see.`;

  console.log("=== SCENE DIRECTION ===");
  console.log("USER:", userPrompt);

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: SCENE_DIRECTOR_PROMPT,
    prompt: userPrompt,
  });

  console.log("RESPONSE:", result.text);

  const jsonText = result.text.replace(/```json\n?|\n?```/g, "").trim();
  const { scenes: rawScenes } = JSON.parse(jsonText) as {
    scenes: Array<{
      imagePrompt: string;
      imageSource: "original" | "previous" | "skip";
      showProduct: boolean;
      videoPrompt: string;
    }>;
  };

  // Compute timing and append silence padding to each scene's videoPrompt
  const scenes = rawScenes.map((scene, i) => {
    const dialogue = (scriptLines as string[])[i] ?? "";
    const { speechDuration, clipDuration, silencePadding } = computeTiming(dialogue);

    let videoPrompt = scene.videoPrompt;
    if (silencePadding > 0) {
      videoPrompt += ` Leave ${silencePadding} seconds of silence at the end.`;
    }

    console.log(`[Scene ${i + 1}] words=${dialogue.split(/\s+/).length}, speech=${speechDuration}s, clip=${clipDuration}s, silence=${silencePadding}s`);

    return {
      ...scene,
      videoPrompt,
      clipDuration,
      estimatedDuration: speechDuration,
    };
  });

  console.log("PARSED SCENES:", scenes);
  console.log("========================");

  return NextResponse.json({ scenePlans: scenes });
}
