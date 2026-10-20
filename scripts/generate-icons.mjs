// Renders the app icon and iOS splash screens to PNG with headless Chromium.
// Usage: npm run icons   (set CHROMIUM_PATH if Chromium lives elsewhere)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => resolve(root, 'public', p);

// Icon: a tiny pastel habit grid with a blossom — the app in one glance.
export function iconSvg({ padding = 0 } = {}) {
  const colors = [
    ['#f2a9b4', '#fbe1e4', '#f2a9b4'],
    ['#f6b48c', '#f6b48c', '#fde6d6'],
    ['#a9cc9f', '#a9cc9f', '#a9cc9f'],
  ];
  const s = 512;
  const inner = s - padding * 2;
  const k = inner / 512;
  const cell = 92;
  const gap = 18;
  const x0 = 256 - (cell * 3 + gap * 2) / 2;
  const y0 = 150;
  let cells = '';
  colors.forEach((row, r) =>
    row.forEach((c, i) => {
      const x = x0 + i * (cell + gap);
      const y = y0 + r * (cell + gap);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="24" fill="${c}"/>`;
      if (c !== '#fbe1e4' && c !== '#fde6d6') {
        cells += `<path d="M${x + 28} ${y + 48} l14 14 l26 -30" stroke="#ffffff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    }),
  );
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="400" cy="92" rx="24" ry="34" fill="#bea9e3" transform="rotate(${a} 400 128)"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#fbf7f0"/>
  <g transform="translate(${padding} ${padding}) scale(${k})">
    <g opacity="0.55" stroke="#e9e0d3" stroke-width="2">
      ${Array.from({ length: 15 }, (_, i) => `<line x1="0" y1="${i * 36 + 12}" x2="512" y2="${i * 36 + 12}"/>`).join('')}
    </g>
    <rect x="${x0 - 26}" y="${y0 - 70}" width="${cell * 3 + gap * 2 + 52}" height="${cell * 3 + gap * 2 + 100}" rx="44" fill="#fffdf9" stroke="#e9e0d3" stroke-width="4"/>
    <rect x="${x0}" y="${y0 - 44}" width="120" height="14" rx="7" fill="#c4def4"/>
    <rect x="${x0 + 132}" y="${y0 - 44}" width="60" height="14" rx="7" fill="#fdf3cc"/>
    ${cells}
    ${petals}
    <circle cx="400" cy="128" r="17" fill="#f1d475"/>
  </g>
</svg>`;
}

const SPLASH = [
  [1320, 2868, 440, 956, 3],
  [1206, 2622, 402, 874, 3],
  [1290, 2796, 430, 932, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1080, 2340, 360, 780, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2],
  [750, 1334, 375, 667, 2],
];

function splashHtml(w, h, dark) {
  const bg = dark ? '#1a1716' : '#fbf7f0';
  const ink = dark ? '#eee6de' : '#3d342f';
  const icon = Buffer.from(iconSvg()).toString('base64');
  const size = Math.round(w * 0.28);
  return `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif">
  <img src="data:image/svg+xml;base64,${icon}" style="width:${size}px;height:${size}px;border-radius:${size * 0.23}px;box-shadow:0 ${w * 0.01}px ${w * 0.04}px rgba(110,84,66,.18)"/>
  <div style="margin-top:${w * 0.05}px;font-size:${w * 0.058}px;font-weight:600;color:${ink};letter-spacing:-0.01em">Habit Tracker Pro</div>
  <div style="margin-top:${w * 0.015}px;font-size:${w * 0.032}px;font-style:italic;color:#a59886">make today count</div>
  </body></html>`;
}

export const splashLinks = () =>
  SPLASH.map(
    ([w, h, dw, dh, r]) =>
      `<link rel="apple-touch-startup-image" media="(device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="%BASE_URL%splash/splash-${w}x${h}.png" />`,
  ).join('\n    ');

async function main() {
  mkdirSync(pub('icons'), { recursive: true });
  mkdirSync(pub('splash'), { recursive: true });
  writeFileSync(pub('favicon.svg'), iconSvg());
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const shot = async (html, w, h, out) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  };
  const iconPage = (svg, size) => `<html><body style="margin:0"><div style="width:${size}px;height:${size}px">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</div></body></html>`;
  await shot(iconPage(iconSvg(), 512), 512, 512, pub('icons/icon-512.png'));
  await shot(iconPage(iconSvg(), 192), 192, 192, pub('icons/icon-192.png'));
  await shot(iconPage(iconSvg({ padding: 56 }), 512), 512, 512, pub('icons/icon-maskable-512.png'));
  await shot(iconPage(iconSvg(), 180), 180, 180, pub('apple-touch-icon.png'));
  for (const [w, h] of SPLASH) await shot(splashHtml(w, h, false), w, h, pub(`splash/splash-${w}x${h}.png`));
  await browser.close();
  console.log(splashLinks());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
