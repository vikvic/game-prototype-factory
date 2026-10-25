# Proper Massive Price Cut

Portrait Canvas score attack. Open the gates, swipe across ropes and admit as many fans as possible in 60 active-play seconds. Linked from the factory gallery by prototype.json.

## Controls and scoring
Mouse/touch: swipe up to 150 logical units; all crossed ropes are cut. Scissors cooldown 0.6s. Multiple crossings of the same rope count once. Multi-cut 2/3/4+ gives at least 2x/3x/4x per admitted fan; a smaller cut preserves the current multiplier. Rope collision makes the fan tumble out, a random executive laugh and the multiplier reset. Score never decreases and misses never end the run early.

Pause button/P/Escape; Help button/H; R restarts. Backgrounding and orientation changes pause. Only the timer ends a round. Replay, native optional sharing, clipboard fallback and PNG saving are independent. No ads, tracking, live feed access or remote model calls at runtime.

## Build and deployment
`npm ci --ignore-scripts --no-audit --no-fund` then `npm run build` checks strict TypeScript and creates relative-base static output. `python tools/build_site.py` at repository root adds the game to `dist/games/proper-massive-price-cut/` and the gallery. Existing main-branch Pages and Cloudflare Git integration publish the combined artifact. No new Worker or secrets needed.

## Sources and design
SOURCES.md and sources.json record source-backed observations, limitations and fictional adaptation. DESIGN.md records the approved mechanics and initial tuning. Preserve these with the prototype.

## Playtest question
Can players deliberately time limited strokes for multi-cuts while rescuing approaching fans, and does the falling-fan/executive reaction make misses funny and readable? Numbers are provisional; physical-phone ergonomics and replay appeal need human playtesting.

## Character reactions
Blocked fans leave a brief comic speech bubble (including “My ticket!” and “I wanted to see the show!”) as they tumble away. At the actual snip, the executive responsible for that rope becomes angry for 1.5 seconds: furrowed brows, a frown, red cheeks, raised shaking fist, steam marks and GRR. Anger takes visual priority over laughter; other available executives still laugh at missed fans. These are visual dialogue bubbles, not recorded or synthesized spoken dialogue. Scoring, collision rules and timing are unchanged.

Direct browser review confirmed complaint bubbles on fan collisions and angry rope owners after a three-rope swipe. Nearby bubbles are vertically separated for readability. The updated strict TypeScript/Vite build passed.

## Verification
October 25, 2026: strict TypeScript/Vite production build passed. Direct Chromium browser play at 390x844 confirmed multi-rope cutting (a three-rope swipe produced 3x), animated recoil/falls/laughter, and continued play despite misses. Sustained ordinary mouse swipes admitted nine fans and banked ten points in approximately seventeen seconds. A full unattended round ran to zero and showed the result/replay screen instead of ending on misses. Pause held the clock unchanged at 59.71s; Help and portrait/landscape rotation preserved the same round. Layout checks at 320x568 confirmed no document overflow and 44px primary/header targets. Landscape 844x390 retained a centered portrait field. No browser error logs were observed.

An independent review identified late-cut effect completion, audio failure isolation and scissor-closure synchronization; all three were corrected before publication. Score/admission/multiplier statistics freeze at zero while a short cosmetic tail finishes accepted cuts. Result-card art and labels reflect the actual score/admission outcome. No new automated tests, following the user's project instructions. No physical-phone or real Instagram-browser verification is claimed.
