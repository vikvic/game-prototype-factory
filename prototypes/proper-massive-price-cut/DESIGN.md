# Proper Massive Price Cut

User-approved design, October 25, 2026. Standalone portrait game linked from the existing arcade.

## Hook and boundaries
Sam Fender's intervention against inflated tour pricing and premium front-standing sections becomes fictional arcade comedy: wealthy executives stretch velvet ropes across an entrance while the player snips openings for fans. Sam is an original stylized character at the stage; the player controls the scissors. The executives, endless ropes and slapstick falls are fictional. Actual pricing context is documented in SOURCES.md.

Targeted Wing reuse: portrait presentation, touch/mouse conventions, pause/help and result/share patterns, timed expressive animation, and the existing deployment contract. No Wing world, doorway collision, character drawing or movement mechanic is copied. No premature shared engine extraction; this prototype identifies future reusable pieces by use.

## Agreed play
- Fans travel bottom to top. Each admitted fan earns one point times the multiplier. Cuts do not directly earn points.
- A swipe cuts every intersected rope once. Maximum cumulative path length is 150 logical units in a 420-wide arena; extra motion is truncated, including curved/zigzag paths. One held pointer cannot repeat cuts without lifting.
- A 0.6s cooldown begins when a swipe is submitted. The stroke trail shows reach; the HUD shows recharge. A very short tap does not spend a swipe.
- One scissors sprite fades in, travels along the accepted stroke, closes at crossings and fades out. Rope halves recoil and fade with synchronized synthesized snip/snap sound.
- Multi-cuts raise the current multiplier to at least 2x / 3x / 4x for two / three / four-or-more ropes. Single cuts preserve a higher multiplier.
- A fan hitting an active rope falls dramatically out of the bottom, a randomly chosen executive laughs, multiplier becomes 1x, and banked points stay.
- Ropes have a visible drawing phase before blocking. New ropes and fans appear faster over the round.
- Only sixty active-play seconds end the round. No lives or early loss. Pause, help, backgrounding and orientation changes preserve the clock and score.
- Results show score, admitted/blocked fans, best multiplier, Replay and voluntary Share/Save. Artwork reacts to the admission-versus-blocked outcome without claiming a binary win/loss.

## Initial tuning and implementation choices
Rope drawing takes 0.75–0.95s; new ropes every 2.2–1.05s, capped at seven uncut ropes. Fans spawn every 0.65–0.45s. Swipe animation reaches all crossings in about 0.155s and finishes fading at 0.43s. These are initial design choices for human playtesting, not established balance.

The source is ordinary Canvas vector art with no downloaded images/fonts. Sound is synthesized locally after a gesture. Sharing/storage/audio capabilities are optional; failures must leave replay available. Existing Cloudflare Worker and GitHub Pages both consume the same relative-base Vite output.
