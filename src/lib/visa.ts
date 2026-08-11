"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VisaCheckResult } from "./types";

export async function checkVisaWithAI(input: {
  nationalities: string[];
  destination: string;
}): Promise<VisaCheckResult> {
  const key = process.env.GEMINI_API_KEY;
  const base: VisaCheckResult = {
    destination: input.destination,
    nationalities: input.nationalities,
    summary: "",
    likely_required: false,
    caveats: [
      "Guidance only — verify with the destination’s official immigration site before travel.",
    ],
    checked_at: new Date().toISOString(),
  };

  if (!key) {
    return {
      ...base,
      summary:
        "Gemini API key not configured. Manually verify visa rules for your passports and destination.",
      likely_required: true,
      caveats: [
        ...base.caveats,
        "Set GEMINI_API_KEY to enable AI visa checks.",
      ],
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `You are a travel documentation assistant. Given passport nationalities ${JSON.stringify(input.nationalities)} and destination country/city "${input.destination}", assess whether a visa is typically required for short tourist stays.
Respond ONLY with JSON: {"likely_required":boolean,"summary":string,"caveats":string[]}
Be conservative if unsure. Do not invent official forms.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      ...base,
      summary: text.slice(0, 400) || "Could not parse visa advice.",
      likely_required: true,
    };
  }
  try {
    const parsed = JSON.parse(match[0]) as {
      likely_required?: boolean;
      summary?: string;
      caveats?: string[];
    };
    return {
      ...base,
      likely_required: Boolean(parsed.likely_required),
      summary: parsed.summary || "See official sources.",
      caveats: [
        ...(parsed.caveats || []),
        "Guidance only — verify with official sources.",
      ],
    };
  } catch {
    return {
      ...base,
      summary: text.slice(0, 400),
      likely_required: true,
    };
  }
}
