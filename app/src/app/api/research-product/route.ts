import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { NextResponse } from "next/server";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

async function searchProductImages(query: string) {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    q: `${query} product photo -site:tiktok.com -site:instagram.com -site:facebook.com`,
    engine: "google_images",
    num: "10",
  });

  console.log("[Research Product] SerpAPI image search:", query);

  const response = await fetch(`https://serpapi.com/search.json?${params}`);
  const data = await response.json();

  // Domains that serve temporary/authenticated URLs that won't work for image models
  const blockedDomains = ["tiktok.com", "instagram.com", "facebook.com", "fbcdn.net", "tiktokcdn.com"];

  const images: string[] = [];
  if (data.images_results) {
    for (const result of data.images_results) {
      if (!result.original || images.length >= 3) continue;
      const isBlocked = blockedDomains.some((d) => result.original.includes(d));
      if (isBlocked) continue;
      images.push(result.original);
    }
  }

  console.log("[Research Product] Got", images.length, "product images");
  return images;
}

export async function POST(req: Request) {
  const { productUrl, productInfo } = await req.json();

  const productRef = productUrl ?? productInfo;

  console.log("[Research Product] Starting research:", productRef);

  // Use gpt-oss-120b:online for built-in web search
  const result = await generateText({
    model: openrouter("openai/gpt-oss-120b:online"),
    messages: [
      {
        role: "system",
        content: `Research the following product and identify the single biggest problem it solves for the customer.

Answer in this exact format:
Product: [brand + product name]
Problem: [one sentence — the specific frustration or pain point this product fixes]
Solution: [one sentence — how this product specifically solves that problem, what makes it different]

Be concrete and specific. The problem should be something visually demonstrable — something you could SEE on a person.

Do not cite any sources.

Product to research: ${productRef}${productInfo && productUrl ? `\nUser's description: ${productInfo}` : ""}`,
      },
    ],
    temperature: 0.5,
  });

  const summary = result.text.trim();
  console.log("[Research Product] Summary:", summary);

  // Search for product images in parallel
  const imageQuery = productInfo ?? productUrl;
  const productImages = await searchProductImages(imageQuery);

  console.log("[Research Product] Product images:", productImages.length);

  return NextResponse.json({
    summary,
    productImages,
  });
}
