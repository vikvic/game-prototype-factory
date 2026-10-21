# Topical Arcade — operator guide

The new `topical` commands use `.factory/topical/topical.sqlite3`. They do not migrate or edit the historical queue. The commercial site is separate from the prototype gallery and the blog. No background service, paid account or social posting is installed.

## Local first run

From the factory repository in PowerShell:

```powershell
python factory.py topical init
python factory.py topical readiness
python factory.py topical collect
python factory.py topical feed-items
python factory.py topical research research/pilot.json
python factory.py topical opportunities
```

RSS results are untrusted observations, never automatic build instructions. Collection is bounded/cached; failures appear per source. Ten researched opportunity hypotheses are included with dated links and distribution targets. Event dates are not proof of rising demand. Some sources are historical or vendor-authored, explicitly labeled. Read each Markdown brief and update evidence before editorial selection. An identical import is idempotent; changed evidence revokes selection.

### Subject context before development

Search attention alone does not make a subject suitable. Check current news, recent deaths and bereavement before creating a lighthearted real-person edition. Affected subjects are excluded from this format. Record the subject, dated sources, reasoning and decision in `editorial_review`; uncertain context blocks selection/build rather than guessing. This is an operator research judgment, not an automatic death detector.

Every non-preview edition now requires `editorial_review` in its opportunity: `decision` (`eligible`, `excluded`, `uncertain`), `context` (`clear`, `recent-death-or-bereavement`, `uncertain`, `not-person-related`), `subjects`, `notes`, `checked_at`, and `source_urls` referencing its recorded sources. Only eligible/clear or eligible/not-person-related can proceed. The review must be within two hours for breaking topics or 24 hours for ongoing topics at queue/build/approval/export. Changed research requires a fresh snapshot. Selection refuses an explicitly excluded or uncertain review; old fictional demonstrations remain available.

`research/current-pilot.json` includes the Kylie runway candidate and the rejected Dolly costume lead. The latter records why a trend signal was overridden; it has no edition to build. To load the candidate:

```powershell
python factory.py topical research research/current-pilot.json
python factory.py topical select kylie-runway-2026
python factory.py topical queue editions/kylie-flash-dash/edition.json
python factory.py topical work --once
```

Dates in the checked-in research are historical observations, not automatically refreshed proof. Recheck and edit the JSON before using it after the review window.

## Preview editions

### Keep research beside each prototype

Keep an edition's source register and design rationale in its own `editions/<slug>/` folder: `SOURCES.md` for dated links and supported claims, `DESIGN.md` for adaptation decisions, and `sources.json` for structured references. Distinguish observed facts, historical observations, fictional gameplay and unmeasured hypotheses. The [Too Much Wing source pack](../editions/kylie-flash-dash/README.md) is the current example.

For local review, retain a versioned copy in the release's `research/` folder beside `project/`, with document hashes and the source-document commit recorded. This is an operator documentation step; the current assembler does not automatically copy these files. Do not rewrite an existing release's `project/`, `snapshot.json`, `verification/` or built artifact to add notes. Original research timestamps and later document-check dates remain separate.

### User-authorized GitHub Pages tests

An explicit public-testing request can use the factory's existing project Pages site. `pages-previews/<slug>/release.json` records the testing purpose, user authorization, verified artifact hash and game revision; `game/` holds only its static output. `tools/build_site.py` checks fingerprints and disabled services, then copies the snapshot into `dist/testing/<slug>/` after building the existing gallery. `pages.yml` deploys that combined artifact. The blog repository and commercial-site workflow are separate. Ordinary source edits do not automatically replace a test snapshot; re-export it deliberately after verification. This path is for explicitly requested public tests, not an automatic commercial release approval.

The three included editions are **fictional previews**, not actual celebrity releases or measured trending games. They share the same paparazzi-evasion game and vary the subject, presentation and humor. Select the research records for local demonstration:

```powershell
python factory.py topical select austin-paddock
python factory.py topical select halloween-flash
python factory.py topical select awards-arrival
python factory.py topical queue editions/paddock-dash/edition.json
python factory.py topical queue editions/costume-caper/edition.json
python factory.py topical queue editions/velvet-rope/edition.json
python factory.py topical work
python factory.py topical releases
```

