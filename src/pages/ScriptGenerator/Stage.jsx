import { useRef, useState } from 'react';
import { fmtSec, wc, WPS } from '../../lib/prompts';
import { fullText } from '../../hooks/useGenerator';

function CopyButton({ text, className = 'cpybtn', children = 'Copy' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button className={`${className} ${done ? 'done' : ''}`} onClick={copy}>
      {done ? '✓ Copied' : children}
    </button>
  );
}

function SecCard({ tag, title, children, durSec, copySrc }) {
  return (
    <div className="sg-sec">
      <div className="sg-sec-hd">
        <span className={`rtag rt-${tag}`}>{title}</span>
        {durSec ? <span className="sdur">{fmtSec(durSec)}</span> : null}
        <CopyButton text={copySrc} />
      </div>
      <div className="sg-sec-body">{children}</div>
    </div>
  );
}

function Rundown({ output }) {
  const o = output;
  return (
    <>
      <div className="sg-slugstrip">
        <span className="slug">{o.slug}</span>
        <span className="btype">{o.bulletin_type}</span>
        <span className="dur">
          {fmtSec(o.total_duration_sec)}
          <small>EST DUR</small>
        </span>
      </div>

      {o.anchor_lead && (
        <SecCard tag="ANCHOR" title="ANCHOR" durSec={Math.round(wc(o.anchor_lead) / WPS)} copySrc={o.anchor_lead}>
          {o.anchor_lead}
        </SecCard>
      )}

      {(o.segments || []).map((s, i) => {
        const t = (s.type || 'VO').split(/[\s(+]/)[0].toUpperCase();
        const copy = s.text + (s.byte_in ? `\nIN: "${s.byte_in}"  OUT: "${s.byte_out}"` : '');
        return (
          <SecCard key={i} tag={t} title={t + (s.speaker ? ' · ' + s.speaker : '')} durSec={s.duration_sec} copySrc={copy}>
            {s.text}
            {s.byte_in && (
              <span className="sg-cue">
                IN: "{s.byte_in}" → OUT: "{s.byte_out}"
              </span>
            )}
          </SecCard>
        );
      })}

      {o.mos_slug && (
        <div className="sg-sec">
          <div className="sg-sec-hd">
            <span className="rtag rt-MOS">MOS SLUG</span>
            <CopyButton text={o.mos_slug} />
          </div>
          <div className="sg-mos-block">
            <div style={{ fontFamily: 'var(--f-tamil)', fontSize: 15, fontWeight: 600, lineHeight: 1.7 }}>{o.mos_slug}</div>
          </div>
        </div>
      )}

      {o.ticker && (() => {
        let hdr = o.ticker;
        let parts = [];
        if (o.ticker_header) {
          hdr = o.ticker_header;
          parts = o.ticker_points || [];
        } else if (o.ticker.includes('||')) {
          const sp = o.ticker.split('||').map((x) => x.trim()).filter(Boolean);
          hdr = sp[0];
          parts = sp.slice(1);
        }
        return (
          <div className="sg-sec">
            <div className="sg-sec-hd">
              <span className="rtag rt-TICKER">TICKER</span>
              <CopyButton text={o.ticker} />
            </div>
            <div className="sg-mos-block">
              <div className="sg-ticker-hd">{hdr}</div>
              {parts.length > 0 && (
                <ul className="sg-ticker-pts">
                  {parts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })()}

      {o.editor_note && <div className="sg-removed">✎ {o.editor_note}</div>}
    </>
  );
}

function TrimOutput({ result }) {
  const o = result;
  return (
    <>
      <div className="sg-stat-row">
        <div className="sg-stat"><div className="v">{o.original_words}</div><div className="l">ORIGINAL</div></div>
        <div className="sg-stat"><div className="v">{o.trimmed_words}</div><div className="l">TRIMMED</div></div>
        <div className="sg-stat"><div className="v">{fmtSec(o.est_duration_sec)}</div><div className="l">EST DUR</div></div>
      </div>
      <div className="sg-sec">
        <div className="sg-sec-hd"><span className="rtag rt-VO">TRIMMED SCRIPT</span></div>
        <div className="sg-sec-body">{o.trimmed_script}</div>
      </div>
      {o.removed_summary && <div className="sg-removed">✂ {o.removed_summary}</div>}
    </>
  );
}

export default function Stage({ mode, gen, editableText, setEditableText, onRegenerate, onRetrim }) {
  const { output, trimResult, loading, loadingLabel, error } = gen;
  const [editing, setEditing] = useState(false);
  const [fileMessage, setFileMessage] = useState('');
  const fileInput = useRef(null);
  const hasOutput = mode === 'generate' ? !!output : !!trimResult;

  const saveHtml = () => {
    const title = output?.slug || 'TJ NewsGen script';
    const escaped = (editableText || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>' +
      '<style>body{font-family:Georgia,serif;max-width:820px;margin:40px auto;padding:0 20px;color:#20231f;line-height:1.7;white-space:pre-wrap}h1{font:700 20px sans-serif;border-bottom:2px solid #d6331f;padding-bottom:12px}</style></head><body><h1>' +
      title.replace(/[&<>]/g, '') + '</h1><main data-tj-newsgen-script="1">' + escaped + '</main></body></html>';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    link.download = (title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'tj-newsgen-script') + '.html';
    link.click();
    URL.revokeObjectURL(link.href);
    setFileMessage('HTML saved');
    setTimeout(() => setFileMessage(''), 1800);
  };

  const openHtml = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const doc = new DOMParser().parseFromString(String(reader.result), 'text/html');
      const saved = doc.querySelector('[data-tj-newsgen-script="1"]') || doc.querySelector('main');
      const text = saved?.textContent?.trim();
      if (!text) {
        setFileMessage('No script found');
        return;
      }
      setEditableText(text);
      setEditing(true);
      setFileMessage('Script opened');
      setTimeout(() => setFileMessage(''), 1800);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <main className="sg-stage">
      <div className="sg-stage-head">
        <span className="t">{mode === 'generate' ? 'RUNDOWN OUTPUT' : 'TRIM OUTPUT'}</span>
        <div className="sg-stage-acts">
          {mode === 'generate' && output && !loading && (
            <>
              <CopyButton text={fullText(output)} className="btn">⧉ Copy all</CopyButton>
              <button className={`btn ${editing ? 'tally' : ''}`} onClick={() => setEditing((v) => !v)}>{editing ? '✓ Done editing' : '✎ Edit'}</button>
              <button className="btn tally" onClick={onRegenerate}>↻ Regen</button>
            </>
          )}
          {mode === 'trim' && trimResult && !loading && (
            <>
              <CopyButton text={trimResult.trimmed_script} className="btn">⧉ Copy trimmed</CopyButton>
              <button className="btn tally" onClick={onRetrim}>↻ Re-trim</button>
            </>
          )}
          <button className="btn" onClick={() => fileInput.current?.click()}>↥ Open HTML</button>
          <button className="btn" disabled={!editableText} onClick={saveHtml}>↓ Save HTML</button>
          <input ref={fileInput} type="file" accept=".html,.htm,text/html" onChange={openHtml} hidden />
        </div>
        {fileMessage && <span className="sg-file-message">{fileMessage}</span>}
      </div>
      <div className="sg-stage-body">
        {loading && (
          <div className="sg-spinner-wrap">
            <div className="sg-spinner" />
            <div className="sg-load-txt">{loadingLabel}</div>
          </div>
        )}
        {!loading && error && (
          <div className="sg-error"><b>பிழை · </b>{error.message}</div>
        )}
        {!loading && !error && hasOutput && (editing ? (
          <textarea className="sg-main-editor" value={editableText} onChange={(e) => setEditableText(e.target.value)} />
        ) : mode === 'generate' ? <Rundown output={output} /> : <TrimOutput result={trimResult} />)}
        {!loading && !error && !hasOutput && (
          <div className="sg-empty">
            <div className="mark">— STANDBY —</div>
            <div className="sg-flow">
              <div className="sg-flow-step"><div className="n">01 · SOURCE</div><div className="d">Paste a script, drop a link, or upload a newspaper clipping.</div></div>
              <div className="sg-flow-step"><div className="n">02 · SHAPE</div><div className="d">Pick the bulletin type and broadcast format for this story.</div></div>
              <div className="sg-flow-step"><div className="n">03 · GENERATE</div><div className="d">The house-style engine writes a rundown-ready script and slug.</div></div>
            </div>
            <div className="note">Every generation learns from corrections saved in the panel on the right.</div>
          </div>
        )}
      </div>
    </main>
  );
}
