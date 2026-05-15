import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const STATIC_ROOT = path.join(ROOT, 'tasting-room');
const HOST = '127.0.0.1';
const START_PORT = Number(process.env.PORT ?? 8765);

const REPORT_DIRS = {
  dry: 'out/yanislaidis/reports',
  arc: 'out/yanislaidis/arc-reports',
  live: 'out/yanislaidis/live-runs'
};

const COMMANDS = {
  validate: { command: 'npm', args: ['run', 'validate'], followup: null },
  dry: { command: 'npm', args: ['run', 'dry:yanis'], followup: 'dry' },
  arc: { command: 'npm', args: ['run', 'arc:yanis'], followup: 'arc' },
  live: { command: 'npm', args: ['run', 'live:yanis:dry'], followup: 'live' }
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      await routeApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

listenWithFallback(START_PORT);

async function routeApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'tasting-room-control' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/reports') {
    const kind = url.searchParams.get('kind') ?? 'dry';
    sendJson(res, 200, { kind, reports: await listReports(kind) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/report') {
    const reportPath = url.searchParams.get('path');
    if (!reportPath) throw new Error('Missing report path');
    const safePath = safeRelativePath(reportPath, ['out']);
    sendJson(res, 200, JSON.parse(await fs.readFile(path.join(ROOT, safePath), 'utf8')));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/curation') {
    sendJson(res, 200, await curationStatus());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/run') {
    const body = await readJson(req);
    const action = body.action;
    if (!COMMANDS[action]) throw new Error(`Unknown command action: ${action}`);
    const result = await runCommand(COMMANDS[action].command, COMMANDS[action].args);
    sendJson(res, 200, {
      action,
      followup: COMMANDS[action].followup,
      ...result
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/curate') {
    const body = await readJson(req);
    const reportPath = safeRelativePath(body.reportPath, ['out']);
    const result = await runCommand('node', ['factory/curation/curate-report.js', reportPath]);
    sendJson(res, 200, {
      action: 'curate',
      reportPath,
      ...result
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function serveStatic(req, res, url) {
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(STATIC_ROOT, safePath);
  if (!filePath.startsWith(STATIC_ROOT)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': contentType(filePath) });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendText(res, 404, 'Not found');
      return;
    }
    throw error;
  }
}

async function listReports(kind) {
  const relativeDir = REPORT_DIRS[kind];
  if (!relativeDir) throw new Error(`Unknown report kind: ${kind}`);
  const absoluteDir = path.join(ROOT, relativeDir);

  let entries = [];
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const reports = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const relativePath = path.join(relativeDir, entry.name);
      const stat = await fs.stat(path.join(ROOT, relativePath));
      return {
        name: entry.name,
        path: relativePath,
        modified_at: stat.mtime.toISOString(),
        size: stat.size
      };
    }));

  return reports.sort((left, right) => Date.parse(right.modified_at) - Date.parse(left.modified_at));
}

async function curationStatus() {
  const root = path.join(ROOT, 'characters/yanislaidis/datasets/curation');
  const routes = ['approved_candidates', 'review_queue', 'rough_candidates', 'rejected'];
  const status = {};

  for (const route of routes) {
    const dir = path.join(root, route);
    let files = [];
    try {
      files = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const jsonlFiles = files.filter((file) => file.isFile() && file.name.endsWith('.jsonl'));
    let count = 0;
    let latest = null;
    for (const file of jsonlFiles) {
      const absolutePath = path.join(dir, file.name);
      const text = await fs.readFile(absolutePath, 'utf8');
      const lines = text.split(/\r?\n/).filter(Boolean).length;
      const stat = await fs.stat(absolutePath);
      count += lines;
      if (!latest || stat.mtime > latest.mtime) {
        latest = {
          name: file.name,
          path: path.relative(ROOT, absolutePath),
          mtime: stat.mtime
        };
      }
    }

    status[route] = {
      count,
      files: jsonlFiles.length,
      latest: latest ? {
        name: latest.name,
        path: latest.path,
        modified_at: latest.mtime.toISOString()
      } : null
    };
  }

  return { character: 'yanislaidis', routes: status };
}

function safeRelativePath(input, allowedRoots) {
  if (!input || typeof input !== 'string') throw new Error('Missing path');
  const normalized = path.normalize(input).replace(/^(\.\.[/\\])+/, '');
  if (path.isAbsolute(normalized)) throw new Error('Absolute paths are not allowed');
  if (!allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}${path.sep}`))) {
    throw new Error(`Path is outside allowed roots: ${input}`);
  }
  return normalized;
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      shell: false
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        stdout,
        stderr
      });
    });
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function listenWithFallback(port) {
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < START_PORT + 20) {
      listenWithFallback(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, HOST, () => {
    console.log(`Tasting Room control server: http://${HOST}:${port}`);
  });
}
