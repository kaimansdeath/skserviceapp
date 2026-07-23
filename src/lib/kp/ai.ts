import type { AiBlock } from "./extract";

/** Структуровані дані КП, які повертає ШІ */
export type KpAiResult = {
  fullName: string;
  controlType: "CNC" | "DRO" | "CONVENTIONAL";
  about: string[];
  specs: Array<{ param: string; unit: string; value: string }>;
  equipment: string[];
  options: string[];
  extraModels: Array<{ name: string; priceNote: string }>;
  warnings: string[];
};

export async function generateKpContent(params: {
  systemPrompt: string;
  machineName: string;
  blocks: AiBlock[];
}): Promise<KpAiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  if (params.blocks.length === 0) throw new Error("NO_INPUT");

  const userIntro =
    `Назва верстата від користувача: «${params.machineName}».\n` +
    `Нижче — вхідні матеріали (ТХ виробника, фото). Витягни дані та поверни JSON за форматом із системної інструкції.`;

  const content: Array<Record<string, unknown>> = [{ type: "text", text: userIntro }, ...params.blocks];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_KP_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 8000,
      system: params.systemPrompt,
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(240000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI_HTTP_${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();

  const parsed = parseJson(text);
  return normalize(parsed, params.machineName);
}

function parseJson(text: string): Record<string, unknown> {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    // спроба вирізати перший {...} блок
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error("AI_BAD_JSON");
  }
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim()) : [];
}

function normalize(raw: Record<string, unknown>, fallbackName: string): KpAiResult {
  const specsRaw = Array.isArray(raw.specs) ? raw.specs : [];
  const specs = specsRaw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        param: String(o.param ?? "").trim(),
        unit: String(o.unit ?? "").trim(),
        value: String(o.value ?? "").trim(),
      };
    })
    .filter((s) => s.param);

  const extraRaw = Array.isArray(raw.extraModels) ? raw.extraModels : [];
  const extraModels = extraRaw
    .map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return { name: String(o.name ?? "").trim(), priceNote: String(o.priceNote ?? "").trim() };
    })
    .filter((m) => m.name);

  const ct = String(raw.controlType ?? "").toUpperCase();
  return {
    fullName: String(raw.fullName ?? "").trim() || fallbackName.toUpperCase(),
    controlType: ct === "CNC" || ct === "DRO" ? (ct as "CNC" | "DRO") : "CONVENTIONAL",
    about: strArr(raw.about),
    specs,
    equipment: strArr(raw.equipment),
    options: strArr(raw.options),
    extraModels,
    warnings: strArr(raw.warnings),
  };
}
