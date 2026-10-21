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

## Preview editions

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

`verify` runs factory-owned Chromium/WebKit gameplay and layout acceptance, storing screenshots and an actual-play video under the release's verification folder. It uses no production ads or analytics. These are desktop emulations, not physical-device verification. `show RELEASE-ID` reveals snapshot, status and diagnostics. `recover` requires the worker lock and refuses unresolved process ownership; queue a fresh release after inspection. Existing release artifacts are never overwritten.

## From preview to a public release

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

Accounting import accepts a JSON list with `id`, `edition` (or null for site-wide), `kind` (`revenue`, `cost`, `shared-cost`, `operator-time`), nonnegative `amount`, `currency` (USD/EUR/GBP), `basis` (estimated/final), `period`, and `note` identifying its source. `operator-time` is a monetary valuation of time, not a count of hours. Reimporting identical IDs is idempotent; changed IDs require an explicit correction record. No currency conversion or allocation of site-wide earnings is invented.

```powershell
python factory.py topical accounting PATH-TO-PRIVATE-REPORT.json
python factory.py topical report
```

Unknown revenue stays unknown. Costs and estimates remain visible separately. Ad approval, contact/domain, service budget and actual campaign traffic are still operator/external dependencies. No referrals, contact harvesting, engagement bait, automatic outreach or paid acquisition are included.

## Evidence and limits

Research: Google Trends RSS and publisher feeds, plus manually verified primary links. Game source is pinned; inputs and artifact hashes bind browser verification and approval. Browser checks prove bounded game behavior, not entertainment value, physical ergonomics, virality, audience reach or profitability. The operator still owns topical judgment, distribution and real campaign evaluation.
