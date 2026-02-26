import { createProxyServer } from './server.mjs';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';

const server = createProxyServer();

server.listen(port, host, () => {
  console.log(`Proxy listening on http://${host}:${port}`);
});
