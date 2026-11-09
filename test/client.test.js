import test from "node:test";
import assert from "node:assert/strict";
import { CircleFtpClient } from "../src/circleftp/client.js";

test("searchPosts calls the CircleFTP posts endpoint with query parameters", async () => {
  let requestedUrl;
  const client = new CircleFtpClient({
    baseUrl: "http://new.circleftp.net:5000",
    fetchImpl: async url => {
      requestedUrl = new URL(url);
      return { ok: true, json: async () => ({ posts: [] }) };
    }
  });
  await client.searchPosts("The Matrix");
  assert.equal(requestedUrl.pathname, "/api/posts");
  assert.equal(requestedUrl.searchParams.get("searchTerm"), "The Matrix");
  assert.equal(requestedUrl.searchParams.get("order"), "desc");
});

test("getPost rejects non-numeric IDs before making a request", async () => {
  const client = new CircleFtpClient({
    baseUrl: "http://new.circleftp.net:5000",
    fetchImpl: async () => { throw new Error("should not be called"); }
  });
  assert.throws(() => client.getPost("abc"), /numeric/);
});
