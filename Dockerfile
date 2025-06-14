FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# 设置 Chrome 配置缓存目录，避免运行时报错
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

RUN apt-get update && apt-get install -y curl unzip
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app
COPY package.json bun.lock ./

RUN bun install

COPY . .

USER pptruser

EXPOSE 3000

CMD ["bun", "index.ts"]