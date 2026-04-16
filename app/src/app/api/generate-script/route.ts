import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

async function resolveImageForLLM(imageRef: string): Promise<string> {
  if (imageRef.startsWith("http://") || imageRef.startsWith("https://") || imageRef.startsWith("data:")) {
    return imageRef;
  }
  // Local path — read and convert to base64 data URL
  const filePath = join(process.cwd(), "public", imageRef);
  const buffer = await readFile(filePath);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const SCRIPT_PROMPT = `You are writing a short UGC-style script — content that sells a product without ever feeling like an ad. The viewer should think they're watching someone genuinely share a personal experience on tiktok or instagram, not a sponsored pitch.

TONE:
- Casual, authentic — like someone confidently sharing something they know works
- Never salesy, never scripted-sounding
- No hype words ("revolutionary," "game-changing," "incredible")
- No em dashes

LENGTH:
- COPY THE LENGTH OF THE REFERENCE VIDEO, BUT IF THERE IS NO REFERENCE VIDEO do like 120-180 words, 30-60 seconds spoken
- If the user specifies a number of lines, follow that exactly

RULES:
- THE HIGHEST PRIORITY IS THE USER INPUT.
- If there is a reference video, use it to gauge the tone, pacing, and approximate spoken length — but write original content about the product. Do not copy the reference's narrative patterns, visual concepts, or line-by-line structure.
- Use the product context to write specific, substantive claims. Vague lines waste the viewer's time.
- Do NOT use "I" framing ("I switched to", "I started using", "I get asked about"). Make direct statements about the product instead. Exception: the CTA line can use "I".
- Do NOT name the product until the second-to-last or last line. Build curiosity first by talking about the problem and solution generically.
- The LAST line MUST be a separate CTA — an engagement hook like 'Comment "X" and I'll send you my routine' or 'I put the link in my bio for you'. Always its own line, never crammed into another.
- Each line should be one complete thought, roughly equal in length. No single line dominating.
- Cut filler — if you can remove a word without changing the meaning, remove it. Every word earns its place.
- When referring to the product before naming it, use a generic noun — never just "this" or "it" without an antecedent.

You MUST respond with a JSON object: {"lines": ["line 1", "line 2", ...]}
Each element is exactly one script line. No other text outside the JSON.`;

export async function POST(req: Request) {
  const { productInfo, productSummary, reelTranscript, influencerImage } = await req.json();

  let textPrompt = "";

  if (reelTranscript) {
    textPrompt += `# REFERENCE VIDEO TRANSCRIPTION\n\nStudy the sales pitch style, tone, pacing, and structure of this video. Use it as inspiration for your script.\n\n${reelTranscript}\n\n`;
  }

  if (productSummary) {
    textPrompt += `# CONTEXT\n\n${productSummary}\n\n`;
  }

  if (productInfo) {
    textPrompt += `# USER'S VIDEO IDEA / DESCRIPTION (VERY IMPORTANT):\n${productInfo}\n\n`;
  }

  textPrompt += "# Output:\nCreate a new script following the guidelines above. Output ONLY the JSON object, nothing else.";

  console.log("=== SCRIPT GENERATION ===");
  console.log("USER:", textPrompt);
  console.log("IMAGE:", influencerImage ? "provided" : "none");

  // Build multimodal message if we have an influencer image
  const content: Array<{ type: string; text?: string; image?: string }> = [];

  if (influencerImage) {
    const resolvedImage = await resolveImageForLLM(influencerImage);
    content.push({ type: "image", image: resolvedImage });
    content.push({ type: "text", text: "This is the person who will be in the video. Take into account who is in the scene when writing the script.\n\n" + textPrompt });
  } else {
    content.push({ type: "text", text: textPrompt });
  }

  const scriptResult = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: SCRIPT_PROMPT,
    messages: [{ role: "user", content: content as never }],
  });

  console.log("RESPONSE:", scriptResult.text);

  const scriptJson = scriptResult.text.replace(/```json\n?|\n?```/g, "").trim();
  const { lines } = JSON.parse(scriptJson) as { lines: string[] };

  console.log("PARSED LINES:", lines);
  console.log("========================");

  return NextResponse.json({ lines });
}
