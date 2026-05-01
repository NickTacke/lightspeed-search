#!/usr/bin/env bun
// Event-driven regenerator: watches openapi.json (written by the api on
// startup/hot-reload) and runs openapi-ts once per actual change.
// Replaces hey-api's `--watch` which fires unconditionally on a polling loop.
import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const targetFile = resolve(pkgRoot, "openapi.json");

let lastHash = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;

async function regenerate(reason: string) {
  if (running) return;
  if (!existsSync(targetFile)) return;
  const content = await Bun.file(targetFile).text();
  const hasher = new Bun.CryptoHasher("sha1");
  const hash = hasher.update(content).digest("hex");
  if (hash === lastHash) return;
  lastHash = hash;
  running = true;
  console.log(`→ regenerating client (${reason})`);
  const child = spawn("bunx", ["openapi-ts"], { cwd: pkgRoot, stdio: "inherit" });
  child.on("exit", () => {
    running = false;
  });
}

// Wait for the api to write openapi.json before initial regen.
const initialPoll = setInterval(async () => {
  if (existsSync(targetFile)) {
    clearInterval(initialPoll);
    await regenerate("initial");
  }
}, 250);

// fs.watch on the directory survives the file being recreated.
watch(pkgRoot, { persistent: true }, (event, filename) => {
  if (filename !== "openapi.json") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => regenerate("openapi.json changed"), 200);
});
