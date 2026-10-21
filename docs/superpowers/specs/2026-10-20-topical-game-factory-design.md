# Topical Game Factory — Draft Product and Delivery Plan

Date: 2026-10-20. Status: approved for implementation in chat. Paid accounts, public-domain selection and external provider approval remain separate dependencies.

## 1. Objective

Extend the existing game-prototype-factory into a small production system for timely, amusing browser games. A person follows a link, plays for roughly five minutes, has a laugh, and may voluntarily share the experience. Earn revenue during that visit through restrained advertising or a sponsor.

Each release targets the audience interested in its particular subject. Returning players, audience overlap and a lasting catalog are optional benefits. Extensive reuse, including changing the subject and presentation while retaining gameplay, is acceptable.

Support both breaking events and ongoing cultural conversations. The business hypothesis is that topical relevance plus rapid, inexpensive production can produce profitable releases. Virality and profitability remain unproven.

## 2. Goals

- Discover timely opportunities from search, news and social conversation, with dated supporting evidence.
- Match opportunities to reusable games so an edition can be assembled while attention is active.
- Make each edition immediately recognizable through its subject, premise, presentation and promotional material.
- Provide complete keyboard/mouse and mobile touch play, including mobile landscape at minimum.
- Preserve existing prototypes, source history, immutable job snapshots and the current blog.
- Automate assembly, bounded repair, verification, release packaging and deployment after a release is selected and approved.
- Prepare monetization before a traffic spike, and measure costs and earnings separately for each edition.
- Make sharing optional and independent of access, progress and rewards.

## 3. Non-goals and prohibited product patterns

- No requirement to compete on the depth, progression or production value of major mobile games.
- No requirement for a unique mechanic for each topic, daily return habit or shared audience.
- No native app, multiplayer, account system, public leaderboard or player-generated content in the first release.
- No unattended choice and publication of real-person/news editions in the pilot.
- No automatic outreach, social posting, paid acquisition or sponsorship promises in the pilot.
- No share-to-continue, invite rewards, tag-to-unlock, social login gates, contact importing or automatic messages.
- No incentives for clicking advertisements; no fake share confirmation or obstructed share cancellation.
- No large SEO page farm, mandatory social-platform dependency, or separate code fork per edition.
- No framework-wide rewrite, automatic merge of unfinished older work, or conversion of the existing Gunfu game as part of this pivot.

## 4. Confirmed direction and proposed defaults

Confirmed by the conversation: breaking events and ongoing cultural situations are the two lanes; releases may be throwaway; separate audiences are expected; extensive reuse is acceptable; browser distribution and ads are central; forced sharing is excluded.

Proposed defaults, open to revision: English-language, US-focused initial research; one operator and one active build; a 2D paparazzi-escape game as the first reusable game; one commercial domain; no paid promotion during validation; human approval of each new subject/news hook. These are planning choices, not claims of prior user agreement.

The celebrity example remains a candidate, not proof of demand. The pilot can use another researched subject if it has a stronger distribution opportunity.

## 5. Current foundation and integration boundary

Repository: C:\Users\vic\Documents\GitHub\game-prototype-factory. The inspected CLI currently supports Markdown intake, a SQLite job queue, isolated Codex/Claude jobs, local export, gallery builds and GitHub Pages checks. Canvas and Three.js starters already exist. Trusted Playwright Chromium/WebKit gameplay checks already exist.

Current preferences prohibit monetization, analytics and external calls. Add a separate commercial profile; do not silently change all existing prototypes. The existing publish command exports locally and must not be presented as online deployment.

There is older unfinished feedback/delivery work in another worktree. Audit it before reuse. Integrate only reviewed capabilities necessary for this plan, retaining current main's games and checks. Do not make the entire older project a prerequisite: implement narrow missing delivery/repair capabilities if that is simpler.

## 6. Workflow and records

Collect → research → select → assemble → verify → approve release → deploy → distribute → measure → retain or retire.

Keep distinct records for:

| Record | Required contents |
| --- | --- |
| Opportunity | Stable ID; topic/entity; lane; region; source URLs; publication and observation times; evidence; audience; distribution route; confidence; review deadline; status |
| Reusable game | Stable ID/version; source commit; mechanic; supported controls/orientation; editable fields; trusted gameplay scenario |
| Edition | Stable ID/slug; opportunity and game version; title; subject; premise; asset references/provenance; copy; result-card rules; optional tuning; ad policy |
| Release | Edition ID; source commit; immutable input snapshot; build and browser evidence; editorial approval; deployment URL/ID; monetization status; retirement status |
| Performance | Edition/date/channel; traffic and gameplay aggregates; authoritative ad reports; costs; attribution limits; estimated or finalized revenue label |

