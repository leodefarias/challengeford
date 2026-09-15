#!/usr/bin/env node
/**
 * Wait until cloudflared prints a Quick Tunnel URL that actually answers.
 * trycloudflare.com can print a URL after API register even when port 7844
 * is blocked — that yields Cloudflare 530 / Error 1033 on the phone.
 * Usage: FORD_DOCKER="docker" node demo/wait-tunnel.mjs
 */
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const docker = process.env.FORD_DOCKER || 'docker';
const timeoutSec = Number(process.env.FORD_TUNNEL_TIMEOUT || 20);
const container = process.env.FORD_TUNNEL_CONTAINER || 'ford-demo-tunnel';
const pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;

function readLogs() {
  const parts = docker.trim().split(/\s+/).filter(Boolean);
  const result = spawnSync(parts[0], [...parts.slice(1), 'logs', container], {
    encoding: 'utf8',
  });
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function lastUrl(text) {
  const matches = text.match(pattern);
  return matches ? matches[matches.length - 1] : '';
}

async function isLive(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'ford-demo-tunnel-check' },
    });
    if (res.status === 530 || res.status === 1033) return false;
    const body = await res.text();
    if (/error 1033|cloudflare tunnel error/i.test(body)) return false;
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

for (let i = 0; i < timeoutSec; i++) {
  const url = lastUrl(readLogs());
  if (url && (await isLive(url))) {
    process.stdout.write(url);
    process.exit(0);
  }
  await delay(1000);
}

process.exit(1);
