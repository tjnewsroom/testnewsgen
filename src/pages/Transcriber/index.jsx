import { useState } from 'react';
import FilePanel from './FilePanel';
import MicPanel from './MicPanel';
import { useApiKeyStore } from '../../hooks/useApiKeyStore';
import { useTranscriber } from '../../hooks/useTranscriber';

const WHISPER_MODELS = [
  { id: 'Xenova/whisper-tiny', label: 'Tiny — fastest, lower accuracy' },
  { id: 'Xenova/whisper-base', label: 'Base — balanced (recommended)' },
  { id: 'Xenova/whisper-small', label: 'Small — slower, more accurate' },
];

const SPOKEN_LANGS = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'ta', label: 'Tamil' },
  { id: 'te', label: 'Telugu' },
  { id: 'kn', label: 'Kannada' },
  { id: 'ml', label: 'Malayalam' },
];

const OUTPUT_LANGS = [
  { id: 'same', label: 'Same as spoken (no translation)' },
  { id: 'ta-nllb', label: 'Tamil — on-device (NLLB, free, slower)' },
  { id: 'ta-claude', label: 'Tamil — via Claude API (fast, needs key)' },
  { id: 'en', label: 'English — via Claude API' },
];

export default function Transcriber({ onSendToNewsGen }) {
  const { key } = useApiKeyStore();
  const t = useTranscriber({ apiKey: key });
  const [tMode, setTMode] = useState('file');
  const [modelId, setModelId] = useState(WHISPER_MODELS[1].id);
  const [spokenLang, setSpokenLang] = useState('auto');
  const [outputLang, setOutputLang] = useState('ta-claude');

  const settings = { modelId, spokenLang, outputLang };

  return (
    <div className="tr-page" style={{ display: 'flex', width: '100%' }}>
      <div className="tr-wrap">
        <div className="tr-title">Transcriber</div>
        <div className="tr-sub">File upload or live mic capture → Tamil on-air text, ready for CG / ticker or Script Generator.</div>

        <div className="tr-mode-tabs">
          <button className={tMode === 'file' ? 'on' : ''} onClick={() => setTMode('file')}>📁 File Upload</button>
          <button className={tMode === 'mic' ? 'on' : ''} onClick={() => setTMode('mic')}>🎤 Live Mic / Wire</button>
        </div>

        <div className="tr-panel">
          <h2>Recognition settings</h2>
          <div className="tr-row">
            <div className="tr-field">
              <label>Whisper model</label>
              <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
                {WHISPER_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="tr-field">
              <label>Spoken language</label>
              <select value={spokenLang} onChange={(e) => setSpokenLang(e.target.value)}>
                {SPOKEN_LANGS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="tr-field">
              <label>Output language</label>
              <select value={outputLang} onChange={(e) => setOutputLang(e.target.value)}>
                {OUTPUT_LANGS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
          {(outputLang === 'ta-claude' || outputLang === 'en') && (
            <div className="tr-hint-note">Translation uses your saved API key (top bar) for a Claude call.</div>
          )}
          {outputLang === 'ta-nllb' && (
            <div className="tr-hint-note">On-device NLLB model — first use downloads ~1.2GB, then works offline.</div>
          )}
        </div>

        {tMode === 'file' ? (
          <FilePanel t={t} settings={settings} onSendToNewsGen={onSendToNewsGen} />
        ) : (
          <MicPanel t={t} settings={settings} onSendToNewsGen={onSendToNewsGen} />
        )}

        <div className="tr-note">
          Whisper transcription runs on your device — audio never leaves your computer.<br />
          NLLB translation is also on-device and free. Claude translate uses your API key.
        </div>
      </div>
    </div>
  );
}
