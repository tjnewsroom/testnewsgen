import { useState } from 'react';

export default function MicPanel({ t, settings, onSendToNewsGen }) {
  const [copyLabel, setCopyLabel] = useState('📋 Copy for CG / Ticker');

  const copyOnair = async () => {
    try {
      await navigator.clipboard.writeText(t.micOnair);
    } catch {
      /* ignore */
    }
    setCopyLabel('✓ Copied!');
    setTimeout(() => setCopyLabel('📋 Copy for CG / Ticker'), 1400);
  };

  return (
    <div className="tr-panel">
      <h2>Live mic / wire feed capture</h2>
      <div className="tr-hint-note">
        <b>Usage:</b> ANI/agency wire feed-ஐ speakers-ல் play பண்ணுங்க. Start அழுத்துங்க — mic capture பண்ணி 5 seconds-க்கு ஒரு தடவை transcribe + translate ஆகும்.<br />
        <b>⚠ Mic needs HTTPS or localhost.</b>
      </div>

      <div className="tr-mic-controls" style={{ marginTop: 14 }}>
        {!t.micActive ? (
          <button onClick={() => t.startMic(settings)}>🎤 START CAPTURE</button>
        ) : (
          <button className="stop" onClick={t.stopMic}>⏹ STOP</button>
        )}
      </div>

      {t.micStatus.text && <div className={`tr-status ${t.micStatus.kind}`}>{t.micStatus.text}</div>}

      <div className="tr-mic-viz">
        <div className="tr-mic-bars">
          {t.micLevel.map((h, i) => (
            <div key={i} className="tr-mic-bar" style={{ height: h + 'px' }} />
          ))}
        </div>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>{t.micLabel}</span>
      </div>

      <div className="tr-onair-section">
        <div className="tr-onair-label">✦ ON-AIR TEXT <span className="tr-onair-hint">— live update ஆகும், edit பண்ணி copy பண்ணுங்க</span></div>
        <textarea className="tr-onair-box" style={{ minHeight: 110 }} value={t.micOnair} onChange={(e) => t.setMicOnair(e.target.value)} />
        <div className="tr-copy-row">
          <button className="primary" onClick={copyOnair}>{copyLabel}</button>
          <button onClick={t.clearMicOutput} style={{ borderColor: 'var(--tally-line)', color: 'var(--tally)' }}>🗑 Clear</button>
          <button className="send" onClick={() => onSendToNewsGen(t.micOnair)}>⏩ Send to NewsGen</button>
        </div>
      </div>

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink-dim)', padding: '8px 0' }}>
          🔴 Live feed log — click to expand all chunks ({t.liveFeed.length})
        </summary>
        <div className="tr-live-feed">
          <div className="tr-live-feed-header">
            <span className="lbl">Chunks captured this session</span>
            <button onClick={t.clearMicOutput}>Clear log</button>
          </div>
          <div className="tr-live-feed-scroll">
            {t.liveFeed.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)' }}>Chunks will appear here as captured…</div>
            )}
            {t.liveFeed.slice().reverse().map((c, i) => (
              <div key={i} className="tr-live-chunk">
                <div className="tr-live-chunk-orig">{c.orig}</div>
                <div className="tr-live-chunk-tamil">{c.translated}</div>
                <div className="tr-live-chunk-time">{c.time}</div>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
