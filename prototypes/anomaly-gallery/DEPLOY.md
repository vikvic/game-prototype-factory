# Deploying Anomaly Gallery in the prototype factory

This project is now a game inside `game-prototype-factory`, rather than a
separate deployment. Its HTML and painting assets are copied unchanged into
`dist/games/anomaly-gallery/` by the factory's normal build.

## Build and preview

From the **game-prototype-factory repository root**:

```powershell
python tools/build_site.py
python -m http.server 8767 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:8767/games/anomaly-gallery/>. The build includes the
arcade card, six public HTML pages, the asset manifest and the vendored paintings.
`curate.html`, `fetch-assets.mjs`, documentation, Git metadata and build inputs
are not published. Use the curator from a local server over this source folder
when deliberately refreshing the painting pool.

`prototype.json` registers the game with the gallery. The dependency-free npm
wrapper provides the same `npm ci` / `npm run build -- --outDir ...
--emptyOutDir` interface as the other prototypes. The factory supplies a fresh
output folder on every build; the wrapper refuses to erase a nonempty output
folder. It also checks that each painting referenced by the manifest exists.

## Publish through the existing repository

1. Review and commit the imported `prototypes/anomaly-gallery/` folder, including
   its `assets/`, `prototype.json`, `package.json`, `package-lock.json` and
   `build.mjs`.
2. Push the reviewed commit to `main`, the deployment branch.
3. GitHub Pages runs the existing `.github/workflows/pages.yml`. The connected
   Cloudflare Worker uses the same generated `dist/` directory.
4. Check the corresponding deployment succeeded, then open the direct game URL
   and verify that paintings and the first playable round load.

No separate Worker, repository, Pages project, domain or per-game secret is
needed. Do not add a nested deployment workflow or a game-specific `CNAME`.

With the currently configured hosts, the URLs **after a successful deployment**
are:

- Cloudflare: <https://game-prototype-factory.vicmugen.workers.dev/games/anomaly-gallery/>
- GitHub Pages: <https://vikvic.github.io/game-prototype-factory/games/anomaly-gallery/>

Cloudflare's repository build command remains `python tools/build_site.py`.
`wrangler.jsonc` already points its static assets at `./dist`; the deploy command
is `npx wrangler deploy`. This shares the existing Worker with all other games.

## Runtime dependencies

The main game reads `assets/manifest.json` and its paintings from the deployed
game folder. It does not need a server API or a live Commons request when that
manifest is present. MediaPipe's pinned JavaScript/WASM package still loads from
jsDelivr, and its face-landmarker model loads from Google Storage. These external
requests must succeed in the player's browser; the npm build does not download
or verify their runtime availability. Some experiment pages still query Commons
directly and can encounter its rate limits independently of the main game.

## Integration check — 22 October 2026

The full `python -B tools/build_site.py` build completed successfully with all six
prototype entries and both existing fingerprint-checked Wing test snapshots.
The Anomaly Gallery output contains six HTML pages and 109 asset files (90
paintings referenced by the curated manifest). All 115 output files matched the
imported source bytes; all 116 original HTML/asset files were preserved.

Local HTTP checks returned 200 for each public page, the asset manifest and a
sample JPEG. A browser check followed the arcade card into a rendered round,
confirmed pause/resume and the How It Works navigation, and observed paintings
advance. This confirms local build integration and basic browser startup;
physical mobile/Instagram behavior and the eventual production deployment still
need their own checks. No commit, push or online deployment was performed.
