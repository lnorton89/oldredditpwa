import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

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