Reusable source must be committed before queueing; the queue pins that commit and snapshots the edition, research and configuration. `work` drains the persistent queue; `--once` handles one item. Each build has supervised install/build processes and logs. Ordinary assembly invokes no model. There is no automatic model-based code repair in this first version: a failed build preserves diagnostics for an explicit source fix and new release. This avoids spending on deterministic reskins and does not claim the unfinished feedback repair system is integrated.

For each release ID from the list:

```powershell
python factory.py topical verify RELEASE-ID
python factory.py topical site --preview
python factory.py topical serve
```

Open http://127.0.0.1:8766/ . Mobile landscape and portrait are supported. Gameplay: collect all three passes, avoid camera cones and reach the exit. WASD/arrows, Space dash, or movement pad + Dash. Three photos or a 90-second timeout loses. Help/background pauses. Result sharing, cancellation, saving and restart are independent.

The gallery labels these as mechanic previews. A non-preview edition such as Kylie Flash Dash is labeled a release candidate pending editorial review when viewed locally. It adds original character presentation and scene styling through optional validated `theme` (`classic`/`runway`) and `notice` (plain text, at most 160 characters) fields. Neither local verification nor `preview:false` grants editorial approval or publishes it.

`verify` runs factory-owned Chromium/WebKit gameplay and layout acceptance, storing screenshots and an actual-play video under the release's verification folder. It uses no production ads or analytics. These are desktop emulations, not physical-device verification. `show RELEASE-ID` reveals snapshot, status and diagnostics. `recover` requires the worker lock and refuses unresolved process ownership; queue a fresh release after inspection. Existing release artifacts are never overwritten.

## From preview to a public release

Hosting is currently **undecided** at the user's request. No account or project has been created. The instructions below describe the existing optional Cloudflare adapter. The verified output is static and portable: another host can serve the same `commercial-dist/` files through a deployment adapter that preserves the approval/artifact checks. Do not upload `commercial-preview/` or connect an unreviewed auto-build to production. Netlify and Firebase Hosting are alternatives; Vercel's free Hobby plan excludes commercial use. Confirm current plan/traffic costs when choosing a host. A public origin and contact address are still needed before a public release; neither requires purchasing a custom domain just to validate an ad-free pilot.

1. Research a specific audience/hook, choose a subject and review local/imported assets and copy. Refresh source observation/review times honestly. No automated posting or celebrity endorsement is implied.
2. Copy an edition to a new stable slug, set its fields and set `preview:false`. Use original or appropriately sourced assets; this first game uses only original procedural figures.
3. Set `site.url` to an HTTPS origin you control, `contact_email`, and Cloudflare project in `commercial.toml`. These are public configuration, not tokens. Keep analytics/ads disabled initially.
4. Select, queue, work and verify. Before publication, manually play and review the subject and humor.
5. Run `topical approve RELEASE-ID`, then `topical export RELEASE-ID`. Preview editions cannot be approved. Breaking evidence must be reviewed within two hours; ongoing evidence within 24 hours. Changed inputs or expired opportunities require a new release.
6. Export creates `topical_releases/RELEASE-ID/` containing the verified static game and public manifest. Commit only the reviewed source and intended public artifacts, not `.factory` logs/research caches/accounting. Do not edit an exported game to bypass verification.
7. `python tools/build_topical_site.py` creates `commercial-dist/`; it refuses empty, expired or fingerprint-mismatched exports and an unset origin/contact. It never changes legacy `dist/` or prototypes.
8. Create a Cloudflare Pages **Direct Upload** project. Add scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub's `topical-production` environment. Never paste them in chat. Disable any parallel production Git integration. Configure environment protection as appropriate.
9. Dispatch **Topical Arcade commercial release** on main. The workflow deploys the already verified files; it does not rebuild games with unverified inputs. Check the workflow result and actual public game before marking the release live in any external report.

The initial commercial workflow is manual and does not auto-record live verification into the local SQLite store. Local `approved` means editorial/build approval, not deployed. Rollback uses a previous reviewed artifact/Cloudflare deployment. Retire locally with `topical retire RELEASE-ID`; remove its public export and redeploy to remove it from the site. Public expiry is enforced on the next site build, not by a hidden background service.

## Monetization and analytics

