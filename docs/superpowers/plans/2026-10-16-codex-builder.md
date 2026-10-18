# Codex builder integration plan

User explicitly selected: wire Codex into automated factory builds.

## Design

Retain the queue, template and deploy contracts. Add `builder.provider` with
`claude` and `codex`; old snapshots without this field continue to use Claude.
Codex runs `exec --json --ephemeral` in the job's existing isolated Git root,
with workspace-write sandbox and no interactive approvals. Use its saved login,
ignore user config, disable hooks/plugins/subagents and host skill discovery,
and disable workspace command network access. Managed policies still apply.
Read-only shell inspection and file editing are available; the factory owns
dependency installation and final production verification.

Use the CLI's built-in model default for new jobs; do not
change the user's global Codex configuration or authentication. The first attempt
to copy the existing global model name was rejected by the ChatGPT-backed service.
Apply the existing
wall-clock timeout to Codex. Dollar and turn limits remain Claude-only because
the installed Codex CLI does not expose equivalent flags.

`retry --current-config` makes a new attempt from the same idea/preference
snapshot with current factory configuration. Default retry preserves all old
snapshots. No existing attempts are rewritten or automatically replayed.

## Files and steps

- [x] Add Codex command/result adapter in `prototype_factory/codex_builder.py`.
- [x] Extend config/provider validation, executable lookup, runner dispatch,
  provider-aware doctor/status, and explicit current-config retry.
- [x] Add `docs/codex-setup.md` and update README/default configuration.
- [ ] Verify syntax/config/protocol handling and existing queue smoke checks;
  no additional testing framework. Run one bounded real Codex job through the
  delivered queue and verify its generated source builds.
- [x] Independent review of the changed files; resolve important findings.
- [x] Apply changes only if actual owned files still match the captured baseline.

## Review focus

Preserve old Claude jobs and default retry semantics. Do not pass Claude flags
to Codex or claim Codex enforces a dollar budget. Handle Windows npm CLI shims,
failed/incomplete JSONL streams, timeout cleanup, and current model availability.
No publishing, external notifications, commits or global account changes.

Verification boundary: local checks passed. Real Codex calls authenticated, but inherited tool policy blocked edits. Untouched outputs now fail the implementation gate. Run the worker from a regular terminal with workspace editing permission; successful real source generation remains unverified.
