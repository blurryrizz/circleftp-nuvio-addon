import sdk from 'stremio-addon-sdk';

const { addonBuilder, serveHTTP } = sdk;

const API_BASE = (process.env.CIRCLEFTP_API_BASE || 'http://new.circleftp.net:5000').replace(/\/$/, '');
const SITE_BASE = (process.env.CIRCLEFTP_SITE_BASE || 'http://new.circleftp.net').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 7000);
/*if (process.env.API_VERIFIED !== 'true') {
  console.error('Startup blocked: API_VERIFIED is not true. Run `npm run check:api`, review the output, then set API_VERIFIED=true only if the API schema and authorized URLs are confirmed.');
  process.exit(1);
}*/

const categories = [
  ['80', 'Featured'], ['6', 'English Movies'], ['9', 'English & Foreign TV Series'],
  ['22', 'Dubbed TV Series'], ['2', 'Hindi Movies'], ['5', 'Hindi TV Series'],
  ['238', 'Indian TV Show'], ['7', 'Hindi Dubbed Movies'], ['8', 'Foreign Language Movies'],
  ['3', 'South Indian Dubbed Movies'], ['4', 'South Indian Movies'], ['1', 'Animation Movies'],
  ['21', 'Anime Series'], ['85', 'Documentary'], ['15', 'WWE']
];
const catalogId = id => `circleftp_${id}`;
const parseId = id => /^circleftp:(\d+)$/.exec(id)?.[1];

async function api(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { accept: 'application/json', 'user-agent': 'CircleFTP-Nuvio-Stremio-Addon/0.1' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Circle FTP API HTTP ${res.status}`);
  const json = await res.json();
  return json;
}
function safeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const u = new URL(raw, SITE_BASE);
    // Only official Circle FTP hostnames are permitted; never rewrite to private IPs.
    if (!['circleftp.net', 'www.circleftp.net', 'new.circleftp.net'].includes(u.hostname.toLowerCase()) && !u.hostname.toLowerCase().endsWith('.circleftp.net')) return undefined;
    if (!['http:', 'https:'].includes(u.protocol)) return undefined;
    return u.toString();
  } catch { return undefined; }
}
function posterFor(post) {
  const image = post.imageSm || post.image;
  if (typeof image !== 'string' || !image) return undefined;
  return safeUrl(new URL(`/uploads/${image.replace(/^\/+/, '')}`, API_BASE).toString());
}
function kind(post) {
  if (post.type === 'series') return 'series';

  if (post.type === 'singleVideo' || post.type === 'singleFile') {
    return 'movie';
  }

  return null;
}
function toPreview(post) {
  const type = kind(post);
  if (!type || post.id == null || !post.title) return null;
  const meta = { id: `circleftp:${post.id}`, type, name: post.title };
  const poster = posterFor(post); if (poster) meta.poster = poster;
  return meta;
}
const catalogs = categories.flatMap(([id, name]) => ['movie', 'series'].map(type => ({ type, id: catalogId(id), name: `Circle FTP • ${name}`, extra: [{ name: 'search', isRequired: false }] })));
const builder = new addonBuilder({
  id: 'community.circleftp.only', version: '0.1.0', name: 'Circle FTP',
  description: 'Circle FTP catalog and streams. Requires network access to the Circle FTP API.',
  resources: ['catalog', 'meta', 'stream'], types: ['movie', 'series'], catalogs,
  idPrefixes: ['circleftp:']
});

builder.defineCatalogHandler(async ({ type, id, extra = {} }) => {
  try {
    let data;
    if (extra.search) {
      data = await api(`/api/posts?searchTerm=${encodeURIComponent(extra.search)}&order=desc`);
    } else {
      const cat = categories.find(([cid]) => catalogId(cid) === id);
      if (!cat) return { metas: [] };
      const skip = Math.max(0, Number(extra.skip || 0));
      const page = Math.floor(skip / 10) + 1;
      data = await api(`/api/posts?categoryExact=${encodeURIComponent(cat[0])}&page=${page}&order=desc&limit=10`);
    }
    const metas = (Array.isArray(data?.posts) ? data.posts : []).map(toPreview).filter(Boolean).filter(m => m.type === type);
    return { metas };
  } catch (e) { console.error('catalog:', e.message); return { metas: [] }; }
});

builder.defineMetaHandler(async ({ id }) => {
  const postId = parseId(id);
  if (!postId) return { meta: null };
  try {
    const d = await api(`/api/posts/${encodeURIComponent(postId)}`);
    const type = kind(d); if (!type) return { meta: null };
    const meta = { id: `circleftp:${d.id ?? postId}`, type, name: d.title || 'Untitled', description: d.metaData || undefined, releaseInfo: d.year ? String(d.year).match(/\d{4}/)?.[0] : undefined };
    const poster = posterFor(d); if (poster) meta.poster = poster;
    if (type === 'series') {
      meta.videos = [];
      (Array.isArray(d.content) ? d.content : []).forEach((season, si) => {
        (Array.isArray(season.episodes) ? season.episodes : []).forEach((ep, ei) => {
          const link = safeUrl(ep.link);
          if (link) meta.videos.push({ id: `circleftp:ep:${postId}:${si + 1}:${ei + 1}`, title: ep.title || `Episode ${ei + 1}`, season: si + 1, episode: ei + 1 });
        });
      });
    }
    return { meta };
  } catch (e) { console.error('meta:', e.message); return { meta: null }; }
});

builder.defineStreamHandler(async ({ id }) => {
  try {
    const episode = /^circleftp:ep:(\d+):(\d+):(\d+)$/.exec(id);
    if (episode) {
      const d = await api(`/api/posts/${episode[1]}`);
      const ep = d.content?.[Number(episode[2]) - 1]?.episodes?.[Number(episode[3]) - 1];
      const url = safeUrl(ep?.link);
      return { streams: url ? [{ url, title: 'Circle FTP' }] : [] };
    }
    const postId = parseId(id); if (!postId) return { streams: [] };
    const d = await api(`/api/posts/${encodeURIComponent(postId)}`);
    if (d.type !== 'singleVideo' && d.type !== 'singleFile') {
  return { streams: [] };
}

const url = safeUrl(d.content);
    return { streams: url ? [{ url, title: 'Circle FTP' }] : [] };
  } catch (e) { console.error('stream:', e.message); return { streams: [] }; }
});

serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Circle FTP addon listening on port ${PORT}`);
