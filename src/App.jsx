import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import ApiKeyBar from './components/ApiKeyBar';
import SelectionBadge from './components/SelectionBadge';
import ScriptGenerator from './pages/ScriptGenerator';
import Transcriber from './pages/Transcriber';
import WorldMonitor from './pages/WorldMonitor';
import { ApiKeyProvider } from './hooks/useApiKeyStore';
import { WPS } from './lib/prompts';

export default function App() {
  const [page, setPage] = useState('newsgen');
  const [mode, setMode] = useState('generate');
  const [sendPayload, setSendPayload] = useState(null); // text handed from Transcriber/Monitor -> Script Generator

  const sendToNewsGen = (text) => {
    setSendPayload({ text, ts: Date.now() });
    setPage('newsgen');
    setMode('generate');
  };

  useEffect(() => {
    document.title = 'TJ NewsGen · Bulletin Engine';
  }, []);

  return (
    <ApiKeyProvider>
      <div className="app-shell">
        <TopBar page={page} onNavigate={setPage} mode={mode} onModeChange={setMode} />
        <ApiKeyBar />

        <div className="workspace">
          <div className={`page ${page === 'newsgen' ? 'on' : ''}`}>
            <ScriptGenerator mode={mode} setMode={setMode} incoming={sendPayload} />
          </div>
          <div className={`page ${page === 'transcriber' ? 'on' : ''}`}>
            <Transcriber onSendToNewsGen={sendToNewsGen} />
          </div>
          <div className={`page ${page === 'monitor' ? 'on' : ''}`}>
            <WorldMonitor active={page === 'monitor'} onSendToNewsGen={sendToNewsGen} onGoNewsGen={() => setPage('newsgen')} />
          </div>
        </div>

        <footer className="footbar">
          <span>TJ NEWSGEN · REACT DESK BUILD</span>
          <span>{WPS} W/S PACE</span>
          <span className="r">SELECT TEXT → WORD COUNT</span>
        </footer>
        <SelectionBadge />
      </div>
    </ApiKeyProvider>
  );
}
