# TJ NewsGen — React Desk Build

Vite + React rebuild of the TamilJanam bulletin engine. Three pages:

- **Script Generator** — raw script / URL / newspaper photo → house-style Tamil broadcast rundown (ANCHOR/VO/BYTE/PKG segments, MOS slug, ticker), plus a Trim-to-Time mode and a correction-loop panel that learns from your edits.
- **Transcriber** — file upload or live mic/wire capture → Whisper transcription (on-device) + Tamil translation (NLLB on-device, or Claude API), edited on-air text ready for CG/ticker.
- **World Monitor** — live RSS aggregation across Tamil/India/World sources with breaking-news alerts, priority filters, and one-click "send to NewsGen."

All three ported faithfully from the original single-file app — same house-style prompts, same provider APIs, same correction-loop/localStorage logic, same feed list and priority keywords.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. Paste an API key for your provider (Claude / Gemini / OpenAI / Groq) in the bar under the top nav — it's stored in your browser's localStorage only, never sent anywhere else.

## Build for deployment

```bash
npm run build
```

Outputs static files to `dist/` — deploy to GitHub Pages, Netlify, Vercel, or any static host. No server/build step needed at runtime.

## Notes

- **Mic capture** needs HTTPS or `localhost` (browser security requirement for `getUserMedia`).
- **Whisper/NLLB** load from `cdn.jsdelivr.net` on first use and run entirely in-browser — no audio leaves the device.
- **World Monitor** feeds go through public CORS proxies (`rss2json.com`, `allorigins.win`); if one is down it falls back to the other.
- API keys and correction-loop training pairs live in `localStorage`, scoped per-browser — nothing is synced.

## Project layout

```
src/
  lib/            house-style prompts, LLM provider clients, correction-loop store,
                  monitor feed list + priority scoring, transcriber (Whisper/NLLB) wrappers
  hooks/          useGenerator, useCorrectionLoop, useMonitor, useTranscriber, useApiKeyStore
  components/     TopBar, ApiKeyBar, SelectionBadge
  pages/
    ScriptGenerator/   Rail (form), Stage (output), CorrectionPanel
    Transcriber/       FilePanel, MicPanel
    WorldMonitor/      feed grid, filters, pagination, breaking banner
  styles/         tokens.css (design system) + one stylesheet per page
```
