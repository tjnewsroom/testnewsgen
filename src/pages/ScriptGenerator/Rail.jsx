import { WPS } from '../../lib/prompts';

const BULLETIN_TYPES = ['General News', 'Top 50', 'Prime News', '3-Minute Stories', 'Breaking News'];
const FORMATS = ['VO', 'VO BREATH', 'VO + BYTE', 'HL', 'Anchor Read (RDR)', 'Package (PKG)', 'MINI TALKS', 'ONE MINUTE', 'Breather'];
const FORMAT_LABELS = { 'Anchor Read (RDR)': 'RDR', 'Package (PKG)': 'PKG', 'VO BREATH': 'VO Breath', 'VO + BYTE': 'VO + Byte', 'MINI TALKS': 'Mini Talks', 'ONE MINUTE': 'One Minute' };

function loadImageFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1568;
      let w = img.width;
      let h = img.height;
      if (Math.max(w, h) > MAX) {
        const sc = MAX / Math.max(w, h);
        w = Math.round(w * sc);
        h = Math.round(h * sc);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      onDone(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export default function Rail(props) {
  const {
    mode, source, setSource, rawScript, setRawScript, url, setUrl, imageB64, setImageB64,
    bulletinType, setBulletinType, format, setFormat, duration, setDuration, instructions, setInstructions,
    trimScript, setTrimScript, trimDuration, setTrimDuration, trimInstructions, setTrimInstructions,
    loading, onGo,
  } = props;

  return (
    <aside className="sg-rail">
      <div className="sg-rail-scroll">
        {mode === 'generate' ? (
          <>
            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">1</span><span className="lbl">Source</span></div>
              <div className="sg-seg-ctrl">
                <button className={`sg-sc ${source === 'raw' ? 'on' : ''}`} onClick={() => setSource('raw')}>Raw script</button>
                <button className={`sg-sc ${source === 'url' ? 'on' : ''}`} onClick={() => setSource('url')}>Link / URL</button>
                <button className={`sg-sc ${source === 'img' ? 'on' : ''}`} onClick={() => setSource('img')}>Newspaper Image</button>
              </div>
              {source === 'raw' && (
                <textarea
                  value={rawScript}
                  onChange={(e) => setRawScript(e.target.value)}
                  placeholder="Reporter script / spot copy — Tamil or English"
                />
              )}
              {source === 'url' && (
                <>
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://article-link..." />
                  <div className="sg-src-note">Article web search வழியா படிச்சு facts மட்டும் use ஆகும்.</div>
                </>
              )}
              {source === 'img' && (
                <>
                  <label className="sg-drop">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) loadImageFile(f, setImageB64);
                      }}
                    />
                    <div className="ico">📰</div>
                    <div className="t">Newspaper image select பண்ணுங்க</div>
                    <div className="s">Tamil/English clipping · press note · printed text photo</div>
                  </label>
                  {imageB64 && (
                    <div className="sg-img-preview">
                      <img src={`data:image/jpeg;base64,${imageB64}`} alt="Newspaper clipping preview" />
                    </div>
                  )}
                  <div className="sg-src-note">📌 Clear photo · good light · one article in frame = best accuracy</div>
                </>
              )}
            </div>

            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">2</span><span className="lbl">Bulletin type</span></div>
              <div className="sg-chips">
                {BULLETIN_TYPES.map((b) => (
                  <div key={b} className={`sg-chip ${bulletinType === b ? 'on' : ''}`} onClick={() => setBulletinType(b)}>
                    {b === '3-Minute Stories' ? '3-Min Stories' : b === 'Breaking News' ? 'Breaking' : b}
                  </div>
                ))}
              </div>
            </div>

            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">3</span><span className="lbl">Format structure</span></div>
              <div className="sg-chips">
                {FORMATS.map((f) => (
                  <div key={f} className={`sg-chip fmt ${format === f ? 'on' : ''}`} onClick={() => setFormat(f)}>
                    {FORMAT_LABELS[f] || f}
                  </div>
                ))}
              </div>
            </div>

            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">4</span><span className="lbl">Target duration</span></div>
              <div className="sg-dur-row">
                <input type="number" min={8} max={300} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>sec</span>
                <div className="sg-dur-q">
                  {[20, 40, 60, 100].map((v) => (
                    <button key={v} className="sg-dq" onClick={() => setDuration(v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div className="sg-dur-est">≈ {Math.round(duration * WPS)} Tamil words · {WPS} w/s</div>
            </div>

            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">5</span><span className="lbl">Instructions (optional)</span></div>
              <textarea
                style={{ minHeight: 56 }}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Eg: Collector byte highlight, location first..."
              />
            </div>
          </>
        ) : (
          <>
            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">1</span><span className="lbl">Existing Tamil script</span></div>
              <textarea
                style={{ minHeight: 200 }}
                value={trimScript}
                onChange={(e) => setTrimScript(e.target.value)}
                placeholder="Full script paste பண்ணுங்க..."
              />
            </div>
            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">2</span><span className="lbl">Trim to duration</span></div>
              <div className="sg-dur-row">
                <input type="number" min={8} max={300} value={trimDuration} onChange={(e) => setTrimDuration(Number(e.target.value) || 0)} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>sec</span>
                <div className="sg-dur-q">
                  {[20, 30, 40].map((v) => (
                    <button key={v} className="sg-dq" onClick={() => setTrimDuration(v)}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="sg-step">
              <div className="sg-step-hd"><span className="num">3</span><span className="lbl">Instructions (optional)</span></div>
              <textarea
                style={{ minHeight: 56 }}
                value={trimInstructions}
                onChange={(e) => setTrimInstructions(e.target.value)}
                placeholder="Eg: statistics retain, quotes shorten..."
              />
            </div>
          </>
        )}
      </div>
      <div className="sg-rail-foot">
        <button className="btn-primary" disabled={loading} onClick={onGo}>
          {loading ? 'WORKING…' : mode === 'generate' ? '⏺  GENERATE SCRIPT' : '✂  TRIM SCRIPT'}
        </button>
      </div>
    </aside>
  );
}
