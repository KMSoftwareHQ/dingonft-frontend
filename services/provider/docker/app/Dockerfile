FROM node:24-bookworm-slim

WORKDIR /app
RUN npm install --global npm@12.2.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .
ENTRYPOINT ["sh", "docker/app/entrypoint.sh"]
