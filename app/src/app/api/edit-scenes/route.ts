import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const EDIT_SCENES_PROMPT = `You are a UGC video scene editor. The user has a set of generated video scenes and wants to make changes. Your job is to apply the requested edit and figure out which scenes are affected.

IMPORTANT — DEPENDENCIES:
Scenes can depend on previous scenes via imageSource: "previous". If a scene's image changes, ALL subsequent scenes that use imageSource: "previous" must also be regenerated because their input image changed. Trace the dependency chain and mark all affected scenes.

For each affected scene, output the updated scene plan. For unaffected scenes, do not include them.

The image model takes a reference photo and a short edit instruction ("Make her..." style).
The video model makes the influencer speak dialogue. Format: Make her say "[dialogue]"

You MUST respond with a JSON object:
{"affectedScenes": [{"index": N, "imagePrompt": "...", "imageSource": "original" | "previous" | "skip", "showProduct": true/false, "videoPrompt": "..."}, ...]}

Only include scenes that need to change. The index is 0-based.
No other text outside the JSON.`;

export async function POST(req: Request) {
  const { scenePlans, scriptLines, editRequest, productSummary } = await req.json();

  const sceneSummary = (scenePlans as Array<{ imagePrompt: string; imageSource: string; showProduct: boolean; videoPrompt: string }>)
    .map((s, i) => `Scene ${i + 1} (imageSource: ${s.imageSource}): imagePrompt="${s.imagePrompt}" videoPrompt="${s.videoPrompt}" showProduct=${s.showProduct}`)
    .join("\n");

  const userPrompt = `Product info: ${productSummary ?? ""}\n\nScript lines:\n${(scriptLines as string[]).map((l, i) => `${i + 1}. ${l}`).join("\n")}\n\nCurrent scene plans:\n${sceneSummary}\n\nEdit request: ${editRequest}\n\nApply the edit. Return only the affected scenes with updated plans.`;

  console.log("=== EDIT SCENES ===");
  console.log("USER:", userPrompt);

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: EDIT_SCENES_PROMPT,
    prompt: userPrompt,
  });

  console.log("RESPONSE:", result.text);

  const jsonText = result.text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonText) as {
    affectedScenes: Array<{
      index: number;
      imagePrompt: string;
      imageSource: "original" | "previous" | "skip";
      showProduct: boolean;
      videoPrompt: string;
    }>;
  };

  console.log("AFFECTED:", parsed.affectedScenes.map((s) => s.index));
  console.log("========================");

  return NextResponse.json(parsed);
}
