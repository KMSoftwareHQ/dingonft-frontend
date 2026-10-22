import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const normaliseBase = (value) => {
  const path = value?.trim();
  if (!path || path === "/") {
    return "/";
  }
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
};

// Same-origin <base>/<route> -> target, so the dev server avoids CORS (the
// production Spaces buckets only allow the production origin).
const proxy = (basePath, route, target) => {
  if (!target) {
    return {};
  }
  const context = `${basePath}${route}`;
  return {
    [context]: {
      target,
      changeOrigin: true,
      timeout: 30_000,
      proxyTimeout: 30_000,
      rewrite: (path) => path.slice(context.length) || "/",
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = normaliseBase(env.BASE_PATH || "/v2/");
  const basePath = base === "/" ? "" : base.slice(0, -1);
  // Host names the dev server answers to besides localhost (e.g. an edge proxy).
  const allowedHosts = ["frontend-v2", ...(env.DEV_ALLOWED_HOSTS || "").split(",").filter(Boolean)];
  const proxyConfig = {
    ...proxy(basePath, "/storage", env.DEV_STORAGE_PROXY_TARGET),
    ...proxy(basePath, "/api", env.DEV_API_PROXY_TARGET),
  };

  return {
    base,
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      allowedHosts,
      port: 3000,
      strictPort: true,
      hmr: {
        path: `${basePath}/__vite_hmr`,
      },
      proxy: proxyConfig,
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts,
      port: 3000,
      strictPort: true,
      proxy: proxyConfig,
    },
    test: {
      environment: "node",
    },
  };
});
