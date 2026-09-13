#!/usr/bin/env node
/**
 * Wait until cloudflared prints a Quick Tunnel URL.
 * Usage: FORD_DOCKER="docker" node demo/wait-tunnel.mjs
 */
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const docker = process.env.FORD_DOCKER || 'docker';
const timeoutSec = Number(process.env.FORD_TUNNEL_TIMEOUT || 45);
const container = process.env.FORD_TUNNEL_CONTAINER || 'ford-demo-tunnel';
const pattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function readLogs() {
  const parts = docker.trim().split(/\s+/).filter(Boolean);
  const result = spawnSync(parts[0], [...parts.slice(1), 'logs', container], {
    encoding: 'utf8',
  });
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

for (let i = 0; i < timeoutSec; i++) {
  const match = readLogs().match(pattern);
  if (match) {
    process.stdout.write(match[0]);
    process.exit(0);
  }
  await delay(1000);
}

process.exit(1);
