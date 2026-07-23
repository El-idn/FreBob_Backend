/** Shared Gemini model + endpoint helpers for FreBob server. */

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

/**
 * gemini-2.0-flash shut down 2026-06-01.
 * Override with GEMINI_MODEL on Render if needed.
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

export function geminiGenerateContentUrl(apiKey: string): string {
  const model = encodeURIComponent(getGeminiModel());
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export async function geminiGenerateJson(input: {
  prompt: string;
  temperature?: number;
}): Promise<string> {
  const key = getGeminiApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not configured');

  const response = await fetch(geminiGenerateContentUrl(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: input.prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: input.temperature ?? 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Gemini ${getGeminiModel()} HTTP ${response.status}: ${errBody.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}
