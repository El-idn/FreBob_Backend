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

  // Smart quotes / odd apostrophes often break Gemini "JSON"
  text = text
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'");

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const sliced = text.slice(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        const loose = extractLooseJsonObject(sliced);
        if (loose) return loose;
      }
    }
    const looseWhole = extractLooseJsonObject(text);
    if (looseWhole) return looseWhole;
    throw new SyntaxError('Unable to parse Gemini JSON');
  }
}

/** Recover answer/evidence when Gemini emits invalid JSON (unescaped quotes, etc.). */
function extractLooseJsonObject(text: string): Record<string, string> | null {
  const answer = extractLooseStringField(text, 'answer');
  if (!answer) return null;
  return {
    answer,
    evidence: extractLooseStringField(text, 'evidence') ?? 'Merchant FreBob data',
  };
}

function extractLooseStringField(text: string, field: string): string | undefined {
  // Prefer span from "field": " … " before the next top-level key (handles unescaped quotes in answer)
  if (field === 'answer') {
    const answerMatch = text.match(/"answer"\s*:\s*"/);
    if (answerMatch && answerMatch.index != null) {
      const valueStart = answerMatch.index + answerMatch[0].length;
      const evidenceMatch = text.slice(valueStart).search(/"evidence"\s*:/);
      if (evidenceMatch >= 0) {
        const between = text.slice(valueStart, valueStart + evidenceMatch);
        const closed = between.match(/"\s*,\s*$/);
        const value = closed
          ? between.slice(0, between.length - closed[0].length)
          : between.replace(/"\s*,\s*$/, '').replace(/,\s*$/, '');
        if (value.trim()) {
          return value
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
      }
    }
  }

  const strict = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const strictMatch = text.match(strict);
  if (strictMatch) {
    try {
      return JSON.parse(`"${strictMatch[1]}"`) as string;
    } catch {
      return strictMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  const key = `"${field}"`;
  const keyIdx = text.indexOf(key);
  if (keyIdx < 0) return undefined;
  const afterKey = text.slice(keyIdx + key.length);
  const colon = afterKey.match(/^\s*:\s*"/);
  if (!colon) return undefined;
  let rest = afterKey.slice(colon[0].length);

  const boundary = rest.search(/"\s*}\s*$|"\s*,\s*"/);
  if (boundary >= 0) {
    return rest
      .slice(0, boundary)
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  return rest
    .replace(/"\s*}?\s*$/, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
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
