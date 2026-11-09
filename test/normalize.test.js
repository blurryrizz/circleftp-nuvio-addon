import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPosts,
  getMediaKind,
  getPostDescription,
  getPostId,
  getPostTitle,
  getPostYear,
  isNumericPostId
} from "../src/circleftp/normalize.js";

test("extractPosts supports CircleFTP's posts response", () => {
  const posts = [{ id: 98217 }];
  assert.deepEqual(extractPosts({ posts }), posts);
  assert.deepEqual(extractPosts({ data: posts }), posts);
  assert.deepEqual(extractPosts(posts), posts);
  assert.deepEqual(extractPosts({}), []);
});

test("normalizes a real CircleFTP singleVideo search result", () => {
  const post = {
    id: 98217,
    title: "Inception (2010) 1080p BluRay Dual Audio",
    type: "singleVideo",
    metaData: "A thief who steals corporate secrets.",
    name: "Inception",
    year: "2010",
    quality: "1080p BluRay Hin+Eng",
    imageSm: "poster.jpeg"
  };
  assert.equal(getPostId(post), "98217");
  assert.equal(getMediaKind(post), "movie");
  assert.equal(getPostTitle(post), "Inception");
  assert.equal(getPostDescription(post), "A thief who steals corporate secrets.");
  assert.equal(getPostYear(post), "2010");
});

test("getMediaKind ignores unsupported post types", () => {
  assert.equal(getMediaKind({ type: "singleVideo" }), "movie");
  assert.equal(getMediaKind({ type: "series" }), "series");
  assert.equal(getMediaKind({ type: "singleFile" }), null);
  assert.equal(getMediaKind({ type: "application" }), null);
});

test("title and year helpers fall back safely", () => {
  assert.equal(getPostTitle({ title: "  Dune  " }), "Dune");
  assert.equal(getPostTitle({}), "");
  assert.equal(getPostYear({ title: "Dune (2021) 1080p" }), "2021");
  assert.equal(getPostYear({}), undefined);
  assert.equal(isNumericPostId("42"), true);
  assert.equal(isNumericPostId("abc"), false);
});

