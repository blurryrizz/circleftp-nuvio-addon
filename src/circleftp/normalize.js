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

export function getPostTitle(post) {
  return typeof post?.title === "string" ? post.title.trim() : "";
}

export function isNumericPostId(value) {
  return /^\d+$/.test(String(value));
}
