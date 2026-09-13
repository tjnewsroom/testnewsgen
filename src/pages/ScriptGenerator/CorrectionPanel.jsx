import { useState, useEffect } from 'react';
import { CL_LEVEL_LABELS, CL_MILESTONES } from '../../lib/correctionLoop';

function barColor(pct) {
  if (pct < 50) return 'var(--tally)';
  if (pct < 70) return 'var(--standby)';
  if (pct < 85) return 'var(--ready)';
  return 'var(--archive)';
}

export default function CorrectionPanel({ seed, cl, editText, setEditText }) {
  const [original, setOriginal] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (seed) {
      setEditText(seed.scriptText);
      setOriginal(seed.scriptText);
    }
  }, [seed, setEditText]);

  if (!seed) {
    return (
      <aside className="sg-cl-col">
        <div className="sg-cl-head">
          <div className="sg-cl-title">Correction Loop</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
            Generate a script first — your edits here train the house-style engine.
          </div>
        </div>
      </aside>
    );
  }

  const similarity = cl.previewSimilarity(original, editText);
  const matchColor = similarity > 85 ? 'var(--ready)' : similarity > 60 ? 'var(--standby)' : 'var(--tally)';
  const pct = cl.stats.avgSimilarity;

  const save = () => {
    const corrected = editText.trim();
    if (!corrected || corrected.length < 10) {
      window.alert('Correction-ஐ type பண்ணுங்க');
      return;
    }
    cl.addCorrection(seed.rawSrc, original, corrected, seed.fmt, seed.bt);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 3000);
  };

  const copyBox = async () => {
    try {
      await navigator.clipboard.writeText(editText);
    } catch {
      /* ignore */
    }
  };

  const resetBox = () => setEditText(original);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(cl.pairs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tj_corrections_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="sg-cl-col">
      <div className="sg-cl-head">
        <div className="sg-cl-title">Correction Loop</div>
        <div className="sg-cl-acc-row">
          <span className="sg-cl-acc-badge">{pct}% · {cl.stats.count} saved</span>
          <div className="sg-cl-bar-track">
            <div className="sg-cl-bar-fill" style={{ width: pct + '%', background: barColor(pct) }} />
          </div>
        </div>
        <div className="sg-cl-milestrip">
          {CL_MILESTONES.map((m, i) => (
            <div key={m} className={`sg-cl-mile ${cl.stats.count >= m ? 'done' : ''}`}>{CL_LEVEL_LABELS[i]}</div>
          ))}
        </div>
      </div>
      <div className="sg-cl-body">
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8, lineHeight: 1.5 }}>
          Edit the script below the way you'd actually air it, then save — the next generation uses this as a style example.
        </div>
        <textarea className="sg-cl-editor" value={editText} onChange={(e) => setEditText(e.target.value)} />
        <div className="sg-cl-match" style={{ color: matchColor }}>Match: {similarity}%</div>
        <div className="sg-cl-actions">
          <button className="btn" onClick={copyBox}>⧉ Copy</button>
          <button className="btn" onClick={resetBox}>↺ Reset</button>
          <button className="btn tally" onClick={save}>✓ Save correction</button>
          {savedFlash && <span className="sg-cl-savemsg">✓ Saved</span>}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 7 }}>
          <button className="btn" onClick={() => setShowHistory((v) => !v)}>{showHistory ? 'Hide' : 'Show'} history ({cl.pairs.length})</button>
          {cl.pairs.length > 0 && <button className="btn" onClick={exportJson}>⬇ Export</button>}
        </div>

        {showHistory && (
          <div style={{ marginTop: 12 }}>
            {cl.pairs.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Corrections இல்லை இன்னும்.</div>}
            {cl.pairs.slice().reverse().map((p, i) => (
              <div key={p.id} className="sg-cl-history-item">
                <div className="sg-cl-history-meta">
                  <span>#{cl.pairs.length - i}</span>
                  <span>{p.date}</span>
                  <span>{p.format}</span>
                  <span className="pct" style={{ color: p.similarity > 80 ? 'var(--ready)' : 'var(--standby)' }}>{p.similarity}% match</span>
                  <button className="del" onClick={() => cl.deleteCorrection(p.id)}>Delete</button>
                </div>
                <div className="sg-cl-history-text"><b>AI:</b> {(p.ai || '').slice(0, 120)}…</div>
                <div className="sg-cl-history-text"><b>Corrected:</b> {(p.corrected || '').slice(0, 120)}…</div>
              </div>
            ))}
            {cl.pairs.length > 0 && (
              <button className="btn" style={{ color: 'var(--tally)', borderColor: 'var(--tally-line)' }} onClick={() => window.confirm('All corrections delete ஆகும். Sure?') && cl.clearAll()}>
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
