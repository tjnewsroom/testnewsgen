import { useRef, useState } from 'react';

export default function FilePanel({ t, settings, onSendToNewsGen }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [copyLabel, setCopyLabel] = useState('📋 Copy for CG / Ticker');

  const onFiles = (files) => {
    if (files && files[0]) t.setFile(files[0]);
  };

  const copyOnair = async () => {
    try {
      await navigator.clipboard.writeText(t.onairText);
    } catch {
      /* ignore */
    }
    setCopyLabel('✓ Copied!');
    setTimeout(() => setCopyLabel('📋 Copy for CG / Ticker'), 1400);
  };

  const download = () => {
    const content = t.translation ? t.transcript + '\n\n--- TAMIL ---\n' + t.translation : t.transcript;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (t.file ? t.file.name.replace(/\.[^.]+$/, '') : 'transcript') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tr-panel">
      <h2>Audio / video file</h2>

      <label
        className={`tr-dropzone ${dragging ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
      >
        <input ref={inputRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={(e) => onFiles(e.target.files)} />
        <div className="ico">🎧</div>
        <div className="t">Drop audio/video here, or click to browse</div>
        <div className="s">MP3, WAV, M4A, MP4 — reporter wire clips, PTC, byte audio</div>
      </label>

      {t.file && <div className="tr-fname">📎 {t.file.name} ({Math.round(t.file.size / 1024)}KB)</div>}

      <button className="tr-run-btn" disabled={!t.file || t.running} onClick={() => t.runFileTranscribe(settings)}>
        {t.running ? 'PROCESSING…' : '▶ Transcribe'}
      </button>

      {t.showProgress && (
        <div className="tr-prog"><div className="tr-prog-fill" style={{ width: t.progress + '%' }} /></div>
      )}
      {t.fileStatus.text && <div className={`tr-status ${t.fileStatus.kind}`}>{t.fileStatus.text}</div>}

      {t.showOutput && (
        <>
          <div className="tr-out-cols">
            <div className="tr-out-half">
              <div className="tr-out-half-label">TRANSCRIPT{settings.spokenLang !== 'auto' ? ` (${settings.spokenLang.toUpperCase()})` : ''}</div>
              <div className="tr-box">{t.transcript}</div>
            </div>
            {t.translation && settings.outputLang !== 'same' && (
              <div className="tr-out-half">
                <div className="tr-out-half-label translated">TAMIL TRANSLATION</div>
                <div className="tr-box">{t.translation}</div>
              </div>
            )}
          </div>

          <div className="tr-onair-section">
            <div className="tr-onair-label">✦ ON-AIR TEXT <span className="tr-onair-hint">— இதை edit பண்ணி CG / Ticker-க்கு copy பண்ணுங்க</span></div>
            <textarea className="tr-onair-box" value={t.onairText} onChange={(e) => t.setOnairText(e.target.value)} />
            <div className="tr-copy-row">
              <button className="primary" onClick={copyOnair}>{copyLabel}</button>
              <button onClick={download}>⬇ Download .txt</button>
              <button className="send" onClick={() => onSendToNewsGen(t.onairText)}>⏩ Send to NewsGen</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
