#!/usr/bin/env node
/**
 * Smoke test against a running FreBob API (memory mode).
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
const base = (process.argv[2] || 'http://localhost:4000/v1').replace(/\/$/, '');
const businessId = '00000000-0000-4000-8000-000000000001';
const headers = {
  'Content-Type': 'application/json',
  'X-Demo-Mode': '1',
};

async function req(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function main() {
  console.log('Smoke against', base);
  const health = await req('GET', '/health');
  console.log('health', {
    store: health.store,
    gemini: health.geminiConfigured,
    yarn: health.yarnGptConfigured,
  });

  await req('POST', '/demo/reset', {});

  const extracted = await req('POST', '/extract', {
    businessId,
    source: 'whatsapp',
    sampleId: 'sample_flagship',
  });
  console.log('extract', extracted.extractionId, extracted.fields.productName);

  const approved = await req('POST', `/extractions/${extracted.extractionId}/approve`, {
    businessId,
    extractionId: extracted.extractionId,
    fields: extracted.fields,
  });
  console.log('approve', approved.orderId);

  const dash = await req('GET', `/businesses/${businessId}/dashboard`);
  console.log('dashboard', dash);

  const chat = await req('POST', `/businesses/${businessId}/chat`, {
    question: 'Who still owes me?',
    language: 'en',
  });
  console.log('chat', chat.text?.slice(0, 120));

  const ttsPcm = await req('POST', '/tts', {
    businessId,
    text: 'Wetin I sell pass today?',
    language: 'pcm',
  });
  console.log('tts pcm supported=', ttsPcm.supported, ttsPcm.reason?.slice(0, 80));

  if (health.yarnGptConfigured) {
    const tts = await req('POST', '/tts', {
      businessId,
      text: chat.text?.slice(0, 400) || 'Welcome to FreBob.',
      language: 'en',
    });
    console.log('tts en supported=', tts.supported, 'bytes=', tts.audioBase64?.length ?? 0);
  } else {
    console.log('tts en skipped (YARNGPT_API_KEY not set)');
  }

  console.log('SMOKE OK');
}

main().catch((err) => {
  console.error('SMOKE FAILED', err);
  process.exit(1);
});
