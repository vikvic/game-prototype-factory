# Reddit paused campaign drafts implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved first connection. User instructions prohibit new tests; use compilation, CLI walkthroughs and offline verification without adding test files.

**Goal:** Connect an operator's Reddit Ads account, inspect eligible audiences, and prepare/create campaign drafts that remain paused.

**Architecture:** A standard-library Python `factory.py ads reddit` adapter uses stable Reddit Ads API v3, OAuth and a separate private SQLite database under `.factory/reddit-ads/`. Windows DPAPI protects persisted secrets; other systems use environment credentials. The existing build queues, public games and hosting stay untouched.

**Approved scope:** Read targeting options and create paused campaign drafts. No ad delivery, activation, billing changes, pixels, outreach, ad groups or creative uploads. Audience choices, destination and copy remain a local campaign brief; creating a remote campaign does not apply that targeting or create a runnable ad. Sending is explicit; local draft preparation has no network effects.

## Global constraints
- No hardcoded or printed credentials; no plaintext credential files. OAuth scopes are only `adsread,adsedit` and state is verified on a short-lived loopback callback.
- Stable v3 endpoints and `objective=CLICKS`, `configured_status=PAUSED`, `is_campaign_budget_optimization=false` are fixed in code. No ACTIVE write exists.
- Save attempts before remote writes; reconcile uncertain results instead of retrying a possibly successful POST. Verify remote pause state and retain remote ID.
- Stored account and targeting evidence are private, ignored and separate from source. No inference of audience eligibility without a successful API lookup.
- No spending budget has been authorized. No live ad or spend capability is included.

## Review focus
Credential redirection/leakage; OAuth failure/denial; ambiguous create response; duplicate/concurrent submissions; foreign or inactive campaign reconciled as a local draft.

## Tasks
1. Add `prototype_factory/ads/auth.py` and `client.py`: protected credentials, connect/status/forget, fixed-origin requests, bounded reads, audience/account discovery and paused-only campaign creation.
2. Add `prototype_factory/ads/store.py` and `campaigns.py`: immutable validated local briefs, evidence snapshots, attempt journal and reconciliation. Persist unknown sends and never automatically replay them.
3. Add `prototype_factory/ads/cli.py`, entry routing in `factory.py`, operator docs and an explicitly unverified Price Cut example brief. Compile and walk through local commands with no credentials.
4. Verify the implementation offline against the downloaded public API schema, exercise failure cases without real Reddit writes, get a focused independent review, and fix material findings. Commit the scoped integration and preserve any unrelated changes. Live account discovery and remote creation require the operator's app/account authorization; report actual verification limits.

## Progress
- Public v3 OpenAPI schema inspected on October 30, 2026; campaign creation requires name/status/objective. Traffic remains `CLICKS` under the current objective migration. Both app/account authorization and scope grants remain unavailable locally until configured.
- Tasks 1-3 implemented. Separate queue, OAuth/DPAPI, fixed-origin client, discovery, immutable briefs, explicit paused sends, reconciliation and docs are present. The operator supplied a public App ID; it is stored only in ignored local configuration.
- Task 4 offline verification passed: compilation, CLI preparation/deduplication, current schema payload, Windows credential encryption, ambiguous-send recovery, concurrent claim exclusion, foreign origin/account rejection and ACTIVE/terminal-state rejection. Independent review's effective ARCHIVED/DELETED finding was fixed. No new test files or real Reddit writes were made. Live authorization is the remaining external dependency.
