// Multi-provider LLM client — ported from the original single-file app.
// Supports Claude (Anthropic), Gemini, OpenAI and Groq with a shared
// JSON-mode contract: system prompt + user message (string, or content
// blocks for image input) -> parsed JSON object.

export const PROVIDER_HINTS = {
  claude: 'console.anthropic.com → API Keys (sk-ant-...)',
  gemini: 'aistudio.google.com → Get API Key (AIza...)',
  openai: 'platform.openai.com → API Keys (sk-...)',
  groq: 'console.groq.com → API Keys (gsk_...)',
};

export const PROVIDER_PLACEHOLDERS = {
  claude: 'sk-ant-api03-...',
  gemini: 'AIza...',
  openai: 'sk-...',
  groq: 'gsk_...',
};

export const PROVIDER_CONSOLE_URLS = {
  claude: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
  groq: 'https://console.groq.com/keys',
};

export const PROVIDER_MODELS = {
  claude: 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  groq: 'openai/gpt-oss-120b',
};

export function isKeyLikelyValid(provider, key) {
  if (!key) return false;
  if (provider === 'claude') return key.startsWith('sk-ant');
  if (provider === 'gemini') return key.startsWith('AIza');
  if (provider === 'openai') return key.startsWith('sk-');
  if (provider === 'groq') return key.startsWith('gsk_');
  return key.length > 10;
}

/** Parse a JSON object out of a possibly fenced / slightly malformed LLM response. */
export function parseJson(text) {
  let c = text.replace(/```json|```/g, '').trim();
  const s = c.indexOf('{');
  const e = c.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON found in response');
  c = c.slice(s, e + 1);
  try {
    return JSON.parse(c);
  } catch {
    let f = c.replace(/,\s*([}\]])/g, '$1');
    f = f.replace(/"(?:[^"\\]|\\.)*"/gs, (m) => m.replace(/\n/g, '\\n').replace(/\t/g, '\\t'));
    return JSON.parse(f);
  }
}

function flattenUserMsg(userMsg) {
  if (Array.isArray(userMsg)) return userMsg.map((b) => (b.type === 'text' ? b.text : '[image]')).join('\n');
  if (typeof userMsg === 'string') return userMsg;
  return JSON.stringify(userMsg);
}

async function callClaudeJSON(system, userMsg, key, { useSearch = false, attempt = 1 } = {}) {
  const body = { model: PROVIDER_MODELS.claude, max_tokens: 4000, system, messages: [{ role: 'user', content: userMsg }] };
  if (useSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (data.error) {
    const raw = JSON.stringify(data.error);
    if (raw.includes('exceeded_limit') || raw.includes('rate_limit')) {
      let w = '';
      const m = raw.match(/"resets_at":"([^"]+)"/);
      if (m) {
        try {
          w = ' Reset: ' + new Date(m[1]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST.';
        } catch {
          /* ignore */
        }
      }
      throw new Error('Usage limit — கொஞ்ச நேரம் கழிச்சு try.' + w);
    }
    if (raw.includes('credit') || raw.includes('billing')) throw new Error('Credit காலி — console.anthropic.com Billing recharge.');
    throw new Error(data.error.message || 'Claude API error');
  }
  if (data.stop_reason === 'max_tokens') throw new Error('Response truncated — duration குறைச்சு try.');
  const text = (data.content || []).map((i) => (i.type === 'text' ? i.text : '')).filter(Boolean).join('\n');
  try {
    return parseJson(text);
  } catch (e) {
    if (attempt < 2) {
      const note = '\n\nIMPORTANT: ONE valid JSON only, no markdown.';
      const rm = Array.isArray(userMsg) ? userMsg.map((b) => (b.type === 'text' ? { ...b, text: b.text + note } : b)) : userMsg + note;
      return callClaudeJSON(system, rm, key, { useSearch, attempt: attempt + 1 });
    }
    throw new Error('JSON parse failed: ' + e.message);
  }
}

async function callGeminiJSON(system, userMsg, key, attempt = 1) {
  const txt = flattenUserMsg(userMsg);
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${PROVIDER_MODELS.gemini}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: system + '\n\n' + txt }] }], generationConfig: { maxOutputTokens: 4000 } }),
    }
  );
  const data = await r.json();
  if (data.error) throw new Error('Gemini: ' + (data.error.message || 'API error'));
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  try {
    return parseJson(text);
  } catch (e) {
    if (attempt < 2) return callGeminiJSON(system, userMsg + '\n\nIMPORTANT: ONE valid JSON only.', key, attempt + 1);
    throw new Error('Gemini parse failed: ' + e.message);
  }
}

async function callOpenAIJSON(system, userMsg, key, attempt = 1) {
  const txt = flattenUserMsg(userMsg);
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: PROVIDER_MODELS.openai,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: txt },
      ],
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error('OpenAI: ' + (data.error.message || 'API error'));
  const text = data.choices?.[0]?.message?.content || '';
  try {
    return parseJson(text);
  } catch (e) {
    if (attempt < 2) return callOpenAIJSON(system, userMsg + '\n\nIMPORTANT: ONE valid JSON only.', key, attempt + 1);
    throw new Error('OpenAI parse failed: ' + e.message);
  }
}

async function callGroqJSON(system, userMsg, key, attempt = 1) {
  const txt = flattenUserMsg(userMsg);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: PROVIDER_MODELS.groq,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: txt },
      ],
    }),
  });
  const data = await r.json();
  if (data.error) throw new Error('Groq: ' + (data.error.message || 'API error'));
  const text = data.choices?.[0]?.message?.content || '';
  try {
    return parseJson(text);
  } catch (e) {
    if (attempt < 2) return callGroqJSON(system, userMsg + '\n\nIMPORTANT: Respond with ONE valid JSON only, no markdown.', key, attempt + 1);
    throw new Error('Groq JSON parse failed: ' + e.message);
  }
}

/** Main entry point: dispatches to the selected provider, always returns parsed JSON. */
export async function callLLM({ provider, key, system, userMsg, useSearch = false }) {
  if (!key) throw new Error('API key இல்லை — provider select பண்ணி key paste பண்ணி Save பண்ணுங்க');
  if (provider === 'gemini') return callGeminiJSON(system, userMsg, key);
  if (provider === 'openai') return callOpenAIJSON(system, userMsg, key);
  if (provider === 'groq') return callGroqJSON(system, userMsg, key);
  return callClaudeJSON(system, userMsg, key, { useSearch });
}

/** Plain-text Claude call, used for translation in the transcriber. */
export async function callClaudeText(prompt, key) {
  if (!key) throw new Error('API key needed for translation');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: PROVIDER_MODELS.claude, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error.message || 'Translation API error');
  return (data.content || []).map((i) => (i.type === 'text' ? i.text : '')).filter(Boolean).join('\n').trim();
}
