import test from "node:test";
import assert from "node:assert/strict";
import { makeCircleFtpUrl } from "../src/addon/builder.js";

test("accepts the direct index.circleftp.net video URL returned by CircleFTP", () => {
  const raw = "http://index.circleftp.net/FILE/English%20%26%20Foreign%20Dubbed%20Movies/2010/Inception.mkv";
  assert.equal(makeCircleFtpUrl(raw, "http://new.circleftp.net:5000"), raw);
});

test("rejects unrelated hosts and unsafe URL protocols", () => {
  assert.equal(makeCircleFtpUrl("https://example.com/video.mkv", "http://new.circleftp.net:5000"), null);
  assert.equal(makeCircleFtpUrl("file:///etc/passwd", "http://new.circleftp.net:5000"), null);
});
