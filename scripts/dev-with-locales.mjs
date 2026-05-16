import { spawn } from "node:child_process";

const child = spawn("pnpm", ["exec", "plasmo", "dev"], {
  shell: true,
  stdio: "inherit",
});

const watcher = spawn("node", ["scripts/sync-locales.mjs", "--watch"], {
  shell: true,
  stdio: "inherit",
});

function shutdown(code = 0) {
  child.kill("SIGTERM");
  watcher.kill("SIGTERM");
  process.exit(code);
}

child.on("exit", (code) => {
  watcher.kill("SIGTERM");
  process.exit(code ?? 0);
});

watcher.on("exit", (code) => {
  child.kill("SIGTERM");
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  shutdown(0);
});

process.on("SIGTERM", () => {
  shutdown(0);
});
