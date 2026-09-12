import { useState, useEffect } from 'react';
import { PROVIDER_HINTS, PROVIDER_PLACEHOLDERS } from '../lib/llmProviders';
import { useApiKeyStore } from '../hooks/useApiKeyStore';

export default function ApiKeyBar() {
  const { provider, key, save, valid } = useApiKeyStore();
  const [localProvider, setLocalProvider] = useState(provider);
  const [localKey, setLocalKey] = useState(key);

  useEffect(() => {
    setLocalProvider(provider);
    setLocalKey(key);
  }, [provider, key]);

  const dirty = localProvider !== provider || localKey !== key;

  return (
    <div className="apikey-bar">
      <label>PROVIDER</label>
      <select value={localProvider} onChange={(e) => setLocalProvider(e.target.value)}>
        <option value="claude">Claude (Anthropic)</option>
        <option value="gemini">Gemini (Google) — free tier</option>
        <option value="openai">ChatGPT (OpenAI)</option>
        <option value="groq">Groq — very fast + free tier</option>
      </select>
      <input
        type="password"
        value={localKey}
        onChange={(e) => setLocalKey(e.target.value)}
        placeholder={PROVIDER_PLACEHOLDERS[localProvider] || 'API key...'}
      />
      <button className="save-btn" onClick={() => save(localKey, localProvider)}>
        {dirty ? 'Save' : 'Saved'}
      </button>
      <span className="hint">{PROVIDER_HINTS[localProvider]}</span>
      <div className={`status-pill ${valid ? 'ok' : 'err'}`}>
        <span className="led" />
        <span>{valid ? provider.toUpperCase() + ' READY' : key ? 'KEY INVALID?' : 'KEY NEEDED'}</span>
      </div>
    </div>
  );
}
