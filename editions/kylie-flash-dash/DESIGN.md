# Too Much Wing — design rationale

This is a concise decision record for the implemented prototype, not a claim about real backstage events. Source IDs refer to [SOURCES.md](SOURCES.md).

## Premise and audience

The user's goal is a topical, briefly entertaining browser game for an audience interested in a particular subject. The initial name-swap chase was too generic. The chosen revision makes the referenced costume central to the input and obstacle system.

The visual hook comes from V1 and VS1. The design inference is that an oversized costume meeting ordinary architecture is understandable without learning a fictional world. That inference has not been validated as a successful acquisition strategy.

The user selected **Too Much Wing**, the second proposed concept, rather than the alternative runway-pose game. The implemented joke is impractical costume logistics: an elaborate look, very ordinary doors, and an undignified route to the car.

## Reference versus invention

| Element | Design decision | Evidence status |
|---|---|---|
| Character | Large brunette caricature, light costume, wing silhouette and jewelry cues. | Stylized visual adaptation; see V1/VS1. Likeness is a design hypothesis. |
| Environment | Runway transitions into a backstage equipment route. | Fictional layout, not a recreation of an actual venue. |
| Opponents | Phone filmer, long-lens photographer and TV crew have different silhouettes. | Invented obstacles; not identified real people. |
| Animation | Feather lag, folding, recoil and loose-feather particles emphasize awkward movement. | Original procedural animation, not motion reconstructed from footage. |
| Exit | A pickup car makes the destination visually obvious. | Fictional goal and route. |

## Why these mechanics

- **Move plus held Tuck:** connects the costume to a physical action. Folding reduces the actual collision footprint and slows travel; releasing it restores the larger silhouette.
- **Three doors:** gives a short run visible milestones, with equipment between them to vary alignment and approach.
- **60 seconds and five snags:** keeps retries bounded. These are game-design values, not values derived from a news story or player analytics.
- **Optional result sharing:** supports the intended funny five-minute experience without gating replay behind a share or account.
- **Touch movement plus a separate held button:** supports moving and folding simultaneously on a phone. Desktop emulation has been checked; physical-device ergonomics remain unverified.

## Difficulty and the latest feedback change

The user said the slight difficulty was good for retrying but the cause of getting stuck was unclear. The response was to improve information, preserving the challenge:

1. Coral outlines show the obstruction; a contact marker identifies the nearby collision surface.
2. A blue outline reveals the player's current clearance footprint.
3. Wings-only obstruction explains Tuck and highlights its button.
4. Body obstruction names the object and points around it or into the door gap. Folding does not permit walking through a wall.

The feedback update did not change collision dimensions, movement speeds, the timer, the snag limit, recoil or grace timing. It adds no automatic steering. These facts are recorded against the pinned revision in [README.md](README.md).

## What remains a hypothesis

The topical audience fit is moderate-confidence editorial judgment. Measured search acceleration, relative topic ranking, humor, recognizability and conversion are not established by a source link or a passing build. Revenue and virality are unknown. Keep acquired-traffic evidence separate from implementation and browser-verification evidence.
