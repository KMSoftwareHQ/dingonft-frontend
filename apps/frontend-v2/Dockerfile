# Production image: static Vite build served by nginx under BASE_PATH (/v2/).
# The link service in front of it fills the Open Graph placeholders in index.html.
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@12.2.0
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG BASE_PATH=/v2/
ARG VITE_API_URL=/api
ARG VITE_STORAGE_BASE=
ARG VITE_STORAGE_BUCKET_PREFIX=dingo-nftc-0-
ENV BASE_PATH=$BASE_PATH \
    VITE_API_URL=$VITE_API_URL \
    VITE_STORAGE_BASE=$VITE_STORAGE_BASE \
    VITE_STORAGE_BUCKET_PREFIX=$VITE_STORAGE_BUCKET_PREFIX
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/v2
EXPOSE 8080