Opportunity states: discovered, researched, selected, watching, rejected, expired. Release states: queued, assembling, verifying, review_ready, approved, deploying, live, failed, retired. Monetization has its own disabled, pending, enabled or suspended state. A live game is not necessarily monetized.

Published releases are immutable artifacts. Updating an edition creates a new release; rollback selects a previous artifact. Shared game fixes flow into future builds after verification, not into live pages at runtime.

## 7. Trend research

Start with Google Trends Trending Now RSS and an operator-maintained list of publisher RSS feeds. Google documents an RSS export; this avoids depending on access to its restricted Trends API. [Google Trends exports](https://support.google.com/trends/answer/3076011?hl=en)

Use manual TikTok Creative Center, YouTube, X and community research to enrich selected candidates. Paid X collection and additional APIs are later optional adapters. Do not assume public display implies an unrestricted scraping API.

Proposed operation: one manual collection command initially; an optional hourly local run only after the workflow works. No background service is required for the pilot. Cache responses, deduplicate stories/entities, record failures, honor source limits and do not interpret a failed collection as zero interest.

For each researched opportunity, record the specific conversation, audience, why now, remaining useful window, recognizable game hook and concrete distribution route. Distinguish measured source values from model judgment; do not combine incomparable trend scales as absolute audience estimates.

Proposed freshness rule: recheck breaking-event evidence within two hours of release approval, and ongoing-topic evidence within 24 hours. Each opportunity has an explicit expires_at chosen during research. Stop expired builds before further model calls or publication unless the operator deliberately refreshes the opportunity.

Choose candidates using evidence strength, audience reachability, template fit, time remaining and incremental cost. A missing audience or distribution route is a reason to watch/reject, regardless of trend rank. News, web pages and downloaded assets are untrusted inputs; they never become executable instructions, repository settings or arbitrary builder commands.

## 8. Reusable games and edition packages

First candidate: a 2D paparazzi-escape game. Reach an exit while avoiding photographers' camera cones. Provide a complete short round, humorous result, instant restart and optional result sharing. Use original stylized art and keep provenance for any imported asset; review identifying copy, imagery and the topical hook before publication.

An edition changes the subject, setting, colors, character presentation, dialogue, title, thumbnail, share-card text and optionally difficulty. It may keep the same map and mechanics. Its promotional material must accurately show that edition. No novelty quota is imposed.

Use a validated edition.json plus local assets. Pin the reusable game's source commit; assemble a self-contained static release. Share a common UI/ad/analytics layer at build time. A game engine or edition never downloads code/config from a live public trend feed.

Retain Markdown research and game briefs for review. Use JSON for structured edition/runtime data and SQLite for operational state. Proposed folders in the existing repository: research/opportunities/, editions/<edition-id>/, reusable_games/<game-id>/, and tools for collection/assembly/reporting. Private reports, raw research captures and local state belong in ignored .factory/ storage; commit only material intended to be public.

## 9. Technologies

| Concern | Proposed choice |
| --- | --- |
| Local orchestration | Existing Python 3.11+ CLI, SQLite and Markdown; validated JSON for editions |
| Game runtime | TypeScript Canvas for first 2D game; existing Three.js option only when a concept benefits from 3D |
| Toolchain | Existing TypeScript ~5.9.3, Vite ^7.3.0 and lockfiles; Node 24 used by CI; no gratuitous upgrades |
| Builders | Existing Codex default and Claude adapter; saved local CLI authentication; credentials never in editions or prompts |
| Verification | Existing typecheck/build plus trusted Playwright 1.64.1 Chromium/WebKit scenarios and human playthrough |
| Hosting | Cloudflare Pages, GitHub source, custom domain and versioned static assets |
| CI/release | GitHub Actions performs trusted verification and one authoritative deployment path; Cloudflare preview builds must not bypass release approval |
| Analytics | Proposed hosted Plausible pageviews/custom events; provider approval and budget precede subscription setup |
| Ads | Google AdSense/H5 Games Ads when approved; shared disabled/mock/production adapter |
| Notifications | Existing optional Discord webhook for meaningful build/deploy failures and completion |

Keep orchestration and its SQLite database local. A public game visit does not hit the local factory. No public application backend is needed for the pilot; analytics/ad providers handle their respective services. The local worker must be running to process builds. No new model provider, login or secret is required to draft or build an ad-free candidate.

For Cloudflare, prefer a GitHub Actions deployment of the exact verified artifact. Disable a parallel unverified production auto-deploy. Native Git integration is an alternative only if its branch controls enforce the same release gate. Cloudflare documents Git-connected builds and preview deployments. [Cloudflare integration](https://developers.cloudflare.com/pages/configuration/git-integration/)

## 10. Mobile, sharing and advertising contract

Preserve the existing landscape viewports: 568×320, 667×375, 844×390, 667×280, plus desktop 1280×720. For the first simple social game, also propose portrait support at 390×844. Controls and essential HUD fit without body scrolling; targets approximately 44 CSS pixels; resize preserves play; Help/background pauses and clears held input. No fullscreen requirement.

Result actions: Play again, Share result, Save image or Copy link where supported. Use Web Share when available and local image/link fallbacks. Canceling or ignoring sharing has no gameplay effect. Do not require social SDKs or permission to read friends. A share-dialog success is not proof that a friend saw a post.

Ad baseline: no initial fullscreen ad and no mandatory ad before showing the result or sharing. First monetization experiment uses at most one interstitial opportunity per session, at a natural transition after a completed attempt; do not add artificial breaks. Banners are a separate experiment and are omitted where mobile space is inadequate.

Rewarded checkpoint continue is optional and disabled in the initial baseline. Enable only after approval and a deliberate experiment: free restart remains available, the offer is explicit, and the reward follows confirmed provider completion. Do not add a share-based alternative. Google's rewarded-ad policy requires clear disclosure, appropriate opt-in and delivery of the promised reward. [Rewarded-ad requirements](https://support.google.com/adsense/answer/9121589?hl=en)

Ads pause/mute play correctly. Denied consent, no fill, cancellation, network errors or unavailable SDK must not freeze the game or hide ordinary controls. Follow provider frequency controls; never manufacture ad refreshes or clicks. Keep a central ad disable switch. Previews and automated verification use disabled/mock ads and do not generate paid impressions.

## 11. Hosting and monetization readiness

Create one commercial game site on a domain selected by the operator. Preserve the blog and current prototype URLs. GitHub Pages restricts business hosting; use it for the existing prototype context, not as this commercial plan's production host. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Deploy a substantive working site with game pages, contact/privacy information and the required provider/consent configuration. Apply for AdSense and H5 Games Ads before depending on launch revenue. Approval is external and not guaranteed; SDK installation is not approval. Google offers interstitial/rewarded H5 formats and an application process. [H5 Games Ads](https://adsense.google.com/start/h5-games-ads/)

Until approval, public releases are explicitly ad-free validation. Ad serving remains disabled. Configure consent for the traffic served, ads.txt and publisher IDs as required by the approved provider. Public publisher/site identifiers may appear in built pages; private API tokens, webhooks and deployment credentials stay in environment/GitHub secrets.

Prepare an optional labeled sponsor placement on opening/result screens. No sales automation or assumed sponsorship revenue. Portals such as CrazyGames/GameDistribution are later complementary channels; portal review and SDK work are not prerequisites for the direct-site pilot.

## 12. Distribution and measurement

Each release ships with a playable page, thumbnail, actual gameplay clip, accurate share preview, several caption drafts, and a short list of suitable communities/creators. Initial posting and outreach are manual. No mass posting, engagement bait or false celebrity endorsement. Meta documents action against spammy distribution and engagement manipulation. [Meta's anti-spam initiative](https://about.fb.com/news/2025/04/cracking-down-spammy-content-facebook/)

Use independent routes suited to each audience: short-form video, relevant communities/creators, voluntary private sharing and search. Generate readable HTML descriptions, controls, screenshots and a sitemap; no promise of immediate search ranking and no per-keyword clone pages. Marketing is separate from automated job completion.

Measure page visits by edition URL and tagged campaign; game starts; first-round completion; restart; one bounded active-play-duration summary; share initiation/cancellation when observable; and errors. Never label share initiation as a confirmed share or tracked referral arrivals as a complete viral coefficient. Private messages often obscure referral information.

Plausible is the proposed initial analytics service. Its custom events count toward billable usage, and custom properties are a Business feature. Minimize events; use distinct edition URLs instead of requiring paid custom properties. Provider limits and total cost are part of launch readiness. [Plausible events](https://plausible.io/docs/custom-event-goals), [custom properties](https://plausible.io/docs/custom-props/introduction)

No per-frame analytics or personal player identifiers. Ad callbacks are operational signals, not accounting records. Import authoritative provider reports manually first. Attribute revenue to an edition only if provider dimensions/channel reports support it; otherwise show site totals and explicitly allocated estimates. Do not present unavailable finalized revenue as zero.

Track incremental edition production/promotion cost, shared game cost, hosting/analytics and provider-finalized revenue. Include operator time as a separately visible cost even if unpaid. Formula: contribution = edition revenue − incremental edition costs. Overall profit also subtracts shared costs. RPM = 1,000 × publisher revenue / sessions; define a session consistently and record provider/measurement differences. No forecast RPM is treated as a target or guarantee.

## 13. Bounded automation and verification

Keep the selected builder's current 1,200-second invocation limit initially. Proposed repair cap: one repair invocation, at most 2,400 builder wall-clock seconds total per edition attempt. This is not a Codex dollar cap; record actual known spend or mark unavailable. Queue is single-worker with restart-safe phases, immutable snapshots and process cleanup. Retries do not duplicate a live release or silently reset limits.

Require changed intended source/config, strict production build, trusted gameplay evidence, touch/layout checks, clean browser diagnostics, correct assets/links and a human check of humor/subject presentation. Exercise sharing cancel/unsupported fallback, disabled/no-fill ads and pause/resume using controlled fixtures; physical-device evidence is separately labeled. Do not add a generic unit-test suite by default.

Preserve the existing trusted browser gate: its current canvas-only assumptions and external-request handling must be adapted intentionally for the approved commercial shell. Never allow arbitrary browser failures just because ads are noisy; distinguish app failures from controlled provider failures. A new reusable game needs trusted gameplay coverage. Editions reuse that coverage plus subject/asset/layout checks.

Commit only scoped reviewed source; deploy the exact verified artifact; confirm live assets/behavior; roll back or disable the affected edition on a reproducible critical regression. Keep evidence and notify once of a meaningful state change. Automated repair never rewrites its own acceptance scenario, publishes stale opportunities or changes advertising policy to obtain a pass.

## 14. Phased delivery and exit criteria

| Phase | Deliverable | Exit criterion |
| --- | --- | --- |
| 0 — Reconcile foundation | Inspect current main/unfinished work; choose narrow integration; document profiles and release ownership | Existing games and blog preserved; current vs proposed commands clear; no accidental older-branch merge |
| 1 — Opportunity intake | RSS collection, deduplication, Markdown research, SQLite records, manual selection/expiry | Ten researched opportunities, each with dated evidence and a real distribution route; no automatic builds from raw feeds |
| 2 — Reusable game and editions | One complete game, schema, deterministic assembly, three selected edition packages and result sharing | Three distinct editions built from pinned shared source; full loop, mobile and independent sharing work |
| 3 — Commercial foundation | Custom-domain preview/production workflow, minimal analytics, ad adapter, application-ready site | Verified ad-free site live; accounting/measurement works; ad application status recorded accurately |
| 4 — Controlled public pilot | Launch the three editions sequentially while relevant; package/manual marketing; optional live ads once approved | Per-edition acquisition, play, costs and reporting coverage recorded; failures recoverable |
| 5 — Evaluate and expand | Review launch evidence; improve selection; optionally add one reusable game or another source | Explicit continue/change/stop decision based on contribution and acquisition evidence, not number of games generated |

Start ad applications as soon as phase 3's substantive site is ready; research and game work need not wait. External approval and topic timing control the calendar. No guarantee that all three candidates remain relevant: replace expired candidates and preserve the rejection history.

Proposed responsiveness targets after the reusable game and commercial site exist: an ordinary edition requires no game-code fork; assembly plus automated checks should fit within 30 minutes excluding model/art generation; selected breaking-event editions aim for same-day release. These are engineering targets to measure, not delivery promises.

Review each release at 24 hours and seven days, with a final accounting update when available. A release with little reach diagnoses distribution first; a well-reached edition with poor starts/completion diagnoses its hook or experience. Mark insufficient data as inconclusive. Scale only when several measured releases support the economics; no universal conversion threshold is invented in advance.

## 15. Decisions deferred until needed

- Brand/domain and account owner: needed before commercial hosting and ad applications.
- Monthly service/model spending limit: needed before paid account setup or unattended collection. Paid acquisition defaults to zero.
- Final first game and subjects: chosen from researched opportunities; paparazzi escape is the candidate example.
- Ad and analytics provider account approval: external dependency; use disabled adapters beforehand.
- Degree of automatic editorial selection/marketing: deferred until the manual pilot has evidence; this plan does not authorize messaging people.

Confidence: high on technical feasibility and fit to the stated goals; moderate on distribution strategy; unknown on virality, approval timing and profitability. The first implementation deliverable should be opportunity research and one reusable game, not an autonomous publishing machine.
