import { z } from 'zod';
import { languageSchema } from '../schemas.js';
import { geminiGenerateContent, getGeminiApiKey, parseGeminiJsonText } from './gemini.js';

type LanguageCode = z.infer<typeof languageSchema>;

const LANGS = new Set<LanguageCode>(['en', 'pcm', 'yo', 'ha', 'ig']);

export type SttResult = {
  originalText: string;
  englishText: string;
  language: LanguageCode;
};

export class SttError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SttError';
  }
}

function normalizeLang(value: unknown, fallback: LanguageCode): LanguageCode {
  const code = String(value ?? '').trim().toLowerCase();
  if (LANGS.has(code as LanguageCode)) return code as LanguageCode;
  return fallback;
}

/**
 * Transcribe a short voice note with Gemini, detect approved language,
 * and return an English translation for the chat bubble.
 */
export async function transcribeVoiceNote(input: {
  audioBase64: string;
  mimeType?: string;
  languageHint?: LanguageCode;
}): Promise<SttResult> {
  const key = getGeminiApiKey();
  if (!key) {
    throw new SttError('Gemini is not configured on the FreBob server.');
  }

  const raw = input.audioBase64.includes(',')
    ? input.audioBase64.split(',').pop()!
    : input.audioBase64;
  const data = raw.replace(/\s/g, '');
  if (data.length < 80) {
    throw new SttError('Audio is empty or too short. Record again.');
  }
  // ~15MB base64 ceiling
  if (data.length > 20_000_000) {
    throw new SttError('Audio is too large. Keep the voice note under ~30 seconds.');
  }

  const hint = input.languageHint ?? 'en';
  const mimeType = input.mimeType || 'audio/mp4';
  const langNames =
    'en=English, pcm=Nigerian Pidgin, yo=Yoruba, ha=Hausa, ig=Igbo';

  const prompt = `You are FreBob speech transcription for Nigerian SME merchants.
Listen to the audio. The speaker may use English, Nigerian Pidgin, Yoruba, Hausa, or Igbo.
Language hint from the app (may be wrong): ${hint}.

Return ONLY JSON:
{
  "originalText": string,   // exact transcript in the spoken language
  "englishText": string,    // clear English translation (same as originalText if already English)
  "language": "en"|"pcm"|"yo"|"ha"|"ig"
}

Rules:
- language must be one of: ${langNames}
- If speech is unclear, set originalText/englishText to empty strings
- Do not invent business facts; only transcribe what was said
- Prefer the spoken language over the hint when they disagree`;

  const { text } = await geminiGenerateContent({
    parts: [
      { text: prompt },
      {
        inline_data: {
          mime_type: mimeType,
          data,
        },
      },
    ],
    temperature: 0.1,
    json: true,
  });

  let parsed: { originalText?: string; englishText?: string; language?: string };
  try {
    parsed = parseGeminiJsonText(text) as typeof parsed;
  } catch {
    throw new SttError('Could not parse speech result. Please try again.');
  }

  const originalText = String(parsed.originalText ?? '').trim();
  const englishText = String(parsed.englishText ?? '').trim() || originalText;
  if (!originalText && !englishText) {
    throw new SttError('No speech detected. Please record again.');
  }

  return {
    originalText: originalText || englishText,
    englishText: englishText || originalText,
    language: normalizeLang(parsed.language, hint),
  };
}
