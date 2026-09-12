import { useState, useRef, useCallback, useEffect } from 'react';
import { MON_FEEDS, fetchFeed } from '../lib/monitorFeeds';

const PAGE_SIZE = 20;
const POLL_MS = 30000;

function playAlertTone(ctx) {
  try {
    [0, 200, 400].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
      osc.start(ctx.currentTime + delay / 1000);
      osc.stop(ctx.currentTime + delay / 1000 + 0.3);
    });
  } catch {
    /* audio unavailable */
  }
}

export function useMonitor({ active }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('LOADING…');
  const [sources, setSources] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [freshnessMins, setFreshnessMins] = useState(99999);
  const [page, setPage] = useState(0);
  const [breaking, setBreaking] = useState(null); // { text, items, idx }
  const [refreshing, setRefreshing] = useState(false);

  const seenIds = useRef(new Set());
  const audioCtx = useRef(null);
  const pollRef = useRef(null);
  const bannerRotateRef = useRef(null);
  const alertRepeatRef = useRef(null);
  const initedRef = useRef(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    setStatus('FETCHING…');
    if (isRefresh) {
      seenIds.current = new Set();
      setItems([]);
    }
    const results = await Promise.allSettled(MON_FEEDS.map(fetchFeed));
    const newBreaking = [];
    const allFetched = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        r.value.forEach((item) => {
          if (!seenIds.current.has(item.id)) {
            seenIds.current.add(item.id);
            item.isNew = true;
            if (item.pri === 'BREAKING') newBreaking.push(item);
          }
          allFetched.push(item);
        });
      }
    });

    allFetched.sort((a, b) => new Date(b.fetchDate || b.pubDate) - new Date(a.fetchDate || a.pubDate));
    setItems(allFetched);

    if (newBreaking.length > 0) {
      if (!audioCtx.current) {
        try {
          audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
          /* ignore */
        }
      }
      if (audioCtx.current) playAlertTone(audioCtx.current);

      if (bannerRotateRef.current) clearInterval(bannerRotateRef.current);
      let idx = 0;
      setBreaking({ item: newBreaking[0], items: newBreaking, idx: 0 });
      if (newBreaking.length > 1) {
        bannerRotateRef.current = setInterval(() => {
          idx = (idx + 1) % newBreaking.length;
          setBreaking({ item: newBreaking[idx], items: newBreaking, idx });
        }, 5000);
      }
      if (alertRepeatRef.current) clearInterval(alertRepeatRef.current);
      alertRepeatRef.current = setInterval(() => {
        setBreaking((cur) => {
          if (cur && audioCtx.current) playAlertTone(audioCtx.current);
          else if (alertRepeatRef.current) clearInterval(alertRepeatRef.current);
          return cur;
        });
      }, 30000);
      try {
        if (Notification.permission === 'granted') {
          new Notification('🔴 TJ BREAKING — ' + newBreaking[0].source, { body: newBreaking[0].title.slice(0, 80) });
        }
      } catch {
        /* notifications unavailable */
      }
    }

    const uniqueSources = [...new Set(allFetched.map((i) => i.source))];
    setSources(uniqueSources);
    setStatus('LIVE · ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setPage(0);
  }, []);

  const dismissBreaking = useCallback(() => {
    setBreaking(null);
    if (bannerRotateRef.current) clearInterval(bannerRotateRef.current);
    if (alertRepeatRef.current) clearInterval(alertRepeatRef.current);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(true);
    setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => {
    if (!active || initedRef.current) return;
    initedRef.current = true;
    try {
      if (Notification.permission === 'default') Notification.requestPermission();
    } catch {
      /* ignore */
    }
    fetchAll(false);
    pollRef.current = setInterval(() => fetchAll(false), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (bannerRotateRef.current) clearInterval(bannerRotateRef.current);
      if (alertRepeatRef.current) clearInterval(alertRepeatRef.current);
    };
  }, [active, fetchAll]);

  // derived, filtered list
  const filtered = items.filter((i) => {
    if (freshnessMins < 99999) {
      const d = new Date(i.fetchDate || i.pubDate);
      const cutoff = Date.now() - freshnessMins * 60 * 1000;
      if (!isNaN(d) && d.getTime() <= cutoff) return false;
    }
    if (priorityFilter !== 'ALL' && i.pri !== priorityFilter) return false;
    if (sourceFilter !== 'ALL' && i.source !== sourceFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const freshCount = items.filter((i) => {
    const d = new Date(i.fetchDate || i.pubDate);
    return !isNaN(d) && Date.now() - d < 3600000;
  }).length;
  const breakingCount = items.filter((i) => i.pri === 'BREAKING').length;

  return {
    status,
    sources,
    items,
    pageItems,
    page,
    setPage: (p) => setPage(Math.max(0, Math.min(totalPages - 1, p))),
    totalPages,
    total: filtered.length,
    priorityFilter,
    setPriorityFilter: (p) => { setPriorityFilter(p); setPage(0); },
    sourceFilter,
    setSourceFilter: (s) => { setSourceFilter(s); setPage(0); },
    freshnessMins,
    setFreshnessMins: (m) => { setFreshnessMins(m); setPage(0); },
    breaking,
    dismissBreaking,
    refresh,
    refreshing,
    freshCount,
    breakingCount,
  };
}
