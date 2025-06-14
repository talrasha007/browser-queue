FROM ghcr.io/puppeteer/puppeteer:latest

# USER root

# # 设置 Chrome 配置缓存目录，避免运行时报错
# ENV XDG_CONFIG_HOME=/tmp/.chromium
# ENV XDG_CACHE_HOME=/tmp/.chromium

# USER pptruser

RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

WORKDIR /app
COPY package.json bun.lock ./

RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "index.ts"]