// In-browser transcription (Whisper) and translation (NLLB) via transformers.js.
// Loaded dynamically from CDN, exactly as in the original app, so no bundle
// weight is paid unless the Transcriber page is actually used.

let _whisper = null;
let _nllb = null;
let _loadedModel = null;

export const NLLB_LANG = {
  en: 'eng_Latn',
  hi: 'hin_Deva',
  ta: 'tam_Taml',
  te: 'tel_Telu',
  kn: 'kan_Knda',
  ml: 'mal_Mlym',
  auto: 'eng_Latn',
};

async function getTransformers() {
  const mod = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  mod.env.allowLocalModels = false;
  return mod;
}

export async function getWhisper(modelId, onProgress) {
  if (_whisper && _loadedModel === modelId) return _whisper;
  const { pipeline } = await getTransformers();
  _whisper = await pipeline('automatic-speech-recognition', modelId, {
    progress_callback: onProgress || (() => {}),
  });
  _loadedModel = modelId;
  return _whisper;
}

export async function getNLLB(onProgress) {
  if (_nllb) return _nllb;
  const { pipeline } = await getTransformers();
  _nllb = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', {
    progress_callback: onProgress || (() => {}),
  });
  return _nllb;
}

const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

export async function doTranscribe(audioData, spokenLang) {
  await yieldToBrowser();
  const opts = { chunk_length_s: 20, stride_length_s: 3, task: 'transcribe' };
  if (spokenLang !== 'auto') opts.language = spokenLang;
  const r = await _whisper(audioData, opts);
  await yieldToBrowser();
  return r.text.trim();
}

export async function doNLLB(text, spokenLang) {
  await yieldToBrowser();
  const src = NLLB_LANG[spokenLang] || NLLB_LANG.en;
  const out = await _nllb(text, { src_lang: src, tgt_lang: 'tam_Taml', max_new_tokens: 400 });
  await yieldToBrowser();
  return out[0].translation_text;
}

export async function decodeToFloat32(source) {
  const ab = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const decoded = await ctx.decodeAudioData(ab);
  let data;
  if (decoded.numberOfChannels > 1) {
    const c0 = decoded.getChannelData(0);
    const c1 = decoded.getChannelData(1);
    data = new Float32Array(c0.length);
    for (let i = 0; i < c0.length; i++) data[i] = (c0[i] + c1[i]) / 2;
  } else {
    data = decoded.getChannelData(0);
  }
  return data;
}

/** RMS energy over the first ~1s, used to skip near-silent mic chunks. */
export function chunkEnergy(audioData) {
  let energy = 0;
  const n = Math.min(audioData.length, 16000);
  for (let i = 0; i < n; i++) energy += audioData[i] * audioData[i];
  return Math.sqrt(energy / n);
}

/** Detects Whisper hallucination artifacts: one word repeated far too often. */
export function isHallucination(transcript) {
  const words = transcript.trim().split(/\s+/);
  const freq = {};
  words.forEach((w) => {
    freq[w] = (freq[w] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(freq));
  return words.length > 6 && maxFreq > words.length * 0.4;
}
