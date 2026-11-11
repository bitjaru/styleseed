// Start the built demo (demo-pricing/.next) with `next start` on a free local port, for scripts that
// measure our own pages (calibrate-render-faults.mjs). Returns { baseUrl, stop }. Nothing is built
// here: when the build is missing it fails and names the command that builds it.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOST = "127.0.0.1";
const sleep = (ms) => new Promise((done) => { setTimeout(done, ms); });

async function freePort() {
  const probe = createServer();
  probe.listen(0, HOST);
  await once(probe, "listening");
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("demo-server: could not allocate a local port");
  await new Promise((done, fail) => { probe.close((error) => (error ? fail(error) : done())); });
  return address.port;
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), sleep(5000)]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

export async function startDemoServer({ appRoot = join(repoRoot, "demo-pricing"), timeout = 60000 } = {}) {
  if (!existsSync(join(appRoot, ".next"))) throw new Error(`${join(appRoot, ".next").split("\\").join("/")} is missing: build the demo first: node scripts/verify-repo.mjs`);
  const nextBin = join(appRoot, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin)) throw new Error(`${nextBin.split("\\").join("/")} is missing: demo-pricing/node_modules must be installed (npm ci --prefix demo-pricing)`);
  const port = await freePort();
  const baseUrl = `http://${HOST}:${port}`;
  const output = [];
  const child = spawn(process.execPath, [nextBin, "start", "--hostname", HOST, "--port", String(port)], {
    cwd: appRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const remember = (chunk) => { output.push(String(chunk)); if (output.length > 40) output.splice(0, output.length - 40); };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  const deadline = Date.now() + timeout;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`next start exited (${child.exitCode}) before answering:\n${output.join("")}`);
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) break;
    } catch {
      // still starting
    }
    if (Date.now() > deadline) { await stopChild(child); throw new Error(`next start did not answer on ${baseUrl} within ${timeout}ms:\n${output.join("")}`); }
    await sleep(250);
  }
  return { baseUrl, stop: () => stopChild(child) };
}
