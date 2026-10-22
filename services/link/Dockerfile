# Production image. Root compose.prod.yaml runs it behind Cloudflare.
FROM node:24.22.1-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
RUN npm install --global npm@12.2.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY app.js config.js storage.js utils.js api.js allowlist.js cloudflare-ranges.js not-found.html ./
USER node
EXPOSE 8080
ENV PORT=8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD ["node", "-e", "fetch('http://localhost:8080/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "app.js"]
