// World Monitor — RSS aggregation across Tamil / India / World sources,
// with keyword-based priority classification. Ported from the original.

export const MON_FEEDS = [
  // TAMIL
  { name: 'Dinamalar', url: 'https://www.dinamalar.com/rss/latest-news.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'OneIndia Tamil', url: 'https://tamil.oneindia.com/rss/tamil-news-fb.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'News18 Tamil', url: 'https://tamil.news18.com/commonfeeds/v1/tam/rss/latest.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'Hindu TamilNadu', url: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss', cat: 'TAMIL', pri_boost: true },
  { name: 'Vikatan', url: 'https://www.vikatan.com/rss/rss.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'Puthiyathalaimurai', url: 'https://www.puthiyathalaimurai.com/rss/latest-news.rss', cat: 'TAMIL', pri_boost: true },
  { name: 'Polimer News', url: 'https://www.polimernews.com/rss/rss.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'Maalaimalar', url: 'https://www.maalaimalar.com/rss/latest-news.xml', cat: 'TAMIL', pri_boost: true },
  { name: 'Nakkheeran', url: 'https://www.nakkheeran.in/feed/', cat: 'TAMIL', pri_boost: true },
  { name: 'Daily Thanthi', url: 'https://www.dailythanthi.com/rss/latest-news', cat: 'TAMIL', pri_boost: true },
  // INDIA
  { name: 'Hindu National', url: 'https://www.thehindu.com/news/national/feeder/default.rss', cat: 'INDIA' },
  { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', cat: 'INDIA' },
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', cat: 'INDIA' },
  { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml', cat: 'INDIA' },
  { name: 'India Today', url: 'https://www.indiatoday.in/rss/1206514', cat: 'INDIA' },
  { name: 'BBC India', url: 'https://feeds.bbci.co.uk/news/world/asia/india/rss.xml', cat: 'INDIA' },
  { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories', cat: 'INDIA' },
  { name: 'Republic World', url: 'https://www.republicworld.com/feeds/news.rss', cat: 'INDIA' },
  { name: 'Reuters India', url: 'https://feeds.reuters.com/reuters/INtopNews', cat: 'INDIA' },
  { name: 'ANI News', url: 'https://www.aninews.in/rss/national.xml', cat: 'INDIA' },
  { name: 'PTI News', url: 'https://www.ptinews.com/rss/allnews.xml', cat: 'INDIA' },
  // WORLD
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', cat: 'WORLD' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', cat: 'WORLD' },
  { name: 'Reuters World', url: 'https://feeds.reuters.com/reuters/worldNews', cat: 'WORLD' },
  { name: 'AP News', url: 'https://rsshub.app/apnews/topics/ap-top-news', cat: 'WORLD' },
  { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', cat: 'WORLD' },
  { name: 'CNN', url: 'http://rss.cnn.com/rss/edition.rss', cat: 'WORLD' },
  { name: 'DW News', url: 'https://rss.dw.com/xml/rss-en-top', cat: 'WORLD' },
];

const BREAK_KEYWORDS = [
  'breaking', 'flash', 'urgent', 'killed', 'dead', 'explosion', 'attack',
  'earthquake', 'flood', 'fire', 'blast', 'crash', 'assassination', 'war', 'strike',
  'arrested', 'convicted', 'verdict', 'emergency', 'disaster', 'tsunami',
  'பரபரப்பு', 'திடீர்', 'வெடிகுண்டு', 'தீவிரவாதி', 'படுகொலை', 'நிலநடுக்கம்',
];
const HIGH_KEYWORDS = [
  'india', 'modi', 'bjp', 'congress', 'supreme court', 'parliament',
  'tamil', 'tamilnadu', 'chennai', 'election', 'court', 'verdict', 'protest',
  'முதல்வர்', 'பிரதமர்', 'நீதிமன்றம்', 'தேர்தல்',
];
const INDIA_KEYWORDS = ['india', 'indian', 'delhi', 'mumbai', 'chennai', 'bangalore', 'gujarat', 'maharashtra', 'tamilnadu', 'kolkata', 'hyderabad'];
const TAMIL_BREAK = ['திடீர்', 'படுகொலை', 'வெடிகுண்டு', 'தீவிரவாதி', 'நிலநடுக்கம்', 'வெள்ளம்', 'தீ விபத்து', 'விபத்து', 'பரபரப்பு', 'மரணம்', 'கொலை', 'கைது', 'ஆபத்து'];

export function priClass(text, cat, priBoosted) {
  const t = (text || '').toLowerCase();
  if (priBoosted) {
    if (BREAK_KEYWORDS.some((k) => t.includes(k)) || TAMIL_BREAK.some((k) => text.includes(k))) return 'BREAKING';
    return 'TAMIL';
  }
  if (BREAK_KEYWORDS.some((k) => t.includes(k))) return 'BREAKING';
  if (cat === 'INDIA' || INDIA_KEYWORDS.some((k) => t.includes(k))) return 'INDIA';
  if (HIGH_KEYWORDS.some((k) => t.includes(k))) return 'HIGH';
  return 'NORMAL';
}

/** CORS proxy with fallback — rss2json first, allorigins second. */
async function fetchWithProxy(feedUrl) {
  try {
    const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feedUrl), { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    if (data.status === 'ok' && data.items) {
      return data.items
        .map((item) => ({
          title: (item.title || '').trim(),
          desc: (item.description || item.content || '').replace(/<[^>]+>/g, '').trim(),
          link: item.link || item.guid || '',
          pubDate: item.pubDate || '',
        }))
        .filter((i) => i.title);
    }
  } catch {
    /* fall through to second proxy */
  }
  try {
    const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(feedUrl), { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    const xml = new DOMParser().parseFromString(data.contents || '', 'text/xml');
    return [...xml.querySelectorAll('item')].map((item) => ({
      title: (item.querySelector('title')?.textContent || '').trim(),
      desc: (item.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, '').trim(),
      link: (item.querySelector('link')?.textContent || '').trim(),
      pubDate: (item.querySelector('pubDate')?.textContent || '').trim(),
    })).filter((i) => i.title);
  } catch {
    return [];
  }
}

const FETCH_TIME = {};

export async function fetchFeed(feed) {
  try {
    const items = await fetchWithProxy(feed.url);
    const now = new Date().toISOString();
    return items.map((item) => {
      const id = feed.name + '|' + (item.link || item.title);
      if (!FETCH_TIME[id]) FETCH_TIME[id] = now;
      const pri = priClass(item.title + ' ' + item.desc, feed.cat, feed.pri_boost);
      return {
        id,
        title: item.title,
        desc: item.desc,
        link: item.link,
        pubDate: item.pubDate || now,
        fetchDate: FETCH_TIME[id],
        source: feed.name,
        cat: feed.cat,
        pri,
        pri_boost: feed.pri_boost,
      };
    });
  } catch {
    return [];
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  return Math.floor(mins / 1440) + 'd ago';
}

/** Fetch a full article's text through the proxy, for richer script generation. */
export async function fetchArticleText(link) {
  if (!link) return '';
  try {
    const r = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(link), { signal: AbortSignal.timeout(6000) });
    const data = await r.json();
    if (data.contents) {
      const txt = data.contents
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);
      if (txt.length > 200) return txt;
    }
  } catch {
    /* ignore, caller falls back to title+desc */
  }
  return '';
}
