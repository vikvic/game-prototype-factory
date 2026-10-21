# Too Much Wing Portrait Implementation Plan

> Execute inline with superpowers:executing-plans. The user approved the portrait proposal with “Ok do this.” Existing authorization covers scoped commits, push and a separate GitHub Pages testing link. No new unit tests per user instruction; use strict builds and the existing trusted browser acceptance.

**Goal:** A portrait-first version of the existing backstage escape, published at a separate comparison URL.

**Architecture:** An optional validated `layout: portrait-course` edition selects a vertical camera and matching screen-to-world input when upright. It shares the existing world, physics, milestones and cartoon character; landscape retains the sideways view. Keep the current public snapshot untouched.

**Tech Stack:** Existing TypeScript Canvas/Vite, Python/SQLite release snapshots, trusted Chromium/WebKit acceptance and GitHub Pages.

**Spec:** Approved chat proposal: upward manual route, player in lower third, movement pad left and held Tuck right, predictive clearance and explicit collision feedback, compact HUD/status/control rows, portrait menus, separate test link before replacement.

## Global constraints

- Keep three doors, 60 seconds, five snags, existing movement speeds and collision dimensions. No auto-steering.
- Use the same world coordinates on rotation; pause and clear inputs when the view switches, then offer Continue without restarting.
- Preserve source/research notes and all existing release artifacts and Pages games. No ads, analytics or commercial workflow.
- Candidate edition `kylie-wing-portrait`; test slug `too-much-wing-portrait`. Auto portrait presentation only for this candidate while upright.
- No new unit suite. Existing browser acceptance covers 320x568, 360x640, 390x844, 430x932, 667x375 and desktop1280x720; WebKit covers the first five.

## Review focus

- Screen Up must advance world x; screen Right must increase world z; Tuck and movement work together.
- Actual floor footprints and door openings stay visible despite tall character/scenery.
- Rotation, Help and background pause cannot resume a held pointer or reset progress.
- Small portrait menus/status/buttons fit without scrolling or obscuring controls.
- Legacy edition input/rendering and the previous public snapshot remain intact.

## Tasks

1. [x] Add `wing-portrait.ts` renderer and scoped `wing-portrait.css`; integrate optional layout, input mapping, compact copy and rotation Continue in `wing-game.ts`. Extend `Edition` and Python schema only for the optional enum. Strict TypeScript/Vite build.
2. [x] Add the portrait edition and its source/design notes; adapt existing trusted acceptance for world-to-screen navigation, portrait touch direction, rotation pause, portrait viewport matrix and captures. Review the whole change; fix material findings. Commit source, refresh the existing topic context honestly, assemble and verify an immutable release.
3. [ ] Export exact verified bytes to a second Pages snapshot using recorded file order/checksums. Validate combined site and staged bytes, commit/push, wait for Pages, verify live assets and browser interaction. Save release/deployment evidence and provide the separate link, with physical-phone checks stated accurately.
