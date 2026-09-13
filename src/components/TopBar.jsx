const NAV = [
  { id: 'newsgen', label: 'Script Generator', icon: '⏺' },
  { id: 'transcriber', label: 'Transcriber', icon: '🎙' },
  { id: 'monitor', label: 'World Monitor', icon: '🌍' },
];

export default function TopBar({ page, onNavigate, mode, onModeChange }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <h1>
          TJ <em>NewsGen</em>
        </h1>
        <span className="tag">BULLETIN ENGINE</span>
      </div>

      <nav className="nav-pills">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-pill ${page === n.id ? 'on' : ''}`}
            onClick={() => onNavigate(n.id)}
          >
            <span aria-hidden="true">{n.icon}</span> {n.label}
          </button>
        ))}
      </nav>

      {page === 'newsgen' && (
        <div className="mode-seg">
          <button className={mode === 'generate' ? 'on' : ''} onClick={() => onModeChange('generate')}>
            Generate
          </button>
          <button className={mode === 'trim' ? 'on' : ''} onClick={() => onModeChange('trim')}>
            Trim to Time
          </button>
        </div>
      )}

      <div className="topbar-spacer" />
    </header>
  );
}
