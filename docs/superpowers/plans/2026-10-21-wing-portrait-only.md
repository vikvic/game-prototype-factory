# Too Much Wing: portrait only

> Execute inline with superpowers:executing-plans. The user's direct instruction is the approved full description: keep a pure portrait experience, using side bars on wide screens. Continue the authorized commit/push/Pages workflow. No new unit suite per user instruction.

**Goal:** The same vertical course and input mapping at every viewport, including the user's 923x884 browser.

**Architecture:** Remove the wing game's horizontal renderer and orientation-selected input. Center a portrait frame capped at 480 CSS pixels and 9:16 of viewport height. Short windows use compact portrait UI, never another camera. Keep the world/physics unchanged. Keep orientation interruption pause, clearing pointers before Continue. Side bars are empty; no ad network, credentials, placeholder buttons or tracking.

**Spec:** User message: "just keep pure portrait, work from there. In landscape mode there can be vertical letterboxes or we fill those spaces with ads". Use existing TypeScript Canvas/Vite, SQLite snapshot pipeline and Pages.

## Review focus

- Up always advances, including a wide viewport; no horizontal renderer remains in the wing-game path.
- The main frame stays portrait and centered; side bars never cover input or introduce network calls.
- At 667x375 the intro, active controls, result and sharing actions fit and remain at least44px.
- Resize clears held input and preserves progress; focus cannot bypass Continue.
- Preserve both old immutable releases and the original public test; replace only the portrait test snapshot.

## Tasks

1. [x] Simplify wing-game/art, add centered and compact portrait styles, update design/operator notes and existing acceptance for 923x884 plus the original phone/desktop matrix. Strict build, focused short-window check, one fresh read-only review. Commit source and assemble/verify an immutable release. No new unit suite.
2. [ ] Archive the prior portrait snapshot, export the exact verified replacement to the same portrait URL, verify combined site and staged blobs, commit, guarded main fast-forward, preserve local database history, push. Wait for Actions, compare live bytes and inspect the user's wide browser. Save receipts and hand over the same link.
