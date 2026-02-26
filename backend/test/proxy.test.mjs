import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import zlib from 'node:zlib';

import { createProxyServer } from '../src/server.mjs';

const listen = (server) =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

test('proxy strips X-Frame-Options and rewrites root-relative links', async () => {
  const upstream = http.createServer((req, res) => {
    if (req.url === '/hello') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('x-frame-options', 'sameorigin');
      res.end('<a href="/r/test">test</a>');
      return;
    }

    res.statusCode = 404;
    res.end('nope');
  });

  const upstreamBase = await listen(upstream);
  const proxy = createProxyServer();
  const proxyBase = await listen(proxy);

  const proxiedUrl = `${proxyBase}/proxy/${upstreamBase}/hello`;
  const response = await fetch(proxiedUrl);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-frame-options'), null);
  assert.match(body, /href="\/proxy\//);

  proxy.close();
  upstream.close();
});

test('proxy rewrites redirect location to proxied path', async () => {
  const upstream = http.createServer((req, res) => {
    if (req.url === '/redirect') {
      res.statusCode = 302;
      res.setHeader('location', '/dest');
      res.end('redirecting');
      return;
    }

    res.statusCode = 200;
    res.end('ok');
  });

  const upstreamBase = await listen(upstream);
  const proxy = createProxyServer();
  const proxyBase = await listen(proxy);

  const response = await fetch(`${proxyBase}/proxy/${upstreamBase}/redirect`, { redirect: 'manual' });

  assert.equal(response.status, 302);
  assert.match(response.headers.get('location') ?? '', /\/proxy\//);

  proxy.close();
  upstream.close();
});


test('proxy normalizes content headers to avoid decoding mismatch', async () => {
  const upstream = http.createServer((req, res) => {
    res.statusCode = 200;
    const body = zlib.gzipSync('plain-body');
    res.setHeader('content-type', 'text/plain');
    res.setHeader('content-encoding', 'gzip');
    res.setHeader('content-length', String(body.length));
    res.end(body);
  });

  const upstreamBase = await listen(upstream);
  const proxy = createProxyServer();
  const proxyBase = await listen(proxy);

  const response = await fetch(`${proxyBase}/proxy/${upstreamBase}/encoding`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-encoding'), null);
  assert.equal(body, 'plain-body');

  proxy.close();
  upstream.close();
});


test('web log endpoint is acknowledged to suppress noisy client errors', async () => {
  const proxy = createProxyServer();
  const proxyBase = await listen(proxy);

  const response = await fetch(`${proxyBase}/web/log/error.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'test' })
  });

  assert.equal(response.status, 204);

  proxy.close();
});

test('api/reddit returns mapped home payload from reddit listing json', async () => {
  const upstream = http.createServer((req, res) => {
    if (req.url === '/.json') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          data: {
            children: [
              {
                data: {
                  id: 'abc123',
                  title: 'Hello Reddit',
                  subreddit_name_prefixed: 'r/test',
                  author: 'alice',
                  score: 12,
                  num_comments: 3,
                  thumbnail: 'https://example.com/thumb.png',
                  permalink: '/r/test/comments/abc123/hello_reddit/'
                }
              }
            ]
          }
        })
      );
      return;
    }

    res.statusCode = 404;
    res.end('missing');
  });

  const upstreamBase = await listen(upstream);
  const proxy = createProxyServer();
  const proxyBase = await listen(proxy);

  const response = await fetch(`${proxyBase}/api/reddit?target=${encodeURIComponent(upstreamBase + '/')}`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.view, 'home');
  assert.equal(body.payload.posts[0].id, 'abc123');

  proxy.close();
  upstream.close();
});
