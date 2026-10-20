# Habit Tracker Pro

A pastel, spreadsheet-inspired habit planner built as an installable, offline-first Progressive Web App.

- **Today**: greeting, completion ring, daily habits with streaks, mood check-in, water and sleep, reflection preview, quick actions
- **Calendar**: monthly habit spreadsheet with a daily completion bar chart, sticky habit names, tap-to-toggle cells, per-habit statistics and a heatmap
- **Insights**: five progress rings, data-backed observations, statistics, daily, weekly, category, distribution, heatmap and streak charts, plus mood, sleep and water dashboards
- **Journal**: every daily reflection as a timeline, a calendar view, search, reflection stats and a favorites-enabled reminder collection
- **Goals**: weekly and monthly goals with progress, deadlines, categories and history
- **Daily reflection**: shown on the first open of each local calendar day (three gratitudes, two personal reminders, a final note), with drafts saved automatically and a temporary bypass

All data stays on your device: IndexedDB holds the records and localStorage holds preferences. There's no backend and no login.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run icons      # regenerate icons/splash screens (needs Chromium; set CHROMIUM_PATH)
```

Stack: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide, `idb`, `vite-plugin-pwa` (Workbox).

## Deploy

The build is static. Set `BASE_PATH` to the URL path the app will be served from; it must start and end with `/`.

**GitHub Pages (included workflow):**

1. Push to `main`.
2. In the repo settings, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. `.github/workflows/deploy.yml` builds with `BASE_PATH=/<repo-name>/` and publishes to `https://<user>.github.io/<repo-name>/`.

**Netlify, Vercel, Cloudflare Pages or any root domain:** run `npm run build` (the default `BASE_PATH` is `/`) and publish `dist/`.

The service worker needs HTTPS, which all of these hosts provide. The app has a single route, so reloads always work.

## Install on iPhone

1. Open the deployed URL in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch it from the Home Screen. It runs full-screen with its own icon and splash screen, and it works offline after the first load.

## Notes and limitations

- **Back up your data.** Data is local to this browser or installed app. Clearing website data or deleting the Home Screen app can erase it. Go to Settings → Your data to export JSON (re-importable, validated on import) or CSV.
- **Reminders.** Without a push server, reminders fire only while the app is open or recently active. They use system notifications where permitted (on iOS 16.4+, this requires installing the app to the Home Screen) and fall back to in-app messages otherwise.
- **Demo data.** The demo lives in a separate IndexedDB database and never mixes with your records. A banner shows whenever it's active.
- **Dates.** All tracking uses local calendar days. Day arithmetic is done on calendar dates, so daylight-saving changes never break streaks.
