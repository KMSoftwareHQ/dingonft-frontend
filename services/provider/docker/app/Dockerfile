FROM node:24.22.1-bookworm-slim

WORKDIR /app
RUN npm install --global npm@12.2.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .
RUN mkdir -p /settings && chown node:node /settings
ENV NODE_ENV=production
USER node
ENTRYPOINT ["sh", "docker/app/entrypoint.sh"]
