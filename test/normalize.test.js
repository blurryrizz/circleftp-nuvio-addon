import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPosts,
  getMediaKind,
  getPostId,
  getPostTitle,
  isNumericPostId
} from "../src/circleftp/normalize.js";

test("extractPosts supports common CircleFTP response shapes", () => {
  const posts = [{ id: 1 }];
  assert.deepEqual(extractPosts({ posts }), posts);
  assert.deepEqual(extractPosts({ data: posts }), posts);
  assert.deepEqual(extractPosts(posts), posts);
  assert.deepEqual(extractPosts({}), []);
});

test("getMediaKind only accepts supported video types", () => {
  assert.equal(getMediaKind({ type: "singleVideo" }), "movie");
  assert.equal(getMediaKind({ type: "series" }), "series");
  assert.equal(getMediaKind({ type: "singleFile" }), null);
  assert.equal(getMediaKind({ type: "application" }), null);
});

test("post helpers normalize IDs and titles", () => {
  assert.equal(getPostId({ id: 42 }), "42");
  assert.equal(getPostId({}), null);
  assert.equal(getPostTitle({ title: "  Dune  " }), "Dune");
  assert.equal(getPostTitle({ title: 42 }), "");
  assert.equal(isNumericPostId("42"), true);
  assert.equal(isNumericPostId("abc"), false);
});
