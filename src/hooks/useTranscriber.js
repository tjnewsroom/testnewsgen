import { useState, useRef, useCallback } from 'react';
import { getWhisper, getNLLB, doTranscribe, doNLLB, decodeToFloat32, chunkEnergy, isHallucination } from '../lib/transcriber';
import { callClaudeText } from '../lib/llmProviders';

const MIC_CHUNK_MS = 5000;

export function useTranscriber({ apiKey }) {
  // ── file mode ──
  const [file, setFile] = useState(null);
  const [fileStatus, setFileStatus] = useState({ text: '', kind: '' }); // kind: '' | active | done | err
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [onairText, setOnairText] = useState('');
  const [running, setRunning] = useState(false);

  const applyOutput = useCallback((t, tr, outputLang) => {
    setShowOutput(true);
    setOnairText(tr && outputLang !== 'same' ? tr : t);
  }, []);

  const runFileTranscribe = useCallback(
    async ({ modelId, spokenLang, outputLang }) => {
      if (!file) return;
      setRunning(true);
      setShowOutput(false);
      setShowProgress(true);
      setProgress(5);
      try {
        setFileStatus({ text: 'Decoding audio…', kind: 'active' });
        const audioData = await decodeToFloat32(file);
        setProgress(10);

        setFileStatus({ text: 'Loading Whisper model… (first time takes a minute)', kind: 'active' });
        await getWhisper(modelId, (p) => {
          if (p.status === 'progress' && p.progress) setProgress(Math.min(50, 10 + p.progress * 0.4));
        });
        setProgress(52);

        setFileStatus({ text: 'Transcribing audio…', kind: 'active' });
        const t = await doTranscribe(audioData, spokenLang);
        setTranscript(t);
        setProgress(65);
        applyOutput(t, null, outputLang);
        setFileStatus({ text: outputLang !== 'same' ? 'Translating…' : '✓ Done', kind: outputLang !== 'same' ? 'active' : 'done' });

        let tr = null;
        if (outputLang === 'ta-nllb') {
          setFileStatus({ text: 'Loading NLLB model… (first time ~1.2GB download)', kind: 'active' });
          await getNLLB((p) => {
            if (p.status === 'progress' && p.progress) setProgress(Math.min(90, 65 + p.progress * 0.25));
          });
          setFileStatus({ text: 'Translating to Tamil…', kind: 'active' });
          tr = await doNLLB(t, spokenLang);
        } else if (outputLang === 'ta-claude') {
          setFileStatus({ text: 'Translating via Claude API…', kind: 'active' });
          tr = await callClaudeText('Translate to Tamil broadcast text. Output ONLY Tamil:\n\n' + t, apiKey);
        } else if (outputLang === 'en') {
          setFileStatus({ text: 'Translating to English…', kind: 'active' });
          tr = await callClaudeText('Translate to English. Output ONLY the translation:\n\n' + t, apiKey);
        }

        if (tr) setTranslation(tr);
        applyOutput(t, tr, outputLang);
        setProgress(100);
        setTimeout(() => setShowProgress(false), 700);
        setFileStatus({ text: '✓ Done — On-Air Text ready below ↓', kind: 'done' });
      } catch (err) {
        setFileStatus({ text: 'Error: ' + err.message, kind: 'err' });
        setShowProgress(false);
      }
      setRunning(false);
    },
    [file, apiKey, applyOutput]
  );

  // ── mic / live-wire mode ──
  const [micActive, setMicActive] = useState(false);
  const [micStatus, setMicStatus] = useState({ text: '', kind: '' });
  const [micLevel, setMicLevel] = useState(new Array(10).fill(3));
  const [micLabel, setMicLabel] = useState('——');
  const [micOnair, setMicOnair] = useState('');
  const [liveFeed, setLiveFeed] = useState([]);

  const micStreamRef = useRef(null);
  const micRecorderRef = useRef(null);
  const micChunksRef = useRef([]);
  const micIntervalRef = useRef(null);
  const micAnimRef = useRef(null);
  const micTamilFullRef = useRef('');
  const micActiveRef = useRef(false);

  const stopMic = useCallback(() => {
    micActiveRef.current = false;
    setMicActive(false);
    if (micIntervalRef.current) clearInterval(micIntervalRef.current);
    if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
    if (micRecorderRef.current && micRecorderRef.current.state !== 'inactive') micRecorderRef.current.stop();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
    setMicStatus({ text: 'Stopped.', kind: '' });
    setMicLabel('——');
  }, []);

  const startMic = useCallback(
    async ({ modelId, spokenLang, outputLang }) => {
      if (micActiveRef.current) return;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
        setMicStatus({
          text: isMobile ? '📱 Mobile-ல் mic blocked — HTTPS URL தேவை, try again' : '❌ Mic access denied — browser address bar-ல் mic icon click → Allow',
          kind: 'err',
        });
        return;
      }

      micStreamRef.current = stream;
      micActiveRef.current = true;
      setMicActive(true);
      micTamilFullRef.current = '';
      setMicOnair('');
      setLiveFeed([]);
      setMicStatus({ text: '⏳ Loading Whisper model — please wait, do not close…', kind: 'active' });

      const actx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      actx.createMediaStreamSource(stream).connect(analyser);
      const fftData = new Uint8Array(analyser.frequencyBinCount);
      const animViz = () => {
        micAnimRef.current = requestAnimationFrame(animViz);
        analyser.getByteFrequencyData(fftData);
        setMicLevel(Array.from({ length: 10 }, (_, i) => Math.max(3, Math.round((fftData[i * 2] / 255) * 34))));
      };
      animViz();

      micChunksRef.current = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) micChunksRef.current.push(ev.data);
      };
      recorder.start(1000);
      micRecorderRef.current = recorder;

      try {
        setMicLabel('Loading Whisper…');
        await getWhisper(modelId);
        if (outputLang === 'ta-nllb') {
          setMicLabel('Loading NLLB (~1.2GB)…');
          await getNLLB();
        }
      } catch (e) {
        setMicStatus({ text: '❌ Model load failed: ' + e.message, kind: 'err' });
        stopMic();
        return;
      }

      setMicStatus({ text: '🔴 Capturing — transcribing every 5 seconds…', kind: 'active' });
      setMicLabel('Listening…');
      micChunksRef.current = [];

      let processing = false;
      micIntervalRef.current = setInterval(async () => {
        if (!micActiveRef.current || processing) return;
        processing = true;
        if (micChunksRef.current.length === 0) {
          processing = false;
          return;
        }
        const chunks = [...micChunksRef.current];
        micChunksRef.current = [];
        const mType = micRecorderRef.current ? micRecorderRef.current.mimeType || 'audio/webm' : 'audio/webm';
        const blob = new Blob(chunks, { type: mType });

        try {
          setMicLabel('Transcribing…');
          let audioData;
          try {
            audioData = await decodeToFloat32(blob);
          } catch {
            setMicLabel('Decode err, retrying…');
            processing = false;
            return;
          }
          const energy = chunkEnergy(audioData);
          if (energy < 0.005) {
            setMicLabel('(silence — waiting for speech)');
            processing = false;
            return;
          }
          const t = await doTranscribe(audioData, spokenLang);
          if (t && t.trim().length > 2 && !isHallucination(t)) {
            let addText = t;
            if (outputLang === 'ta-nllb' || outputLang === 'ta-claude') {
              setMicLabel('Translating via Claude…');
              try {
                addText = await callClaudeText('Translate to Tamil broadcast text. ONLY output Tamil, no explanation:\n\n' + t, apiKey);
              } catch {
                addText = t;
              }
            } else if (outputLang === 'en') {
              setMicLabel('Claude translate…');
              try {
                addText = await callClaudeText('Translate to English. ONLY output the translation:\n\n' + t, apiKey);
              } catch {
                addText = t;
              }
            }
            micTamilFullRef.current += (micTamilFullRef.current ? ' ' : '') + addText;
            setMicOnair(micTamilFullRef.current);
            setLiveFeed((prev) => [...prev, { orig: t, translated: addText, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
          }
          setMicLabel('Listening…');
        } catch (e) {
          setMicLabel('Error: ' + e.message);
        }
        processing = false;
      }, MIC_CHUNK_MS);
    },
    [apiKey, stopMic]
  );

  const clearMicOutput = useCallback(() => {
    micTamilFullRef.current = '';
    setMicOnair('');
    setLiveFeed([]);
  }, []);

  return {
    // file
    file, setFile, fileStatus, progress, showProgress, transcript, translation, showOutput, onairText, setOnairText, running, runFileTranscribe,
    // mic
    micActive, micStatus, micLevel, micLabel, micOnair, setMicOnair, liveFeed, startMic, stopMic, clearMicOutput,
    micTamilFullRef,
  };
}
