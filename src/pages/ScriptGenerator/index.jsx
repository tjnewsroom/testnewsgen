import { useState, useEffect, useRef } from 'react';
import Rail from './Rail';
import Stage from './Stage';
import CorrectionPanel from './CorrectionPanel';
import { useApiKeyStore } from '../../hooks/useApiKeyStore';
import { useGenerator, buildEditableScript } from '../../hooks/useGenerator';
import { useCorrectionLoop } from '../../hooks/useCorrectionLoop';

export default function ScriptGenerator({ mode, setMode, incoming }) {
  const { provider, key } = useApiKeyStore();
  const gen = useGenerator({ provider, apiKey: key });
  const cl = useCorrectionLoop();

  // ── generate-mode form state ──
  const [source, setSource] = useState('raw');
  const [rawScript, setRawScript] = useState('');
  const [url, setUrl] = useState('');
  const [imageB64, setImageB64] = useState(null);
  const [bulletinType, setBulletinType] = useState('General News');
  const [format, setFormat] = useState('VO');
  const [duration, setDuration] = useState(40);
  const [instructions, setInstructions] = useState('');

  // ── trim-mode form state ──
  const [trimScript, setTrimScript] = useState('');
  const [trimDuration, setTrimDuration] = useState(30);
  const [trimInstructions, setTrimInstructions] = useState('');

  // ── correction panel editable copy ──
  const [correctionSeed, setCorrectionSeed] = useState(null); // { rawSrc, scriptText, fmt, bt }

  const lastIncomingTs = useRef(0);
  useEffect(() => {
    if (incoming && incoming.ts !== lastIncomingTs.current) {
      lastIncomingTs.current = incoming.ts;
      setRawScript(incoming.text);
      setSource('raw');
      setMode('generate');
    }
  }, [incoming, setMode]);

  const runGenerate = async () => {
    try {
      const out = await gen.generate({ source, rawScript, url, imageB64, bulletinType, format, duration, instructions });
      const scriptText = buildEditableScript(out);
      const rawSrc = source === 'raw' ? rawScript : source === 'url' ? url : '(image)';
      setCorrectionSeed({ rawSrc, scriptText, fmt: format, bt: bulletinType });
    } catch {
      /* error surfaced via gen.error, shown in Stage */
    }
  };

  const runTrim = async () => {
    try {
      await gen.trim({ script: trimScript, duration: trimDuration, instructions: trimInstructions });
    } catch {
      /* error surfaced via gen.error */
    }
  };

  const go = () => (mode === 'generate' ? runGenerate() : runTrim());

  return (
    <div className="sg" style={{ display: 'flex', width: '100%' }}>
      <Rail
        mode={mode}
        source={source}
        setSource={setSource}
        rawScript={rawScript}
        setRawScript={setRawScript}
        url={url}
        setUrl={setUrl}
        imageB64={imageB64}
        setImageB64={setImageB64}
        bulletinType={bulletinType}
        setBulletinType={setBulletinType}
        format={format}
        setFormat={setFormat}
        duration={duration}
        setDuration={setDuration}
        instructions={instructions}
        setInstructions={setInstructions}
        trimScript={trimScript}
        setTrimScript={setTrimScript}
        trimDuration={trimDuration}
        setTrimDuration={setTrimDuration}
        trimInstructions={trimInstructions}
        setTrimInstructions={setTrimInstructions}
        loading={gen.loading}
        onGo={go}
      />
      <Stage mode={mode} gen={gen} onRegenerate={runGenerate} onRetrim={runTrim} />
      {mode === 'generate' && (
        <CorrectionPanel seed={correctionSeed} cl={cl} />
      )}
    </div>
  );
}
