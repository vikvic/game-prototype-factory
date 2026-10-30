# Reddit Ads: first connection and paused campaign drafts

This operator tool connects your own Reddit Ads business through stable API v3.
It reads your account and eligible audiences, snapshots a campaign brief locally,
and can explicitly create an empty **PAUSED campaign container** on Reddit.
It cannot activate a campaign, create ad groups/ads, upload creative, change billing,
or buy traffic. No advertising budget has been authorized.

Audience, destination and copy in a brief are **local preparation**, not targeting
applied to Reddit. A remote campaign container is not a runnable advertisement.
Reddit currently requires a conversion pixel for ad-group creation; delivery,
measurement/consent and actual creative setup are a later implementation.
No pixel, analytics script or tracking collector is installed by these commands.

## 1. Register the app callback and public ID

In Reddit Ads, use **Business > Developer Portal**. You must be a business admin
with an email-verified Reddit account. In your developer application, register:

```text
http://127.0.0.1:8768/callback
```

Use the exact value; the callback accepts only loopback traffic. The factory must
run on the same computer as the browser used for authorization. If Reddit rejects
this redirect URI for your app type, stop and resolve app configuration rather
than putting an OAuth callback on the public static game site.

```powershell
Set-Location "$env:USERPROFILE\Documents\GitHub\game-prototype-factory"
python factory.py ads reddit setup --client-id YOUR_PUBLIC_APP_ID
python factory.py ads reddit doctor
```

`setup` saves only the public ID in ignored `.factory/reddit-ads/app.json`.
`doctor` is local-only; credential presence is never proof of authorization.

## 2. Authorize locally

```powershell
python factory.py ads reddit connect
```

Enter your **developer app secret** at the hidden terminal prompt, not your Reddit
password. Open the authorization URL printed by the command, confirm the right
Reddit account, and review the `adsread` and `adsedit` request. No conversions,
data-deletion or content-access scope is requested. Reddit does not provide a
paused-only OAuth permission: `adsedit` is broader; this adapter enforces the
paused-only behavior itself.

The listener verifies a random one-time state and waits five minutes. A declined
or invalid callback does not save credentials. Successful authorization encrypts
the app ID, secret and refresh token with **Windows DPAPI for your Windows user**
in `.factory/reddit-ads/credentials.dpapi`. Tokens/secrets are never printed.
Authorization creates no campaign and spends nothing.

On other systems, supply all three environment variables from your secret manager:
`REDDIT_ADS_CLIENT_ID`, `REDDIT_ADS_CLIENT_SECRET`, `REDDIT_ADS_REFRESH_TOKEN`.
The adapter does not read `.env` files or store plaintext credentials. Environment
credentials take precedence as a complete set; partial configuration is rejected.

```powershell
python factory.py ads reddit check
python factory.py ads reddit accounts
```

`check` makes a real read-only business lookup. `accounts` lists accessible ad
accounts, IDs, currencies and account approval state. Nothing is selected silently.
Keep the ad account ID you intend to use; it is typically `a2_...` or `t2_...`.

## 3. Discover actual eligible audiences

```powershell
python factory.py ads reddit targets communities "Sam Fender"
python factory.py ads reddit targets communities "Newcastle"
python factory.py ads reddit targets communities "UK music"
python factory.py ads reddit targets interests "music"
python factory.py ads reddit targets geolocations GB
```

Results are timestamped evidence in a separate private SQLite database. A search
can return zero results; the example queries are not promises that those audiences
are targetable. Community targeting concerns associated users across Reddit, not
guaranteed placements inside a selected subreddit. Evidence snapshots are dated,
not permanent eligibility or audience reach estimates. No Reddit posts/comments
are scraped and no community messages are sent.

## 4. Prepare and inspect the draft

```powershell
python factory.py ads reddit draft examples/reddit-price-cut.json --account YOUR_AD_ACCOUNT_ID
python factory.py ads reddit drafts
python factory.py ads reddit show YOUR_DRAFT_ID
```

Local preparation works without credentials. Omitting `--account` creates an
unbound planning draft that cannot be sent. Prepare another with `--account` after
connecting. Identical briefs for the same account return the same draft rather
than creating duplicates. Changed copy or account creates a new immutable snapshot.

`show` includes the brief, previously fetched audience evidence, tagged destination
URL, event history and exact fixed remote payload. The stored example does not
assert current news relevance, live browser verification or campaign approval.
Review the subject, game and copy again before eventual advertising.

## 5. Explicitly create the paused container

```powershell
python factory.py ads reddit send YOUR_DRAFT_ID
```

This is the first command that creates a Reddit campaign. It confirms access to
the bound account, saves the attempt, sends a fixed `configured_status=PAUSED`,
`objective=CLICKS`, `is_campaign_budget_optimization=false` request, saves the
remote ID, then reads it back to verify the account, name and paused status.
No budget, ad group, ad, audience, image, link or body is submitted in this request.

Open Reddit Ads Manager to inspect the empty paused campaign. A successful local
draft or available credential file is not a successful remote creation.

## Interrupted or failed requests

```powershell
python factory.py ads reddit sync YOUR_DRAFT_ID
```

An interrupted/ambiguous POST remains `submitting`, `remote_unverified` or
`uncertain`; repeating `send` is blocked. `sync` reads the saved remote ID or
searches complete paginated campaign listings for the unique factory draft name.
It never creates a new campaign. A matching campaign is identity-checked and, if
necessary, set back to PAUSED before success is recorded. If there is no unique
match, automatic resend stays blocked; inspect Ads Manager. A definite rejected
HTTP request returns the draft to local preparation so you can correct account
permissions and explicitly retry. Rate limits and server failures are reported,
not hidden by write retries.

`python factory.py ads reddit forget` deletes local encrypted credentials only.
Revoke authorization in Reddit to revoke remote access. Any environment credentials
must also be unset by you. This does not delete campaigns or historical drafts.

## What comes next

Actual advertising would add explicit media/scheduling/budget review, platform
spending limits, approved measurement, paused ad-group/creative creation, then a
separately authorized launch. This version deliberately has no activation command.
Do not enable ads by changing the stored JSON or database: writes are fixed in code.

## API references checked October 30, 2026

Verification: all Python sources compile; local CLI preparation and duplicate
handling were exercised without authorization. Offline walkthroughs confirmed
Windows DPAPI round-trip protection, payload fields against the downloaded
official v3 schema, concurrent submission exclusion, ambiguous-write recovery,
pause repair, foreign-account rejection, terminal-state rejection, and refusal
of foreign origins/ACTIVE writes. An independent static review found one terminal
state edge case, which was fixed and exercised. No new test files were added.
Live OAuth, account eligibility and remote campaign creation remain unverified
until the operator authorizes the connection; none are implied by these checks.

- [Create the developer app](https://ads-api.reddit.com/docs/v3/guides/quick-start/create-dev-app)
- [OAuth authorization and refresh](https://ads-api.reddit.com/docs/v3/guides/quick-start/authenticate)
- [Create campaign](https://ads-api.reddit.com/docs/v3/api/create-campaign)
- [Eligible community search](https://ads-api.reddit.com/docs/v3/api/search-communities)
- [Campaign objective migration; traffic remains CLICKS](https://ads-api.reddit.com/docs/v3/guides/programs/campaign/campaign-objective-migration)
- [Ad-group requirements](https://ads-api.reddit.com/docs/v3/api/create-ad-group)

Implementation targets stable **v3**, not the v4 preview. API/account availability
can change. Credentials, account results, drafts and attempt history stay private
under ignored `.factory/reddit-ads/`; the public static deployment never receives them.