Current runtime is ad-free and untracked. `commercial.toml` keeps live ads disabled; attempting to enable them is rejected because consent/provider approval and a production adapter are not complete. The shared service boundary includes a controlled no-fill mock for verification, no initial fullscreen ad, and no share/reward gates. Public ad network integration is a separate readiness dependency, not a completed revenue feature.

Plausible is the proposed measurement provider; no subscription was created. The runtime event boundary exists, but assembled pilot releases deliberately have an empty tracking domain. Before production enablement, fund/configure the service, update privacy copy, verify actual events/costs and build a new reviewed release. Do not infer revenue from SDK calls or shares from dialog closure.

Accounting import accepts a JSON list with `id`, `edition` (or null for site-wide), `kind` (`revenue`, `cost`, `shared-cost`, `operator-time`), nonnegative `amount`, `currency` (USD/EUR/GBP), `basis` (estimated/final), `period`, and `note` identifying its source. `operator-time` is a monetary valuation of time, not a count of hours. Reimporting identical IDs is idempotent. To correct an amount, add a new ID with `supersedes` set to the prior effective record ID: a $100 record superseded by an $80 record totals $80, retaining both in history. Currency, edition, kind and period stay the same; basis can change from estimate to final. Import parent records before corrections. Schema v1 is backed up before this v2 addition. No currency conversion or allocation of site-wide earnings is invented.

```powershell
python factory.py topical accounting PATH-TO-PRIVATE-REPORT.json
python factory.py topical report
```

Unknown revenue stays unknown. Costs and estimates remain visible separately. Ad approval, contact/domain, service budget and actual campaign traffic are still operator/external dependencies. No referrals, contact harvesting, engagement bait, automatic outreach or paid acquisition are included.

## Evidence and limits

Research: Google Trends RSS and publisher feeds, plus manually verified primary links. Game source is pinned; inputs and artifact hashes bind browser verification and approval. Browser checks prove bounded game behavior, not entertainment value, physical ergonomics, virality, audience reach or profitability. The operator still owns topical judgment, distribution and real campaign evaluation.

Two local-output recovery improvements remain: an interrupted export can leave a partial destination that needs inspection/removal before retry, and a failed site build can replace the prior local generated output. The original source/artifacts and already deployed site are preserved. Rebuild the local preview to restore it; never remove historical source or unrelated folders to recover an export.


## Too Much Wing revision

The Kylie edition keeps its `kylie-flash-dash` slug and now selects validated `mechanic: wing-escape`. Omitted mechanic still means the original camera-escape game. The reusable package includes both; queued revisions pin their exact source. Holding Space or Tuck folds the wings to pass three doors; five snags or 60 seconds loses, and the car is the destination. The map/physical mishaps are explicitly fictional extensions of the runway outfit.

Trusted acceptance exercises actual open-wing obstruction and held-tuck clearance through ordinary controls, touch cancellation, all required viewport sizes, win/loss/restart and optional sharing. The build verification timeout is now720 seconds to cover the longer real-play route across eleven engine/viewport cases; this is a browser timeout, not a model spending budget. Old immutable builds remain unchanged. A passing new build replaces the local gallery entry at the same URL only after preview regeneration. Public deployment is still separate.


## Portrait comparison: Too Much Wing

`editions/kylie-wing-portrait/` adds `layout: portrait-course`. The wing game always uses a vertical course; screen Up moves forward at every viewport. Wide windows center a portrait frame with empty side bars. There is no horizontal wing-game renderer or orientation-selected control mapping. Turning the phone pauses for Continue without resetting position or progress. Timer, speeds, three doors and five snags are unchanged.

Build an immutable candidate with:

```powershell
python factory.py topical queue editions/kylie-wing-portrait/edition.json
python factory.py topical work --once
python factory.py topical verify <queued-release-id>
```

The separate public comparison link after a successful Pages run is <https://vikvic.github.io/game-prototype-factory/testing/too-much-wing-portrait/>. The existing `/testing/too-much-wing/` snapshot stays unchanged. A local `site` or `export` command does not deploy. A Pages snapshot must copy exactly the verified release and include its ordered file/checksum manifest, as with the first test snapshot.

The browser matrix covers small and large portrait sizes, mobile landscape and desktop using Chromium/WebKit. It does not replace checking thumb comfort, safe areas and browser chrome on physical iPhone/Android devices before choosing the default. Sources and design reasoning are in the edition folder.
