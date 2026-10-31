# Price Cut PostHog events

This game uses PostHog project **700357** (Default project) in the **protofun** organization. Browser configuration is read from Vite build variables; no personal API token is bundled. The public ingestion token and regional ingestion host are in the game's `.env.production` for portable production builds, and in ignored `.env.local` for local development. The ingestion token is intended for public browser bundles; it does not grant project management or analytics read access. Never put a personal API key in either browser configuration file.

## Run locally

From `prototypes/proper-massive-price-cut`, run `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run dev`. The existing local `.env.local` enables capture. In a fresh checkout, copy `.env.example` to `.env.local` and fill `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` from the project's SDK settings. `VITE_GAME_REVISION` labels the build.

Check events at https://us.posthog.com/project/700357/activity . Localhost and Vite development traffic automatically have `test_mode=true`. Add `analytics_test=1` or `utm_medium=qa` to label tests on a public build. Filter `test_mode=false` for audience reports.

## Production build configuration

The tracked `.env.production` supplies the public browser configuration for the existing GitHub Pages and Cloudflare Git builds. A build host may override it using these variables, then rebuild and deploy:

- `VITE_POSTHOG_KEY`: the public project ingestion token, not a personal API key.
- `VITE_POSTHOG_HOST`: the ingestion host returned by this project's SDK setup.
- `VITE_GAME_REVISION`: a commit SHA or release label.

For the existing Cloudflare Git build, `.env.production` works without additional dashboard setup. Optional overrides belong in its build configuration; runtime-only Worker bindings do not replace Vite build-time variables. For GitHub Pages, repository Actions variables named `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` override the checked-in public configuration when nonempty; `pages.yml` also supplies the commit SHA as the revision. Empty Actions variables are unset before building so they do not silently disable the file configuration. Local gallery builds run Vite from each prototype folder and can read its ignored `.env.local`. Cloudflare uses the production release label unless its build provides `VITE_GAME_REVISION`.

Missing configuration disables capture without breaking the game. Configuration is embedded at build time, so changing host variables without rebuilding does not update an already deployed game. Only the public production file is exempted from the repository's environment-file ignore rule; local files and any personal credentials stay ignored. Publication still requires a successful Git push/build/deploy and a live capture check.

## Event contract

| Event | Meaning |
| --- | --- |
| `game_loaded` | Game initialized and Start is available, once per measured page visit |
| `game_started` | Each round starts, including keyboard restarts |
| `round_completed` | Timed round reaches final results, once per round |
| `first_round_completed` | The first started round in the page visit completes; restarting it early does not qualify |
| `replay_started` | Any subsequent round starts, including an early restart; not an additional round beyond `game_started` |
| `share_initiated` | Player chooses Share |
| `share_cancelled` | Native share rejects with AbortError |
| `share_failed` | Sharing reports another error |
| `share_dialog_closed` | Native share promise resolves; this does not prove publication |
| `share_link_copied` | Clipboard fallback resolves; this does not prove forwarding |
| `result_save_requested` | Result image download was requested; this does not prove saving or sharing |

Every event has `game_id`, `game_revision`, `visit_id`, `test_mode` and available incoming `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` (limited to 120 characters each). Round events include `round_id` and `round_number`. Starts also include `is_replay`. Completions include score, stars, active-play seconds, admitted/blocked fans and best multiplier. IDs last only for the current page view; reloads create another visit. Do not interpret them as persistent unique players.

Attribution is captured on page load and retained across rounds. Shared result URLs use `player_share` / `referral` attribution instead of retaining the sender's paid or organic tags. A result image contains the same referral link; receiving apps may omit URLs. Untagged referrals remain partly unobservable. Share completions retain the originating round ID even if the player restarts while sharing is open.

## Capture controls

- Explicit events only: automatic clicks, pageviews, pageleave, exceptions, performance capture, heatmaps, surveys, feature flag requests, console recording and session replay are disabled.
- PostHog uses memory persistence and `person_profiles: never`; no identity survives a reload through this integration. The game retains its existing personal-best storage and stores only an explicit analytics preference when changed.
- Help contains a gameplay-statistics checkbox. Turning it off stops new capture, and the choice is retained where browser storage is available. `analytics=off`, Do Not Track and Global Privacy Control also disable capture. Re-enabling cannot override these signals.
- The intro discloses PostHog statistics and directs players to Help. This is an opt-out measurement setup, not a consent banner or a legal compliance certification. Change to an opt-in gate before capture if required for your launch configuration.
- Outgoing event properties use an explicit allowlist: our gameplay fields, bounded campaign tags, anonymous event identity and basic browser/device metadata. SDK-derived click IDs, search terms and duplicate session-entry campaign fields are discarded. Full URL query strings and fragments are removed from the retained current URL. Never put personal information in UTM tags. Browser/network metadata is still processed by PostHog.
- SDK loading is asynchronous; a bounded in-memory queue preserves the initial load/start ordering. Analytics failure does not block play, results, sharing or Replay. Blocking and opt-out cause undercounting.

## Reporting

Start with `game_loaded` to `game_started` to `round_completed`, grouped within the same `visit_id` and a short conversion window. For first-round quality use `first_round_completed`. Count unique visits, not all round events. Separate `replay_started` visits from total round counts, and break down acquisition by the campaign fields. Exclude `test_mode=true`.

No Meta Pixel or Conversions API is added by this change. Those are separate destinations requiring their own configuration and consent decisions.

SDK reference: https://posthog.com/docs/libraries/js and https://posthog.com/docs/libraries/js/config .

## Verification on October 30 2026

Continuation check: inspected all twelve uncommitted paths before staging. Confirmed
the live organization/project and ingestion configuration through the connected
PostHog app. Replaced mismatched local/production token values from project settings,
configured the two public GitHub Actions variables, added the documented SDK defaults
date, and fixed SDK-derived attribution leakage with an outgoing property allowlist.
Both the individual production build and full arcade export passed.

A fresh real-time browser round produced six confirmed QA records: load, start,
completion, first-round completion, another start and replay. Load/start/completion
shared one visit ID, and replay used a new round ID. A synthetic 200-character
campaign source was stored as 120 characters; the captured URL had no query string,
and synthetic click-ID/search fields were absent. After disabling statistics in
Help, reloading retained the unchecked control and the tagged opt-out visit produced
no observed events. The original enabled preference was then restored. At 320x568,
the statistics control and close button remained reachable by scrolling, without
horizontal document overflow. No browser errors were observed. These checks used
`test_mode=true`; they are instrumentation checks, not audience or balance results.

The strict TypeScript and Vite production build passed. A Chromium browser run completed the game, cancelled native sharing, requested a saved card and replayed. Project 700357 contained the nine corresponding QA records: one load, two starts, one round completion, one first-round completion, share initiation/cancellation, save request and replay. They shared one visit ID; the replay had a new round ID. The accelerated browser-clock run is instrumentation evidence, not a timing or balance playtest. All records were marked `test_mode=true`.

Separate browser checks confirmed no capture for URL opt-out, saved opt-out, Do Not Track and Global Privacy Control. Blocking the ingestion network left gameplay running. The Help checkbox stopped new capture and remained off after reload. With capture enabled, browser cookies were empty and the only local-storage entry after a completed round was the game's existing personal best. Browser emulation does not establish physical Instagram-browser behavior.

The repository's broader `python tools/verify.py --quick` check exited at its Windows `mklink /J` junction-creation step. No unrelated factory logic was changed to bypass that failure. No public deployment or Meta integration was performed.
