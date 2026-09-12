import { useState } from 'react';
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

export default function Stage({ mode, gen, onRegenerate, onRetrim }) {
  const { output, trimResult, loading, loadingLabel, error } = gen;
  const hasOutput = mode === 'generate' ? !!output : !!trimResult;

  return (
    <main className="sg-stage">
      <div className="sg-stage-head">
        <span className="t">{mode === 'generate' ? 'RUNDOWN OUTPUT' : 'TRIM OUTPUT'}</span>
        <div className="sg-stage-acts">
          {mode === 'generate' && output && !loading && (
            <>
              <CopyButton text={fullText(output)} className="btn">⧉ Copy all</CopyButton>
              <button className="btn tally" onClick={onRegenerate}>↻ Regen</button>
            </>
          )}
          {mode === 'trim' && trimResult && !loading && (
            <>
              <CopyButton text={trimResult.trimmed_script} className="btn">⧉ Copy trimmed</CopyButton>
              <button className="btn tally" onClick={onRetrim}>↻ Re-trim</button>
            </>
          )}
        </div>
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
        {!loading && !error && hasOutput && (mode === 'generate' ? <Rundown output={output} /> : <TrimOutput result={trimResult} />)}
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
