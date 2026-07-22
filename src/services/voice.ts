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

  const response = await fetch(YARNGPT_TTS_URL, {
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

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`YarnGPT HTTP ${response.status}: ${errText.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
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
