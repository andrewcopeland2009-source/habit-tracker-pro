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

---

# Calories

A private calorie and macro tracker in `calories/`. It has no accounts and no network calls, and all data stays on this device. It's built from the same toolchain as the habit tracker and ships as its own installable PWA at `<site>/calories/`. On GitHub Pages that's `https://<user>.github.io/<repo-name>/calories/`.

- **Today**: animated calorie ring (remaining / over), protein, carbs and fat bars, and Breakfast, Lunch, Dinner and Snacks cards. Tap an entry to change its portion, meal, nutrition, or delete it (with undo). The ••• menu on a meal can copy that meal from the previous day or save it as a custom meal.
- **Logging**: the + button picks the meal slot from the time of day. Search your saved foods and tap + to log one serving instantly, or tap the row to choose a portion. Foods with a weight serving ("100 g") take a weight. Type a number such as `450` to quick-add calories. Every food you log is remembered automatically and ranked by how often and how recently you use it. Star a food to pin it.
- **Library**: edit or delete saved foods, and build reusable custom meals.
- **Progress**: 7-day, 30-day and 12-week calorie charts against your target, days logged, on-target rate (within ±10%), streaks, a 20-week consistency heatmap, a calendar of previous days and a nutrition summary for any day.
- **Settings**: calorie and macro targets. Changes apply from today onward, so past days keep their targets. Export and import a JSON backup (validated before it replaces anything), and erase all data.

Data lives in `localStorage` (`kcal.data.v1`). It is written on every change, and the last good copy from the previous session is kept as a fallback. The app asks the browser for persistent storage. **Export a backup now and then**: clearing site data or deleting the Home Screen app erases it.

```bash
npm run dev:calories     # http://localhost:5174/calories/
npm run build:calories   # builds into dist/calories (npm run build builds both apps)
node scripts/generate-calorie-icons.mjs   # regenerate its icons
```
