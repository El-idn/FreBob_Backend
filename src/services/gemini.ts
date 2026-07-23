/** Shared Gemini helpers for FreBob (chat, extraction, STT). YarnGPT stays on voice.ts. */

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

/**
 * Prefer GEMINI_MODEL; otherwise try current Flash models.
 * gemini-2.0-flash shut down 2026-06-01; gemini-2.5-flash 404s on some keys.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
}

function modelCandidates(): string[] {
  const preferred = getGeminiModel();
  const fallbacks = [
    preferred,
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ];
  return [...new Set(fallbacks.filter(Boolean))];
}

export function geminiGenerateContentUrl(apiKey: string, model = getGeminiModel()): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
}

type GeminiPart = { text?: string; inline_data?: { mime_type: string; data: string } };

type GeminiPayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string; code?: number };
};

/** Pull the first non-empty text part (Gemini 3.x may include thought metadata). */
export function extractGeminiText(payload: GeminiPayload): string | null {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const text = part.text?.trim();
    if (text) return text;
  }
  return null;
}

/** Strip ```json fences if the model ignored responseMimeType. */
export function parseGeminiJsonText(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenced) text = fenced[1].trim();
  return JSON.parse(text);
}

export async function geminiGenerateContent(input: {
  parts: GeminiPart[];
  temperature?: number;
  json?: boolean;
}): Promise<{ model: string; text: string; payload: GeminiPayload }> {
  const key = getGeminiApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const errors: string[] = [];

  for (const model of modelCandidates()) {
    const response = await fetch(geminiGenerateContentUrl(key, model), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: input.parts }],
        generationConfig: {
          ...(input.json === false
            ? {}
            : { responseMimeType: 'application/json' }),
          temperature: input.temperature ?? 0.2,
        },
      }),
    });

    const bodyText = await response.text();
    let payload: GeminiPayload = {};
    try {
      payload = JSON.parse(bodyText) as GeminiPayload;
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const msg =
        payload.error?.message ||
        bodyText.slice(0, 220) ||
        `HTTP ${response.status}`;
      errors.push(`${model}: ${msg}`);
      // Try next model on 404 / not found
      if (response.status === 404 || /not found|no longer available/i.test(msg)) {
        continue;
      }
      throw new Error(`Gemini ${model} HTTP ${response.status}: ${msg}`);
    }

    const text = extractGeminiText(payload);
    if (!text) {
      errors.push(
        `${model}: empty response (finish=${payload.candidates?.[0]?.finishReason ?? 'n/a'})`,
      );
      continue;
    }

    return { model, text, payload };
  }

  throw new Error(`Gemini failed for all models. ${errors.join(' | ')}`);
}

export async function geminiGenerateJson(input: {
  prompt: string;
  temperature?: number;
}): Promise<string> {
  const { text } = await geminiGenerateContent({
    parts: [{ text: input.prompt }],
    temperature: input.temperature,
    json: true,
  });
  return text;
}
