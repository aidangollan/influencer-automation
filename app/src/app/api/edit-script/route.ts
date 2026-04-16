import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const EDIT_SYSTEM_PROMPT = `You are a UGC script editor. The user will give you their current script and an edit request. Apply the edit and return the full updated script along with a brief explanation of what you changed.

RULES:
- The user may reference lines by number ("@line 2") or by quoting text.
- Apply the requested change precisely — don't rewrite lines that weren't mentioned.
- If the user asks for a full rewrite, rewrite everything but keep the same number of lines unless they say otherwise.
- Keep the same style rules: brevity, no filler, casual tone, product name revealed late, CTA as last line.

OUTPUT FORMAT — you must follow this exactly:
First, output each script line on its own line (no numbering, no labels).
Then output a blank line.
Then output a single line starting with "EXPLANATION:" followed by a brief, conversational summary of what you changed and why (1-2 sentences max). Be specific about which lines changed.`;

export async function POST(req: Request) {
  const { scriptLines, message } = await req.json();

  const numberedScript = scriptLines
    .map((line: string, i: number) => `${i + 1}. ${line}`)
    .join("\n");

  const userPrompt = `Current script:\n${numberedScript}\n\nEdit request: ${message}`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: EDIT_SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  const rawLines = result.text.split("\n").map((line) => line.trim());

  // Split into script lines and explanation
  const explanationIndex = rawLines.findIndex((l) =>
    l.startsWith("EXPLANATION:")
  );

  let lines: string[];
  let explanation: string;

  if (explanationIndex !== -1) {
    lines = rawLines
      .slice(0, explanationIndex)
      .map((line) => line.replace(/^\d+\.\s*/, ""))
      .filter((line) => line.length > 0);
    explanation = rawLines[explanationIndex].replace("EXPLANATION:", "").trim();
  } else {
    lines = rawLines
      .map((line) => line.replace(/^\d+\.\s*/, ""))
      .filter((line) => line.length > 0);
    explanation = "Script updated.";
  }

  return NextResponse.json({ lines, explanation });
}
