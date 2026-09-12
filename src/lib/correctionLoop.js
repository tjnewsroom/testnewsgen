// Correction Loop — active learning from editor corrections.
// Editor corrects AI output -> saved as a training pair -> the next
// generation call includes recent corrections as few-shot examples ->
// accuracy (word-overlap similarity) trends upward over time.
// Storage: localStorage, ported 1:1 from the original app.

const CL_KEY = 'tj_corrections';
const CL_MAX = 50;

export function clLoad() {
  try {
    return JSON.parse(localStorage.getItem(CL_KEY) || '[]');
  } catch {
    return [];
  }
}

function clSave(pairs) {
  try {
    localStorage.setItem(CL_KEY, JSON.stringify(pairs.slice(-CL_MAX)));
  } catch {
    /* storage unavailable — fail silently, matches original */
  }
}

export function clSimilarity(a, b) {
  const wa = new Set((a || '').trim().split(/\s+/).filter(Boolean));
  const wb = new Set((b || '').trim().split(/\s+/).filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let common = 0;
  wa.forEach((w) => {
    if (wb.has(w)) common++;
  });
  return Math.round(((common * 2) / (wa.size + wb.size)) * 100);
}

export function clAdd(rawInput, aiOutput, editorCorrection, format, bulletinType) {
  const pairs = clLoad();
  const pair = {
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    format: format || '',
    bulletinType: bulletinType || '',
    raw: rawInput.slice(0, 800),
    ai: aiOutput.slice(0, 800),
    corrected: editorCorrection.slice(0, 800),
    similarity: clSimilarity(aiOutput, editorCorrection),
  };
  pairs.push(pair);
  clSave(pairs);
  return pair;
}

export function clDelete(id) {
  const pairs = clLoad().filter((p) => p.id !== id);
  clSave(pairs);
  return pairs;
}

export function clClearAll() {
  try {
    localStorage.removeItem(CL_KEY);
  } catch {
    /* ignore */
  }
}

/** Build few-shot examples from recent corrections, to append to the system prompt. */
export function clBuildExamples() {
  const pairs = clLoad();
  if (!pairs.length) return '';
  const recent = pairs.slice(-5);
  let block = '\n\nEDITOR CORRECTIONS (learn from these — these are higher priority than base examples):\n';
  recent.forEach((p, i) => {
    block += `\nCORRECTION EXAMPLE ${i + 1} [${p.format || 'VO'} · ${p.bulletinType || 'General'}]:\n`;
    block += `RAW: ${p.raw.slice(0, 300)}\n`;
    block += `AI GENERATED (was wrong):\n${p.ai.slice(0, 300)}\n`;
    block += `EDITOR CORRECTED TO (use this style):\n${p.corrected.slice(0, 300)}\n`;
  });
  return block;
}

export function clGetStats() {
  const pairs = clLoad();
  if (!pairs.length) return { count: 0, avgSimilarity: 0, trend: [], level: 0 };
  const sims = pairs.map((p) => p.similarity);
  const avg = Math.round(sims.reduce((a, b) => a + b, 0) / sims.length);
  const trend = [];
  for (let i = 0; i < sims.length; i += 5) {
    const chunk = sims.slice(i, i + 5);
    trend.push(Math.round(chunk.reduce((a, b) => a + b, 0) / chunk.length));
  }
  let level = 0;
  if (pairs.length >= 3) level = 1;
  if (pairs.length >= 10) level = 2;
  if (pairs.length >= 20) level = 3;
  if (avg >= 80) level = Math.max(level, 3);
  if (avg >= 90) level = 4;
  return { count: pairs.length, avgSimilarity: avg, trend, level };
}

export const CL_LEVEL_LABELS = ['Baseline', 'Learning', 'Improving', 'Good', 'Expert'];
export const CL_MILESTONES = [0, 5, 15, 25, 40];
