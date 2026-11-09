export function extractPosts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function getMediaKind(post) {
  if (post?.type === "singleVideo") return "movie";
  if (post?.type === "series") return "series";
  return null;
}

export function getPostId(post) {
  return post?.id == null ? null : String(post.id);
}

// CircleFTP's "name" is the clean display title; "title" often includes
// release details such as year, resolution, and audio format.
export function getPostTitle(post) {
  for (const value of [post?.name, post?.title]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function getPostDescription(post) {
  return typeof post?.metaData === "string" && post.metaData.trim()
    ? post.metaData.trim()
    : undefined;
}

export function getPostYear(post) {
  const match = String(post?.year ?? post?.title ?? "").match(/\b(19|20)\d{2}\b/);
  return match?.[0];
}

export function isNumericPostId(value) {
  return /^\d+$/.test(String(value));
}
