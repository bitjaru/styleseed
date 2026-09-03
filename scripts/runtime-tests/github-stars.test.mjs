import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchGitHubStars,
  GITHUB_STARS_REVALIDATE_SECONDS,
} from "../../demo-pricing/lib/github-stars.mjs";

test("GitHub star loader returns a valid non-negative count", async () => {
  let request;
  const stars = await fetchGitHubStars(async (...args) => {
    request = args;
    return {
      ok: true,
      json: async () => ({ stargazers_count: 1234 }),
    };
  });

  assert.equal(stars, 1234);
  assert.equal(request[0], "https://api.github.com/repos/bitjaru/styleseed");
  assert.equal(request[1].headers["User-Agent"], "styleseed-demo");
  assert.equal(request[1].next.revalidate, GITHUB_STARS_REVALIDATE_SECONDS);
});

test("GitHub star loader degrades non-success responses to null", async () => {
  const stars = await fetchGitHubStars(async () => ({ ok: false, status: 503 }));
  assert.equal(stars, null);
});

test("GitHub star loader rejects malformed counts", async () => {
  for (const stargazers_count of ["1234", -1, 1.5, Number.NaN, null]) {
    const stars = await fetchGitHubStars(async () => ({
      ok: true,
      json: async () => ({ stargazers_count }),
    }));
    assert.equal(stars, null);
  }
});

test("GitHub star loader degrades network and JSON failures to null", async () => {
  assert.equal(await fetchGitHubStars(async () => { throw new Error("offline"); }), null);
  assert.equal(await fetchGitHubStars(async () => ({
    ok: true,
    json: async () => { throw new Error("invalid JSON"); },
  })), null);
});
