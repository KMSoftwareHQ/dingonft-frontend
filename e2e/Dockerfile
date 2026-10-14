FROM mcr.microsoft.com/playwright:v1.64.0-noble

WORKDIR /tests
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY playwright.config.js platform.spec.js ./
CMD ["npm", "test"]
