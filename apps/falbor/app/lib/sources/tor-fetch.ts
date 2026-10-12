import { SocksProxyAgent } from 'socks-proxy-agent';
import * as http from 'http';
import * as https from 'https';

const TOR_HOST = process.env.TOR_SOCKS_HOST || '127.0.0.1';
const TOR_PORT = parseInt(process.env.TOR_SOCKS_PORT || '9050', 10);
const TOR_PROXY = `socks5h://${TOR_HOST}:${TOR_PORT}`;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:137.0) Gecko/20100101 Firefox/137.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export interface TorFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
}
export async function torFetch(
  url: string,
  opts: TorFetchOptions = {}
): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const { timeoutMs = 20_000, maxBytes = 1_000_000 } = opts;

  return new Promise((resolve) => {
    const agent = new SocksProxyAgent(TOR_PROXY);
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      agent,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };

    const timer = setTimeout(() => {
      req.destroy();
      resolve({ ok: false, status: 0, text: '', error: 'Timeout' });
    }, timeoutMs);

    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        chunks.push(chunk);
        if (totalBytes >= maxBytes) {
          res.destroy();
        }
      });

      res.on('end', () => {
        clearTimeout(timer);
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve({ ok: (res.statusCode ?? 0) < 400, status: res.statusCode ?? 0, text });
      });

      res.on('error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, status: 0, text: '', error: err.message });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, status: 0, text: '', error: err.message });
    });

    req.end();
  });
}
export async function isTorAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.connect(TOR_PORT, TOR_HOST, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}
