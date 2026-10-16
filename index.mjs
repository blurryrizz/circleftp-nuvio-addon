import sdk from 'stremio-addon-sdk';

const { addonBuilder, serveHTTP } = sdk;

const API_BASE = (process.env.CIRCLEFTP_API_BASE || 'http://new.circleftp.net:5000').replace(/\/$/, '');
const SITE_BASE = (process.env.CIRCLEFTP_SITE_BASE || 'http://new.circleftp.net').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 7000);

const categories = [
  ['80', 'Featured'],
  ['6', 'English Movies'],
  ['9', 'English & Foreign TV Series'],
  ['22', 'Dubbed TV Series'],
  ['2', 'Hindi Movies'],
  ['5', 'Hindi TV Series'],
  ['238', 'Indian TV Show'],
  ['7', 'Hindi Dubbed Movies'],
  ['8', 'Foreign Language Movies'],
  ['3', 'South Indian Dubbed Movies'],
  ['4', 'South Indian Movies'],
  ['1', 'Animation Movies'],
  ['21', 'Anime Series'],
  ['85', 'Documentary'],
  ['15', 'WWE']
];

const catalogId = id => `circleftp_${id}`;
const parseId = id => /^circleftp:(\d+)$/.exec(id)?.[1];

async function api(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'CircleFTP-Nuvio-Stremio-Addon/0.1'
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) throw new Error(`Circle FTP API HTTP ${res.status}`);
  return res.json();
}

function safeUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;

  try {
    const url = new URL(raw, SITE_BASE);
    const host = url.hostname.toLowerCase();
    const allowedHost =
      ['circleftp.net', 'www.circleftp.net', 'new.circleftp.net'].includes(host) ||
      host.endsWith('.circleftp.net');

    if (!allowedHost || !['http:', 'https:'].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function posterFor(post) {
  const image = post.imageSm || post.image;
  if (typeof image !== 'string' || !image) return undefined;

  const imageUrl = new URL(`/uploads/${image.replace(/^\/+/, '')}`, API_BASE);
  return safeUrl(imageUrl.toString());
}

function kind(post) {
  if (post?.type === 'series') return 'series';

  // singleFile can represent APKs, games, or other non-video downloads.
  if (post?.type === 'singleVideo') return 'movie';

  return null;
}

function toPreview(post) {
  const type = kind(post);
  if (!type || post.id == null || !post.title) return null;

  const meta = { id: `circleftp:${post.id}`, type, name: post.title };
  const poster = posterFor(post);
  if (poster) meta.poster = poster;
  return meta;
}

const catalogs = categories.flatMap(([id, name]) =>
  ['movie', 'series'].map(type => ({
    type,
    id: catalogId(id),
    name: `Circle FTP • ${name}`,
    extra: [{ name: 'search', isRequired: false }]
  }))
);

const builder = new addonBuilder({
  id: 'community.circleftp.only',
  version: '0.1.0',
  name: 'Circle FTP',
  description: 'Community catalog for discovering Circle FTP entries. Only supported video and series entries are listed.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie', 'series'],
  catalogs,
  idPrefixes: ['circleftp:']
});

builder.defineCatalogHandler(async ({ type, id, extra = {} }) => {
  try {
    let data;

    if (extra.search) {
      data = await api(`/api/posts?searchTerm=${encodeURIComponent(extra.search)}&order=desc`);
    } else {
      const category = categories.find(([categoryId]) => catalogId(categoryId) === id);
      if (!category) return { metas: [] };

      const skip = Math.max(0, Number(extra.skip || 0));
      const page = Math.floor(skip / 10) + 1;
      data = await api(
        `/api/posts?categoryExact=${encodeURIComponent(category[0])}&page=${page}&order=desc&limit=10`
      );
    }

    const posts = Array.isArray(data?.posts) ? data.posts : [];
    const metas = posts.map(toPreview).filter(Boolean).filter(meta => meta.type === type);
    return { metas };
  } catch (error) {
    console.error('catalog:', error.message);
    return { metas: [] };
  }
});

builder.defineMetaHandler(async ({ id }) => {
  const postId = parseId(id);
  if (!postId) return { meta: null };

  try {
    const post = await api(`/api/posts/${encodeURIComponent(postId)}`);
    const type = kind(post);
    if (!type) return { meta: null };

    const meta = {
      id: `circleftp:${post.id ?? postId}`,
      type,
      name: post.title || 'Untitled',
      description: post.metaData || undefined,
      releaseInfo: post.year ? String(post.year).match(/\d{4}/)?.[0] : undefined
    };

    const poster = posterFor(post);
    if (poster) meta.poster = poster;

    if (type === 'series') {
      meta.videos = [];
      (Array.isArray(post.content) ? post.content : []).forEach((season, seasonIndex) => {
        (Array.isArray(season.episodes) ? season.episodes : []).forEach((episode, episodeIndex) => {
          if (!safeUrl(episode.link)) return;
          meta.videos.push({
            id: `circleftp:ep:${postId}:${seasonIndex + 1}:${episodeIndex + 1}`,
            title: episode.title || `Episode ${episodeIndex + 1}`,
            season: seasonIndex + 1,
            episode: episodeIndex + 1
          });
        });
      });
    }

    return { meta };
  } catch (error) {
    console.error('meta:', error.message);
    return { meta: null };
  }
});

builder.defineStreamHandler(async ({ id }) => {
  try {
    const episode = /^circleftp:ep:(\d+):(\d+):(\d+)$/.exec(id);

    if (episode) {
      const post = await api(`/api/posts/${encodeURIComponent(episode[1])}`);
      if (post?.type !== 'series') return { streams: [] };

      const selectedEpisode = post.content?.[Number(episode[2]) - 1]?.episodes?.[Number(episode[3]) - 1];
      const url = safeUrl(selectedEpisode?.link);
      return { streams: url ? [{ url, title: 'Circle FTP' }] : [] };
    }

    const postId = parseId(id);
    if (!postId) return { streams: [] };

    const post = await api(`/api/posts/${encodeURIComponent(postId)}`);
    if (post?.type !== 'singleVideo') return { streams: [] };

    const url = safeUrl(post.content);
    return { streams: url ? [{ url, title: 'Circle FTP' }] : [] };
  } catch (error) {
    console.error('stream:', error.message);
    return { streams: [] };
  }
});

serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Circle FTP addon listening on port ${PORT}`);
