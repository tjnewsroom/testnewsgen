import { useMonitor } from '../../hooks/useMonitor';
import { timeAgo, fetchArticleText } from '../../lib/monitorFeeds';

const PRI_COLORS = {
  BREAKING: { bg: '#E7F1FB', border: '#164E8C', badge: '#164E8C', badgeBg: '#CFE1F5' },
  TAMIL: { bg: '#FCEEE2', border: '#C25A16', badge: '#C25A16', badgeBg: '#F5D8BB' },
  INDIA: { bg: '#E9F1F8', border: '#2A5C8A', badge: '#2A5C8A', badgeBg: '#CFE1EF' },
  HIGH: { bg: '#E7F3EC', border: '#1F7A5C', badge: '#1F7A5C', badgeBg: '#CBE8D8' },
  NORMAL: { bg: '#FFFFFF', border: '#D7E1EE', badge: '#55647A', badgeBg: '#E6EDF6' },
};

const FILTERS = [
  { id: 'ALL', label: 'All', cls: 'all' },
  { id: 'BREAKING', label: '● Breaking', cls: 'breaking' },
  { id: 'TAMIL', label: '● Tamil', cls: 'tamil' },
  { id: 'INDIA', label: 'IN India', cls: 'india' },
  { id: 'HIGH', label: '🌐 World', cls: 'high' },
];

export default function WorldMonitor({ active, onSendToNewsGen, onGoNewsGen }) {
  const m = useMonitor({ active });

  const sendStory = async (item) => {
    let raw = item.title + (item.desc ? '\n\n' + item.desc : '');
    const articleText = await fetchArticleText(item.link);
    if (articleText) raw = item.title + '\n\n' + articleText;
    onSendToNewsGen(raw);
  };

  const copyStory = async (item) => {
    const text = item.title + (item.desc ? '\n\n' + item.desc : '') + (item.link ? '\n\nSource: ' + item.link : '');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="wm-page" style={{ display: 'flex', width: '100%' }}>
      <div className="wm-wrap">
        {m.breaking && (
          <div className={`wm-break-banner ${m.breaking ? 'show' : ''}`}>
            <span className="live-tag">LIVE</span>
            <b>BREAKING</b>
            <span style={{ opacity: 0.85, fontWeight: 400, fontSize: 11 }}>[{m.breaking.item.source}]</span>
            <span>{m.breaking.item.title.slice(0, 90)}</span>
            {m.breaking.items.length > 1 && (
              <span style={{ opacity: 0.7, fontSize: 11 }}>({m.breaking.idx + 1}/{m.breaking.items.length})</span>
            )}
            <button className="close" onClick={m.dismissBreaking}>✕</button>
          </div>
        )}

        <div className="wm-sticky">
          <div className="wm-header">
            <div className="wm-title">🌍 World Monitor</div>
            <div className="wm-live"><span className="blink" />{m.status}</div>
            <div className="wm-stats">{m.items.length} stories · {m.freshCount} fresh · {m.breakingCount} breaking</div>
            <button className="wm-btn" onClick={m.refresh} disabled={m.refreshing}>
              <span style={{ display: 'inline-block', transition: 'transform .5s', transform: m.refreshing ? 'rotate(360deg)' : 'none' }}>⟳</span> Refresh
            </button>
            <button className="wm-btn primary" onClick={onGoNewsGen}>⏺ Script Generator</button>
          </div>

          <div className="wm-filters">
            {FILTERS.map((f) => (
              <div key={f.id} className={`wm-filter ${f.cls} ${m.priorityFilter === f.id ? 'on' : ''}`} onClick={() => m.setPriorityFilter(f.id)}>
                {f.label}
              </div>
            ))}
            <select className="wm-fresh-select" value={m.freshnessMins} onChange={(e) => m.setFreshnessMins(Number(e.target.value))}>
              <option value={30}>Last 30 min</option>
              <option value={60}>Last 1 hour</option>
              <option value={180}>Last 3 hours</option>
              <option value={720}>Last 12 hours</option>
              <option value={99999}>All stories</option>
            </select>
          </div>

          <div className="wm-sources">
            <div className={`wm-source ${m.sourceFilter === 'ALL' ? 'on' : ''}`} onClick={() => m.setSourceFilter('ALL')}>All sources</div>
            {m.sources.map((s) => (
              <div key={s} className={`wm-source ${m.sourceFilter === s ? 'on' : ''}`} onClick={() => m.setSourceFilter(s)}>{s}</div>
            ))}
          </div>
        </div>

        {m.total > 0 && <Pagination m={m} />}

        <div className="wm-grid">
          {m.pageItems.length === 0 && <div className="wm-empty">No stories match this filter.<br />Try a wider filter or click Refresh.</div>}
          {m.pageItems.map((item, i) => {
            const c = PRI_COLORS[item.pri] || PRI_COLORS.NORMAL;
            const globalIdx = m.page * 20 + i + 1;
            return (
              <div key={item.id} className="wm-card" style={{ background: c.bg, borderColor: c.border }}>
                <div className="wm-card-top">
                  <span className="wm-idx">#{globalIdx}</span>
                  <span className="wm-pri-badge" style={{ background: c.badgeBg, color: c.badge, borderColor: c.border }}>{item.pri}</span>
                  <span className="wm-source-tag">{item.source}</span>
                  {item.isNew && <span className="wm-new-badge">NEW</span>}
                  <span className="wm-time">{timeAgo(item.fetchDate || item.pubDate)}</span>
                </div>
                <div className="wm-card-title">{item.title}</div>
                {item.desc && <div className="wm-card-desc">{item.desc}</div>}
                <div className="wm-card-acts">
                  <button className="wm-act gen" onClick={() => sendStory(item)}>⏩ Send to NewsGen</button>
                  <button className="wm-act" onClick={() => copyStory(item)}>⧉ Copy</button>
                  {item.link && (
                    <a className="wm-act" href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>↗ Open source</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {m.total > 0 && <Pagination m={m} />}
      </div>
    </div>
  );
}

function Pagination({ m }) {
  if (m.totalPages <= 1) return null;
  return (
    <div className="wm-pagination">
      <button className="wm-page-btn" disabled={m.page <= 0} onClick={() => m.setPage(m.page - 1)}>&larr; Prev</button>
      <span className="wm-page-label">Page {m.page + 1} of {m.totalPages} · {m.total} stories</span>
      <button className="wm-page-btn primary" disabled={m.page >= m.totalPages - 1} onClick={() => m.setPage(m.page + 1)}>Next &rarr;</button>
    </div>
  );
}
