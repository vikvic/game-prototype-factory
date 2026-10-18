# Two prototype playchecks — 2026-10-18

The original briefs are `tunnel-frontier.md` and `buffet-dash.md`. Each is a separate Canvas job using the existing factory configuration and preference snapshot. Existing prototypes and factory code are outside this change.

## Tunnel Frontier

Job: `tunnel-frontier-e2df699d`

Check in the browser: adjacent-only digging, ore credits, permanent nest activation, turret costs and placement, enemy movement/shooting, inter-wave planning, final outcome, and full restart. A build result alone does not establish gameplay balance.

Observed in the browser:
- Found and reproduced a first-click offset when focusing the tall map scrolled the page before resolving the clicked tile. Fixed by preventing scroll on map focus; strict TypeScript/Vite rebuild passed, and the same first click then placed the turret on the intended tile.
- Two turrets spent 90 of the initial 100 credits. A distant tile was rejected as out of reach.
- Mining four eastern ore tiles yielded 120 credits. Reaching the eastern nest raised active nests from 1 to 2 and wave-one enemy count from 5 to 10.
- Enemies used the two carved routes, turrets fired, construction controls were disabled during combat, and clearing each wave restored planning with a 25-credit reward.
- Both nests remained active in subsequent waves (14 then 18 enemies).
- The initial browser warning/error log was empty.
- Completed all four waves with two active nests, 66 enemies stopped, and 100% core integrity. Restart restored the initial map, 100 credits, one active nest, and five enemies for wave one.
- Production build passed before the playcheck and again after the focus fix. Editable source is exported locally to `prototypes/tunnel-frontier-e2df699d/`.

## Buffet Dash

Job: `buffet-dash-24812a73`

Check in the browser: explicit start, movement and station proximity, serving time, fitting/rotating food, table proximity, points only after eating, timeout summary, and full restart. A build result alone does not establish gameplay balance.

Observed in the browser:
- The clock waited at 100 seconds before Start.
- Click-to-walk reached berries, enabled Serve, and consumed serving time.
- A packed berry occupied one cell and showed 7 plate points while banked score stayed zero. Returning home enabled Eat; a completed bite banked 7 and freed the cell.
- A horizontal roll could not fit from the last column. Rotating let it occupy row 1/2 of that column. A second rotated portion could not overlap those occupied cells. Auto-place found a valid free footprint.
- Timeout showed 7 banked and 38 uneaten; carried food did not score.
- Restart cleared score, inventory, position and timer. The page was then reloaded to leave it waiting for Start.
- Browser warning/error log was empty during the check.
- Factory production build passed strict TypeScript and Vite.
- Editable source exported locally to `prototypes/buffet-dash-24812a73/`.

## Verification results

Both strict TypeScript/Vite builds passed, and both games were manually playchecked in the in-app browser. Screenshots in the accompanying `previews/` folder record the observed outcomes. No automated tests requested or added. No online deployment requested or performed. These checks establish basic mechanics, not balanced gameplay or full device coverage. Tunnel Frontier's repairs/defeat and other optional nests were not exhaustively checked.

## Play and edit

- Local monitor: http://127.0.0.1:8765/
- Tunnel Frontier: http://127.0.0.1:8765/play/tunnel-frontier-e2df699d/
- Buffet Dash: http://127.0.0.1:8765/play/buffet-dash-24812a73/
- If the monitor is stopped, run `python factory.py serve` from the factory repository.
- Edit exported code under `prototypes/<job-id>/`. A new factory queue job starts from its template; it does not inherit edits from an existing prototype. The current monitor play links serve each job project's build, so rebuilding an export alone does not change those job links.
- Idea briefs are `ideas/tunnel-frontier.md` and `ideas/buffet-dash.md`. Their queued jobs preserve the original brief, preferences, model log, and build logs under `.factory/jobs/<job-id>/`.
