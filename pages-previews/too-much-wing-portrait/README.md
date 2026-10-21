# Too Much Wing - portrait public test

Separate comparison: https://vikvic.github.io/game-prototype-factory/testing/too-much-wing-portrait/

Release `kylie-wing-portrait-7208d146` pins game revision `e8401bd79c031139d1077a4089b46739ae9d572c`. All 11 trusted Chromium/WebKit cases passed. `game/` is the exact verified build, not a rebuild. `release.json` records the artifact and each file checksum in original factory order; `verification.json` is its matching acceptance evidence. Ads and analytics are disabled.

The existing `/testing/too-much-wing/` snapshot is unchanged. The 60-second timer, three doors, five snags, movement and colliders stay unchanged. Upright play uses an upward course and dedicated controls/status. Turning the phone pauses for Continue.

Physical iPhone/Android ergonomics remain a human check. Minor review follow-ups: Help may scroll on the smallest viewport; held-input interruptions are supported by code inspection and separate cancellation/pause checks rather than a combined held-gesture case.

Source material and design: [edition folder](../../editions/kylie-wing-portrait/README.md). Deployment uses the existing Pages pipeline and preserves the legacy gallery. No commercial launch approval is implied.
