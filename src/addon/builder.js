import sdk from "stremio-addon-sdk";
const { addonBuilder } = sdk;
import { createManifest } from "./manifest.js";
import { extractPosts, getMediaKind, getPostDescription, getPostId, getPostTitle, getPostYear } from "../circleftp/normalize.js";

export function makeCircleFtpUrl(raw, apiBase) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw, apiBase);
    const host = url.hostname.toLowerCase();
    const allowed = host === "circleftp.net" || host.endsWith(".circleftp.net");
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function preview(post, requestedType, apiBase) {
  const type = getMediaKind(post);
  const id = getPostId(post);
  const name = getPostTitle(post);
  if (!id || !name || type !== requestedType) return null;
  const meta = { id: `circleftp:${id}`, type, name };
  const posterName = post.imageSm || post.image;
  if (typeof posterName === "string" && posterName.trim()) {
    const poster = makeCircleFtpUrl(new URL(`uploads/${posterName.replace(/^\/+/, "")}`, apiBase.endsWith("/") ? apiBase : `${apiBase}/`).toString(), apiBase);
    if (poster) meta.poster = poster;
  }
  return meta;
}

function parsePostId(id) {
  const match = /^circleftp:(\d+)$/.exec(String(id));
  return match?.[1] ?? null;
}

function buildSeriesVideos(post, postId, apiBase) {
  const videos = [];
  const seasons = Array.isArray(post.content) ? post.content : [];
  seasons.forEach((season, seasonIndex) => {
    const episodes = Array.isArray(season?.episodes) ? season.episodes : [];
    episodes.forEach((episode, episodeIndex) => {
      if (!makeCircleFtpUrl(episode?.link, apiBase)) return;
      videos.push({
        id: `circleftp:ep:${postId}:${seasonIndex + 1}:${episodeIndex + 1}`,
        title: episode?.title || `Episode ${episodeIndex + 1}`,
        season: seasonIndex + 1,
        episode: episodeIndex + 1
      });
    });
  });
  return videos;
}

export function createAddon({ config, client, logger = console }) {
  const builder = new addonBuilder(createManifest(config));

  builder.defineCatalogHandler(async ({ type, extra = {} }) => {
    const search = typeof extra.search === "string" ? extra.search.trim() : "";
    if (!search) return { metas: [] };

    try {
      const payload = await client.searchPosts(search);
      const metas = extractPosts(payload)
        .map(post => preview(post, type, config.apiBase))
        .filter(Boolean);
      return { metas };
    } catch (error) {
      logger.error("CircleFTP catalog request failed:", error.message);
      return { metas: [] };
    }
  });

  builder.defineMetaHandler(async ({ id }) => {
    const postId = parsePostId(id);
    if (!postId) return { meta: null };

    try {
      const post = await client.getPost(postId);
      const type = getMediaKind(post);
      if (!type) return { meta: null };

      const meta = {
        id: `circleftp:${postId}`,
        type,
        name: getPostTitle(post) || "Untitled",
        description: getPostDescription(post),
        releaseInfo: getPostYear(post)
      };

      const posterName = post.imageSm || post.image;
      if (typeof posterName === "string" && posterName.trim()) {
        const posterUrl = new URL(`uploads/${posterName.replace(/^\/+/, "")}`, config.apiBase.endsWith("/") ? config.apiBase : `${config.apiBase}/`).toString();
        const poster = makeCircleFtpUrl(posterUrl, config.apiBase);
        if (poster) meta.poster = poster;
      }

      if (type === "series") meta.videos = buildSeriesVideos(post, postId, config.apiBase);
      return { meta };
    } catch (error) {
      logger.error("CircleFTP metadata request failed:", error.message);
      return { meta: null };
    }
  });

  builder.defineStreamHandler(async ({ id }) => {
    try {
      const episode = /^circleftp:ep:(\d+):(\d+):(\d+)$/.exec(String(id));
      if (episode) {
        const [, postId, seasonNo, episodeNo] = episode;
        const post = await client.getPost(postId);
        if (getMediaKind(post) !== "series") return { streams: [] };
        const selected = post.content?.[Number(seasonNo) - 1]?.episodes?.[Number(episodeNo) - 1];
        const url = makeCircleFtpUrl(selected?.link, config.apiBase);
        return { streams: url ? [{ name: "CircleFTP", title: selected?.title || "Play", url, behaviorHints: { notWebReady: true } }] : [] };
      }

      const postId = parsePostId(id);
      if (!postId) return { streams: [] };
      const post = await client.getPost(postId);
      if (getMediaKind(post) !== "movie") return { streams: [] };
      const url = makeCircleFtpUrl(post.content, config.apiBase);
      return { streams: url ? [{ name: "CircleFTP", title: getPostTitle(post) || "Play", url, behaviorHints: { notWebReady: true } }] : [] };
    } catch (error) {
      logger.error("CircleFTP stream request failed:", error.message);
      return { streams: [] };
    }
  });

  return builder;
}
