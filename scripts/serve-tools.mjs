import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createServer } from 'node:http';

const toolsDir = resolve(process.cwd(), 'tools');
const port = Number.parseInt(process.env.PORT ?? '8080', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const send = (response, statusCode, body, contentType = 'text/plain; charset=utf-8') => {
  response.writeHead(statusCode, { 'Content-Type': contentType });
  response.end(body);
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const resolvedPath = resolve(toolsDir, `.${normalize(requestPath)}`);

  if (!resolvedPath.startsWith(toolsDir)) {
    send(response, 403, 'Forbidden');
    return;
  }

  let filePath = resolvedPath;

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    send(response, 404, 'Not Found');
    return;
  }

  const contentType = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Serving ${toolsDir} at http://localhost:${port}`);
});
