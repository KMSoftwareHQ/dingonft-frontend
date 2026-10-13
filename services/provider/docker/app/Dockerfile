FROM node:16-bullseye

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
ENTRYPOINT ["sh", "docker/app/entrypoint.sh"]
