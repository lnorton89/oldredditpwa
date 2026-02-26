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
const DEV_TRACKING_COOKIE = 'loid=000000000000000000.2.0; Path=/; SameSite=Lax';

const fetchFromUpstream = async (target, req) =>
  fetch(target, {
    method: req.method,
    headers: {
      'user-agent': req.headers['user-agent'] ?? 'oldredditpwa-proxy',
      accept: req.headers.accept ?? '*/*'
    },
    redirect: 'manual'
  });

const handleDefaultPathProxy = async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const target = new URL(requestUrl.pathname + requestUrl.search, DEFAULT_TARGET_URL);
    const upstream = await fetchFromUpstream(target, req);

    copyHeaders(upstream.headers, res, target.origin);
    const body = await readBody(upstream);
    res.statusCode = upstream.status;
    res.end(body);
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Path proxy request failed.',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    );
  }
};

const getView = (pathname, forced) => {
  if (forced === 'home' || forced === 'post') {
    return forced;
  }

  return pathname.includes('/comments/') ? 'post' : 'home';
};

const appendJsonPath = (target) => {
  const next = new URL(target.toString());

  if (next.pathname.endsWith('.json')) {
    return next;
  }

  next.pathname = `${next.pathname.replace(/\/$/, '')}.json`;
  return next;
};

const mapListingPosts = (children) =>
  children
    .map(({ data }) => ({
      id: data.id,
      title: data.title,
      subreddit: data.subreddit_name_prefixed,
      author: data.author,
      score: data.score,
      comments: data.num_comments,
      thumbnail: data.thumbnail && data.thumbnail.startsWith('http') ? data.thumbnail : null,
      permalink: `https://old.reddit.com${data.permalink}`
    }))
    .filter((post) => Boolean(post.id));

const mapPostPayload = (payload) => {
  const postData = payload?.[0]?.data?.children?.[0]?.data;
  const comments = payload?.[1]?.data?.children ?? [];

  return {
    id: postData?.id ?? 'unknown',
    title: postData?.title ?? 'Untitled',
    body: postData?.selftext ?? '',
    subreddit: postData?.subreddit_name_prefixed ?? '',
    author: postData?.author ?? '',
    score: postData?.score ?? 0,
    permalink: postData?.permalink ? `https://old.reddit.com${postData.permalink}` : null,
    comments: comments
      .filter((entry) => entry.kind === 't1' && entry.data)
      .slice(0, 30)
      .map((entry) => ({
        id: entry.data.id,
        author: entry.data.author,
        body: entry.data.body ?? '',
        score: entry.data.score ?? 0
      }))
  };
};

const handleApiReddit = async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const targetParam = requestUrl.searchParams.get('target') ?? DEFAULT_TARGET;
    const target = normalizeTarget(targetParam);
    const view = getView(target.pathname, requestUrl.searchParams.get('view'));
    const jsonTarget = appendJsonPath(target);

    const upstream = await fetch(jsonTarget, {
      headers: {
        'user-agent': req.headers['user-agent'] ?? 'oldredditpwa-api',
        accept: 'application/json'
      }
    });

    const json = await upstream.json();

    const payload =
      view === 'post'
        ? mapPostPayload(json)
        : {
          posts: mapListingPosts(json?.data?.children ?? [])
        };

    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        view,
        target: target.toString(),
        payload
      })
    );
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Failed to build reddit view payload.',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    );
  }
};

const handleProxy = async (req, res) => {
  const rawTarget = req.url.replace(/^\/proxy\/?/, '');

  try {
    const target = normalizeTarget(rawTarget);
    const upstream = await fetchFromUpstream(target, req);

    copyHeaders(upstream.headers, res, target.origin);

    const body = await readBody(upstream);
    const contentType = upstream.headers.get('content-type') ?? '';

    if (isHtmlResponse(contentType)) {
      const rewritten = rewriteHtml(body.toString('utf8'), target.origin);
      res.statusCode = upstream.status;
      res.setHeader('set-cookie', DEV_TRACKING_COOKIE);
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

    if (url.startsWith('/api/reddit')) {
      await handleApiReddit(req, res);
      return;
    }

    if (url.startsWith('/proxy')) {
      await handleProxy(req, res);
      return;
    }

    if (url.startsWith('/web/log/')) {
      res.statusCode = 204;
      res.setHeader('access-control-allow-origin', '*');
      res.end();
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
