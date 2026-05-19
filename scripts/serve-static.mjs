import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const DEFAULT_PORT = 3311;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const directoryArgument = process.argv[2];
const portArgument = Number.parseInt(process.argv[3] ?? "", 10);

if (!directoryArgument) {
  console.error("Usage: node scripts/serve-static.mjs <directory> [port]");
  process.exit(1);
}

const rootDirectory = resolve(process.cwd(), directoryArgument);
const port = Number.isNaN(portArgument) ? DEFAULT_PORT : portArgument;

function resolveFilePath(urlPathname) {
  const normalizedPath = normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.[/\\])+/, "");
  const candidatePath = join(rootDirectory, normalizedPath);

  if (existsSync(candidatePath) && statSync(candidatePath).isDirectory()) {
    return join(candidatePath, "index.html");
  }

  return candidatePath;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const pathname = requestUrl.pathname === "/" ? "/popup.html" : requestUrl.pathname;
  const filePath = resolveFilePath(pathname);

  if (
    !filePath.startsWith(rootDirectory) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404: Not Found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.info(`Serving ${rootDirectory} at http://127.0.0.1:${port}`);
});
