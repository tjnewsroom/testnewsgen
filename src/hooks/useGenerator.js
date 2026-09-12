import { useState, useCallback } from 'react';
import { callLLM } from '../lib/llmProviders';
import { SYS, SYS_TRIM, WPS } from '../lib/prompts';
import { clBuildExamples } from '../lib/correctionLoop';

/**
 * Drives the Script Generator / Trim workflow: builds the user message from
 * the rail's form state, calls the selected LLM provider, and returns the
 * parsed rundown (or trimmed script) plus loading/error state.
 */
export function useGenerator({ provider, apiKey }) {
  const [output, setOutput] = useState(null);
  const [trimResult, setTrimResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError] = useState(null);

  const generate = useCallback(
    async ({ source, rawScript, url, imageB64, bulletinType, format, duration, instructions }) => {
      let sourceBlock;
      let useSearch = false;
      let imageMode = false;

      if (source === 'raw') {
        if (!rawScript?.trim()) throw new Error('Raw script paste பண்ணுங்க');
        sourceBlock = 'RAW SOURCE SCRIPT:\n"""\n' + rawScript.trim() + '\n"""';
      } else if (source === 'url') {
        if (!url?.trim()) throw new Error('URL கொடுங்க');
        sourceBlock = 'SOURCE: Read via web search, use ONLY its facts: ' + url.trim();
        useSearch = true;
      } else {
        if (!imageB64) throw new Error('Newspaper image upload பண்ணுங்க');
        sourceBlock = 'SOURCE: Attached newspaper image. Read ONLY facts printed in it. Ignore ads and other columns.';
        imageMode = true;
      }

      const userMsg =
        sourceBlock +
        '\n\nBULLETIN TYPE: ' + bulletinType +
        '\nFORMAT: ' + format +
        '\nTARGET DURATION: ' + duration + ' seconds (~' + Math.round(duration * WPS) + ' Tamil words)' +
        (instructions ? '\nINSTRUCTIONS: ' + instructions : '');

      setError(null);
      setLoading(true);
      setLoadingLabel(useSearch ? 'READING ARTICLE · WRITING SCRIPT' : imageMode ? 'READING NEWSPAPER IMAGE · WRITING SCRIPT' : 'WRITING BROADCAST SCRIPT');
      try {
        const clExamples = clBuildExamples();
        const sysWithCl = clExamples ? SYS + clExamples : SYS;
        const payload = imageMode
          ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } }, { type: 'text', text: userMsg }]
          : userMsg;
        const out = await callLLM({ provider, key: apiKey, system: sysWithCl, userMsg: payload, useSearch });
        setOutput(out);
        return out;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [provider, apiKey]
  );

  const trim = useCallback(
    async ({ script, duration, instructions }) => {
      if (!script?.trim()) throw new Error('Script paste பண்ணுங்க');
      const um =
        'SCRIPT:\n"""\n' + script.trim() + '\n"""\n\nTARGET: ' + duration + ' seconds (~' + Math.round(duration * WPS) + ' words)' +
        (instructions ? '\nINSTRUCTIONS: ' + instructions : '');
      setError(null);
      setLoading(true);
      setLoadingLabel('TRIMMING · MEANING PRESERVED');
      try {
        const out = await callLLM({ provider, key: apiKey, system: SYS_TRIM, userMsg: um, useSearch: false });
        setTrimResult(out);
        return out;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [provider, apiKey]
  );

  return { output, setOutput, trimResult, loading, loadingLabel, error, generate, trim };
}

/** Flattened plain-text rendering of a rundown, used for "copy all". */
export function fullText(o) {
  const fmtSec = (s) => {
    s = Math.round(s || 0);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  let t = 'SLUG: ' + o.slug + ' [' + o.bulletin_type + '] DUR: ' + fmtSec(o.total_duration_sec) + '\n';
  if (o.mos_slug) t += 'MOS: ' + o.mos_slug + '\n';
  t += '\n';
  if (o.anchor_lead) t += '[ANCHOR]\n' + o.anchor_lead + '\n\n';
  (o.segments || []).forEach((s) => {
    t += '[' + s.type + (s.speaker ? ' — ' + s.speaker : '') + ']' + (s.duration_sec ? ' (' + fmtSec(s.duration_sec) + ')' : '') + '\n' + s.text + '\n';
    if (s.byte_in) t += 'IN: "' + s.byte_in + '"  OUT: "' + s.byte_out + '"\n';
    t += '\n';
  });
  if (o.ticker) t += 'TICKER: ' + o.ticker + '\n';
  return t;
}

/** Structured editable text used to seed the correction panel. */
export function buildEditableScript(o) {
  const parts = [];
  if (o.anchor_lead) parts.push('[ANCHOR]\n' + o.anchor_lead);
  (o.segments || []).forEach((seg) => {
    let p = '[' + (seg.type || 'VO').split(/[\s(+]/)[0].toUpperCase() + (seg.speaker ? ' · ' + seg.speaker : '') + ']\n' + (seg.text || '');
    if (seg.byte_in) p += '\nIN: "' + seg.byte_in + '"  OUT: "' + seg.byte_out + '"';
    parts.push(p);
  });
  if (o.mos_slug) parts.push('[MOS SLUG]\n' + o.mos_slug);
  if (o.ticker) parts.push('[TICKER]\n' + o.ticker);
  return parts.join('\n\n');
}
