import { GoogleGenerativeAI } from "@google/generative-ai";

export type AssistantAction =
  | {
      type: "create_expense";
      amount: number;
      currency: string;
      description: string;
    }
  | {
      type: "add_checklist";
      text: string;
    }
  | {
      type: "add_segment";
      mode:
        | "plane"
        | "train_hs"
        | "train_regional"
        | "car"
        | "bus"
        | "ferry"
        | "other";
      from_place: string;
      to_place: string;
      depart_at?: string | null;
      arrive_at?: string | null;
    }
  | {
      type: "add_deadline";
      label: string;
      due_date: string;
    }
  | {
      type: "add_itinerary";
      day_date: string;
      title: string;
      notes?: string | null;
      maps_url?: string | null;
    };

export type AssistantPlan = {
  reply: string;
  actions: AssistantAction[];
};

export type AssistantContext = {
  tripTitle: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  memberNames: string[];
  defaultCurrency: string;
};

/** Rule-based fallback so payments work even without Gemini. */
export function parsePaymentFallback(
  message: string,
  defaultCurrency: string,
): AssistantPlan | null {
  const text = message.trim();
  // Examples:
  // paid 200 accommodation in Kyoto
  // paid €150 for hotel in Tokyo
  // I paid 50 EUR for dinner
  // paid $80 train tickets
  const patterns = [
    // 1 currency?, 2 amount, 3 currency2?, 4 desc
    /(?:paid|pay|spent|expense)\s*(?:of\s*)?([€$£]|EUR|USD|GBP)?\s*(\d+(?:[.,]\d{1,2})?)\s*([€$£]|EUR|USD|GBP)?\s*(?:for\s+)?(.+)/i,
    /(?:add(?:ed)?\s+)?(?:a\s+)?payment\s+(?:of\s+)?([€$£]|EUR|USD|GBP)?\s*(\d+(?:[.,]\d{1,2})?)\s*([€$£]|EUR|USD|GBP)?\s*(?:for\s+)?(.+)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[2]) continue;
    const amount = Number(String(m[2]).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const rawCur = (m[1] || m[3] || "").toUpperCase();
    let currency = defaultCurrency || "EUR";
    if (rawCur === "€" || rawCur === "EUR") currency = "EUR";
    else if (rawCur === "$" || rawCur === "USD") currency = "USD";
    else if (rawCur === "£" || rawCur === "GBP") currency = "GBP";
    else if (rawCur) currency = rawCur;

    let description = (m[4] || "Expense").trim();
    description = description.replace(/^(for|on)\s+/i, "").trim();
    // "accommodation in Kyoto" / "hotel for Tokyo" → nice label
    if (!description) description = "Expense";

    return {
      reply: `I'll add ${currency} ${amount.toFixed(2)} for “${description}” and split it equally among trip members.`,
      actions: [
        {
          type: "create_expense",
          amount,
          currency,
          description,
        },
      ],
    };
  }

  return null;
}

export async function planTripUpdate(
  message: string,
  ctx: AssistantContext,
): Promise<AssistantPlan> {
  const fallback = parsePaymentFallback(message, ctx.defaultCurrency);
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    if (fallback) return fallback;
    return {
      reply:
        "AI isn’t configured (missing GEMINI_API_KEY). You can still say things like: “paid 200 accommodation in Kyoto”.",
      actions: [],
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `You are Waylo's trip planning assistant. Convert the user's message into structured trip updates.
Trip: ${ctx.tripTitle}
Destinations: ${ctx.destinations.join(", ") || "none"}
Dates: ${ctx.startDate || "?"} → ${ctx.endDate || "?"}
Members: ${ctx.memberNames.join(", ") || "unknown"}
Default currency: ${ctx.defaultCurrency}

User message:
"""${message}"""

Respond ONLY with JSON (no markdown):
{
  "reply": "short confirmation of what you will do",
  "actions": [ /* zero or more actions */ ]
}

Allowed actions:
1) {"type":"create_expense","amount":number,"currency":"EUR|USD|GBP|...","description":"string"}
   - Use when user paid/spent money. Include city in description if mentioned (e.g. "Accommodation in Kyoto").
2) {"type":"add_checklist","text":"string"}
3) {"type":"add_segment","mode":"plane|train_hs|train_regional|car|bus|ferry|other","from_place":"string","to_place":"string","depart_at":null,"arrive_at":null}
4) {"type":"add_deadline","label":"string","due_date":"YYYY-MM-DD"}
5) {"type":"add_itinerary","day_date":"YYYY-MM-DD","title":"string","notes":null,"maps_url":null}

Rules:
- If unclear, return actions:[ ] and ask a clarifying question in reply.
- Prefer create_expense for "paid / spent / expense" messages.
- Default currency to ${ctx.defaultCurrency} if omitted.
- Do not invent dates unless the user gave them or they clearly match the trip window.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallback || { reply: text.slice(0, 400), actions: [] };
    }
    const parsed = JSON.parse(match[0]) as AssistantPlan;
    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      parsed.actions = [];
    }
    if (!parsed.reply) parsed.reply = "Done.";
    // If Gemini returned nothing useful but fallback matched, use fallback
    if (!parsed.actions.length && fallback) return fallback;
    return parsed;
  } catch {
    return (
      fallback || {
        reply: "I couldn’t parse that. Try: “paid 200 accommodation in Kyoto”.",
        actions: [],
      }
    );
  }
}
