// Renders the calorie tracker icons to PNG with headless Chromium: node scripts/generate-calorie-icons.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright-core')); }

const here = dirname(fileURLToPath(import.meta.url));
const pub = (p) => resolve(here, '..', 'calories', 'public', p);
const svg = (r, pad) => readFileSync(pub('favicon.svg'), 'utf8')
  .replace('rx="112"', `rx="${r}"`)
  .replace('<circle', `<g transform="translate(256 256) scale(${pad}) translate(-256 -256)"><circle`)
  .replace('</svg>', '</g></svg>');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
for (const [file, size, r, pad] of [
  ['icons/icon-192.png', 192, 0, 1],
  ['icons/icon-512.png', 512, 0, 1],
  ['icons/icon-maskable-512.png', 512, 0, 0.78],
  ['apple-touch-icon.png', 180, 0, 1],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:#121214}svg{width:${size}px;height:${size}px;display:block}</style>${svg(r, pad)}`);
  await page.screenshot({ path: pub(file) });
}
await browser.close();
