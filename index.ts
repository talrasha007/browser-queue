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
      console.log(`Consuming ${item.url} with UA ${item.ua}, IP ${item.ip}`);
      await page.goto(item.url);
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