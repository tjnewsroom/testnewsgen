import { createContext, useContext, useState, useMemo } from 'react';
import { isKeyLikelyValid } from '../lib/llmProviders';

const ApiKeyContext = createContext(null);

export function ApiKeyProvider({ children }) {
  const [provider, setProvider] = useState(() => {
    try { return localStorage.getItem('tj_provider') || 'groq'; } catch { return 'groq'; }
  });
  const [key, setKey] = useState(() => {
    try { return localStorage.getItem('tj_key') || ''; } catch { return ''; }
  });

  const save = (nextKey = key, nextProvider = provider) => {
    setKey(nextKey);
    setProvider(nextProvider);
    try {
      localStorage.setItem('tj_key', nextKey);
      localStorage.setItem('tj_provider', nextProvider);
    } catch {
      /* ignore */
    }
  };

  const valid = useMemo(() => isKeyLikelyValid(provider, key), [provider, key]);

  const value = { provider, setProvider, key, setKey, save, valid };
  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}

export function useApiKeyStore() {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKeyStore must be used within ApiKeyProvider');
  return ctx;
}
