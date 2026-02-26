import http from 'node:http';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const NORMALIZE_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length']);

const BLOCKING_HEADERS = new Set(['x-frame-options', 'content-security-policy']);

const DEFAULT_TARGET = 'https://old.reddit.com';

const isHtmlResponse = (contentType) => (contentType ?? '').toLowerCase().includes('text/html');

const encodeProxyUrl = (targetUrl) => `/proxy/${targetUrl}`;

const normalizeTarget = (rawTarget) => {
  const value = decodeURIComponent(rawTarget ?? '').trim() || DEFAULT_TARGET;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP(S) URLs are supported.');
  }

  return parsed;
};

const rewriteHtml = (html, targetOrigin) => {
  const escapedOrigin = targetOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const originPattern = new RegExp(`(["'])${escapedOrigin}`, 'gi');

  return html
    .replace(/\b(href|src|action)="\/(?!\/)/gi, '$1="/proxy/' + targetOrigin + '/')
    .replace(originPattern, `$1/proxy/${targetOrigin}`)
    .replace(/\bcontent="\/(?!\/)/gi, 'content="/proxy/' + targetOrigin + '/');
};

const copyHeaders = (upstreamHeaders, res, targetOrigin) => {
  for (const [header, value] of upstreamHeaders.entries()) {
    const lower = header.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower) || BLOCKING_HEADERS.has(lower) || NORMALIZE_RESPONSE_HEADERS.has(lower)) {
      continue;
    }

    if (lower === 'location' && value) {
      try {
        const redirected = new URL(value, targetOrigin).toString();
        res.setHeader(header, encodeProxyUrl(redirected));
        continue;
      } catch {
        // fall through to setting raw header
      }
    }

    res.setHeader(header, value);
  }
};

const readBody = async (response) => Buffer.from(await response.arrayBuffer());


const DEFAULT_TARGET_URL = new URL(DEFAULT_TARGET);

const handleDefaultPathProxy = async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const target = new URL(requestUrl.pathname + requestUrl.search, DEFAULT_TARGET_URL);
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'user-agent': req.headers['user-agent'] ?? 'oldredditpwa-proxy',
        accept: req.headers.accept ?? '*/*'
      },
      redirect: 'manual'
    });

    copyHeaders(upstream.headers, res, target.origin);
    const body = await readBody(upstream);
    res.statusCode = upstream.status;
    res.end(body);
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Path proxy request failed.', details: error instanceof Error ? error.message : 'Unknown error' }));
  }
};

const handleProxy = async (req, res) => {
  const rawTarget = req.url.replace(/^\/proxy\/?/, '');

  try {
    const target = normalizeTarget(rawTarget);
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'user-agent': req.headers['user-agent'] ?? 'oldredditpwa-proxy',
        accept: req.headers.accept ?? '*/*'
      },
      redirect: 'manual'
    });

    copyHeaders(upstream.headers, res, target.origin);

    const body = await readBody(upstream);
    const contentType = upstream.headers.get('content-type') ?? '';

    if (isHtmlResponse(contentType)) {
      const rewritten = rewriteHtml(body.toString('utf8'), target.origin);
      res.statusCode = upstream.status;
      res.setHeader('content-length', Buffer.byteLength(rewritten));
      res.end(rewritten);
      return;
    }

    res.statusCode = upstream.status;
    res.end(body);
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Invalid or unreachable target URL.',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    );
  }
};

export const createProxyServer = () =>
  http.createServer(async (req, res) => {
    const url = req.url ?? '/';

    if (url === '/healthz') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
      res.setHeader('access-control-allow-headers', 'content-type');
      res.end();
      return;
    }

    if (url.startsWith('/proxy')) {
      await handleProxy(req, res);
      return;
    }

    if (url.startsWith('/web/')) {
      await handleDefaultPathProxy(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  });
