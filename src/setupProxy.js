// Dev-server only (CRA loads this for `yarn start`, never for `yarn build`).
// Proxies same-origin storage/API paths so the app works both on
// localhost:3020 and behind the ccnodes.net edge without CORS or host-specific
// URLs. Targets come from docker-compose.yml; unset means no proxy.
const http = require("http");
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  const base = process.env.PUBLIC_URL || "";
  const routes = [
    ["/storage", process.env.DEV_STORAGE_PROXY_TARGET],
    ["/api", process.env.DEV_API_PROXY_TARGET],
  ];
  for (const [path, target] of routes) {
    if (!target) continue;
    app.use(
      base + path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        // Fail fast when the target is down instead of hanging. The agent
        // timeout also covers the TCP connect, which proxyTimeout does not
        // (the host firewall silently drops SYNs to closed ports).
        agent: new http.Agent({ timeout: 15000 }),
        proxyTimeout: 15000,
        pathRewrite: { [`^${base}${path}`]: "" },
      })
    );
  }
};
