import { cpSync, existsSync, mkdirSync, rmSync, watch } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceDir = path.join(projectRoot, "_locales");
const targets = [
  path.join(projectRoot, "build", "chrome-mv3-dev", "_locales"),
  path.join(projectRoot, "build", "chrome-mv3-prod", "_locales"),
];

function syncLocales() {
  if (!existsSync(sourceDir)) {
    return;
  }

  for (const targetDir of targets) {
    const parentDir = path.dirname(targetDir);

    if (!existsSync(parentDir)) {
      continue;
    }

    rmSync(targetDir, {
      force: true,
      recursive: true,
    });
    mkdirSync(targetDir, {
      recursive: true,
    });
    cpSync(sourceDir, targetDir, {
      recursive: true,
    });
  }
}

syncLocales();

if (process.argv.includes("--watch")) {
  watch(
    sourceDir,
    {
      recursive: true,
    },
    () => {
      syncLocales();
    },
  );

  setInterval(() => {
    syncLocales();
  }, 1000);
}
