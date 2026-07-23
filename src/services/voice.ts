import { z } from 'zod';
import { languageSchema } from '../schemas.js';

type LanguageCode = z.infer<typeof languageSchema>;

/** YarnGPT TTS — https://yarngpt.ai/api-docs */
const YARNGPT_TTS_URL = 'https://yarngpt.ai/api/v1/tts';

const DEFAULT_VOICE: Record<'en' | 'yo' | 'ha' | 'ig', string> = {
  en: 'Idera',
  yo: 'Idera',
  ha: 'Umar',
  ig: 'Chinenye',
};

export type TtsResult =
  | {
      supported: true;
      mimeType: 'audio/mpeg';
      audioBase64: string;
      voice: string;
    }
  | {
      supported: false;
      reason: string;
      audioBase64: null;
    };

export async function synthesizeSpeech(input: {
  text: string;
  language: LanguageCode;
  voice?: string;
}): Promise<TtsResult> {
  if (input.language === 'pcm') {
    return {
      supported: false,
      reason:
        'Pidgin voice is not validated for YarnGPT yet. FreBob keeps Pidgin as text-only (PRD).',
      audioBase64: null,
    };
  }

  const key = process.env.YARNGPT_API_KEY;
  if (!key) {
    return {
      supported: false,
      reason: 'YARNGPT_API_KEY is not configured on the server.',
      audioBase64: null,
    };
  }

  const text = input.text.trim().slice(0, 2000);
  if (!text) {
    return { supported: false, reason: 'Empty text', audioBase64: null };
  }

  const voice = input.voice || DEFAULT_VOICE[input.language] || 'Idera';

  let response: Response;
  try {
    response = await fetch(YARNGPT_TTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        response_format: 'mp3',
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return {
      supported: false,
      reason: `YarnGPT voice is unreachable right now (${detail}). Try again shortly.`,
      audioBase64: null,
    };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const snippet = errText.replace(/\s+/g, ' ').trim().slice(0, 160);
    return {
      supported: false,
      reason:
        response.status >= 500
          ? `YarnGPT is temporarily unavailable (HTTP ${response.status}). Voice will work again when their service recovers.`
          : `YarnGPT voice failed (HTTP ${response.status})${snippet ? `: ${snippet}` : ''}.`,
      audioBase64: null,
    };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    return {
      supported: false,
      reason: 'YarnGPT returned empty audio. Try a shorter reply.',
      audioBase64: null,
    };
  }

  return {
    supported: true,
    mimeType: 'audio/mpeg',
    audioBase64: buffer.toString('base64'),
    voice,
  };
}

export function yarnGptConfigured(): boolean {
  return Boolean(process.env.YARNGPT_API_KEY);
}
