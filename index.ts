import { serve } from "bun";
import puppeteer from "puppeteer";

const queue: QueueItem[] = [];

interface QueueItem {
  ip: string;
  ua: string;
  url: string;
};

(async function () {
  const isRoot = process.getuid && process.getuid() === 0;
  const args = isRoot ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];
  while (true) {
    const item = queue.shift();
    if (item) {
      const browser = await puppeteer.launch({ 
          headless: true,
          args
        });
      const page = await browser.newPage();
      await page.setUserAgent(item.ua);
      await page.setExtraHTTPHeaders({
        'X-Forwarded-For': item.ip,
        'X-Real-IP': item.ip,
      });

      // 启用请求拦截（必须在任何 navigation 之前）
      await page.setRequestInterception(true);

      page.on('request', request => {
        const url = request.url();
        console.log('Accessing:', url);
        const hostname = new URL(url).hostname;

        // 拦截 *.google.com 和 *.apple.com 下的所有请求
        if (hostname.endsWith('google.com') || hostname.endsWith('apple.com')) {
          // 如果你想要“返回空页面”，可用 request.respond 模拟 200+空 body：
          return request.respond({
            status: 200,
            contentType: 'text/html',
            body: '<html><body></body></html>'
          });
          // 或者直接 abort，返回失败：
          // return request.abort();
        }

        // 其它请求正常继续
        request.continue();
      });

      console.log(`Consuming ${item.url} with UA ${item.ua}, IP ${item.ip}`);
      await page.goto(item.url).catch(console.error);
      await browser.close();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
})();

const server = serve({
  port: 3000,
  routes: {
    '/api/push': async (req) => {
      if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const body = await req.json() as QueueItem;
      if (body.ip && body.ua && body.url) {
        if (queue.length < 1000) {
          queue.push(body);
          return new Response('OK');
        } else {
          return new Response('Queue is full', { status: 503 });
        }
      } else {
        return new Response('Bad Request', { status: 400 });
      }
    },
  },
});

console.log(`Listening on http://localhost:${server.port}`);