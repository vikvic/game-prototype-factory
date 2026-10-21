# Happy/sad share results

> Execute inline with superpowers:executing-plans. The user explicitly requested happy Kylie on wins and sad Kylie on losses, to make sharing entertaining, and to retain this preference for future experiences. Continue the established commit/push/Pages test workflow. No new unit suite.

**Goal:** Both result screen and exported/shared image visibly celebrate a win or dramatize a loss using the existing original cartoon Kylie.

**Architecture:** Extend drawStar with a neutral-default expression; keep gameplay neutral. A focused wing-results module renders the result portrait and a1080x1350 PNG card. Build the card at finish so native file sharing retains click activation; attach it only where supported, with existing link/copy/save fallbacks. Keep the same portrait layout, map, physics, service settings and public test URL.

**Spec:** User message in this conversation. The named artwork style is our existing code-drawn caricature, with an obvious smile/celebration versus a frown/tears and drooping wings. Sharing remains optional; no reward/continue gate. Virality is a design goal, not a promised result.

## Review focus

- Won/lost art differs in both result UI and saved/native share image; retry cannot reuse a previous outcome.
- Result actions and artwork fit320x568 and667x375 while keeping44px targets and pure portrait.
- Native sharing gets the correct file without asynchronous prework losing user activation; unsupported/canceled sharing never changes progress.
- Card headlines, stats and replay address remain readable and inside bounds; no external images or network calls.
- Preserve original public snapshot and prior immutable releases; retain preference in repository and a user-authorized memory update note.

## Tasks

1. [ ] Implement expressions, shared result art/card, outcome UI, file-share capability fallback, compact layout and future-experience guidance. Adapt existing acceptance for both outcomes and actual saved files. Strict build and focused check; one read-only review. Commit, assemble and verify an immutable release.
2. [ ] Archive current portrait Pages snapshot and export exact verified bytes at same URL; verify combined site/staged blobs, commit, guarded integrate/history backup, push and confirm Actions/live files. Inspect result art; retain local receipts and add the requested small memory note.
