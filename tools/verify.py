"""Bounded local smoke verification. No model calls or external notifications by default."""
import argparse
import copy
import json
import os
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from prototype_factory import runner
from prototype_factory.config import DEFAULTS
from prototype_factory.dashboard import handler
from prototype_factory.export import build_site, copy_source, publish
from prototype_factory import export
from prototype_factory.intake import read_batch
from prototype_factory.locking import WorkerLock
from prototype_factory.notifications import payload
from prototype_factory.store import Store
from prototype_factory import codex_builder


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def rejects(call, message):
    try:
        call()
    except ValueError:
        return
    raise RuntimeError(message)


def smoke(root: Path, quick=False, live=False):
    settings = copy.deepcopy(DEFAULTS)
    store = Store(root)
    ideas = root / "ideas"
    ideas.mkdir()
    first = ideas / "one.md"
    first.write_text('---\nid: first\ntitle: First\npriority: 3\n---\nCollect bright squares.', encoding="utf-8")
    original_text = first.read_text()
    batch = read_batch([ideas])
    one = store.enqueue(batch, "Prefer tiny games", settings)[0]
    require(not store.enqueue(batch, "Changed preferences", settings), "Intake must deduplicate")
    require(store.get(one)["preferences"] == "Prefer tiny games", "Preferences must be immutable")
    first.write_text(first.read_text() + "\nAdd a timer.", encoding="utf-8")
    two = store.enqueue(read_batch([ideas]), "New snapshot", settings)[0]
    require(store.get(one)["status"] == "cancelled", "New revision must supersede queued old revision")
    require(store.claim()["id"] == two and store.claim() is None, "Claim must be exclusive")
    with WorkerLock(store.state):
        rejects(lambda: WorkerLock(store.state).__enter__(), "Second worker must be rejected")
    require(runner.recover(store) == 1, "Abandoned job recovery failed")
    retried = store.retry(two)
    require(store.get(retried)["attempt"] == 2, "Retry must preserve/increment attempt")
    store.cancel(retried)
    codex_settings = copy.deepcopy(settings)
    codex_settings["builder"].update(provider="codex", executable="codex", model="")
    migrated = store.retry(retried, codex_settings)
    require(json.loads(store.get(migrated)["config"])["builder"]["provider"] == "codex", "Explicit retry must use current builder configuration")
    require(json.loads(store.get(retried)["config"])["builder"]["provider"] == "claude", "Retry must not rewrite the original snapshot")
    store.cancel(migrated)
    require(runner.provider({"executable": "claude"}) == "claude", "Legacy snapshots must retain Claude")
    with patch.object(codex_builder, "executable", return_value="fixture-codex.exe"):
        args = codex_builder.command(codex_settings["builder"])
        require("--json" in args and "--ephemeral" in args and "workspace-write" in args, "Codex must use its own bounded automation protocol")
        require("--max-budget-usd" not in args and "--max-turns" not in args, "Claude flags must not be passed to Codex")
        if os.name == "nt":
            require('windows.sandbox="elevated"' in args, "Ignoring user config must not omit the Windows sandbox backend")
    protocol = store.state / "codex-protocol.jsonl"
    protocol.write_text('diagnostic line\n{"type":"turn.completed","usage":{}}\n', encoding="utf-8")
    codex_builder.check_result(protocol)
    protocol.write_text('{"type":"turn.failed"}\n{"type":"turn.completed"}\n', encoding="utf-8")
    rejects(lambda: codex_builder.check_result(protocol), "Failed Codex turns must not become ready")
    protocol.write_text('{"type":"thread.started"}\n', encoding="utf-8")
    rejects(lambda: codex_builder.check_result(protocol), "Incomplete Codex output must fail")
    unchanged = root / "unchanged-starter"
    (unchanged / "src").mkdir(parents=True)
    (unchanged / "index.html").write_text("starter")
    (unchanged / "PROTOTYPE.md").write_text("untouched starter")
    fingerprint = runner.source_fingerprint(unchanged)
    report = (unchanged / "PROTOTYPE.md").read_bytes()
    rejects(lambda: runner.check_implementation(unchanged, fingerprint, report), "Untouched starter must never be marked ready")
    (unchanged / "PROTOTYPE.md").write_text("updated report")
    rejects(lambda: runner.check_implementation(unchanged, fingerprint, report), "Report-only updates must not count as a game implementation")
    # A changed default must not gate an older queued provider's snapshot.
    legacy_job = store.retry(two)
    unavailable_default = copy.deepcopy(codex_settings)
    unavailable_default["builder"]["executable"] = "missing-default-provider"
    with patch.object(runner, "build_job", side_effect=lambda s, j, demo: s.update(j["id"], status="ready", phase="fixture")):
        require(runner.worker(store, unavailable_default, once=True) == 0, "Worker must use a queued job's provider rather than require the current default")
    require(store.get(legacy_job)["status"] == "ready", "Legacy provider dispatch was blocked by a different default")
    # A -> B -> A must follow the file's current revision, not build stale B.
    first.write_text(original_text, encoding="utf-8")
    restored = store.enqueue(read_batch([ideas]), "Restored preferences", settings)[0]
    require(store.get(restored)["digest"] == batch[0]["digest"], "Restoring an old revision must queue it again")
    first.write_text(original_text + "\nA new third revision.", encoding="utf-8")
    third = store.enqueue(read_batch([ideas]), "", settings)[0]
    first.write_text(original_text, encoding="utf-8")
    restored_again = store.enqueue(read_batch([ideas]), "", settings)[0]
    require(store.get(third)["status"] == "cancelled" and store.claim()["id"] == restored_again, "Reversion must supersede stale queued work")
    runner.recover(store)
    (ideas / "duplicate.md").write_text('---\nid: first\n---\nDuplicate.', encoding="utf-8")
    rejects(lambda: read_batch([ideas]), "Duplicate IDs must reject the batch")
    (ideas / "duplicate.md").unlink()
    (ideas / "bad.md").write_text('---\npriority: nope\n---\nInvalid.', encoding="utf-8")
    rejects(lambda: read_batch([ideas]), "Malformed priority must be rejected")
    (ideas / "bad.md").unlink()
    require(json.loads(payload("@everyone hello"))["allowed_mentions"] == {"parse": []}, "Discord must disable mentions")
    timeout_log = store.state / "timeout.log"
    try:
        runner.run_process([sys.executable, "-c", "import time;time.sleep(10)"], root, timeout_log, 0.1)
        raise RuntimeError("Timeout was not enforced")
    except subprocess.TimeoutExpired:
        require(not (store.state / "process.json").exists(), "Process marker must be cleared")
    orphan = store.state / "process.json"
    require(not orphan.exists(), "Stale process marker")
    # A failed parent can already be gone when cleanup runs. Its child must die too.
    child_pid = store.state / "descendant.pid"
    spawn_code = "import subprocess,sys,time;from pathlib import Path;p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']);Path(sys.argv[1]).write_text(str(p.pid));time.sleep(.15);sys.exit(2)"
    rejects(lambda: runner.run_process([sys.executable, "-c", spawn_code, str(child_pid)], root, store.state / "descendant.log", 5), "Failed parent must be reported")
    require(child_pid.exists() and not runner.alive(int(child_pid.read_text())), "A descendant survived failed-parent cleanup")
    linked_source = root / "linked-source"
    linked_source.mkdir()
    outside = root / "outside-source"
    outside.mkdir()
    (outside / "private.txt").write_text("must not be exported")
    if os.name == "nt":
        subprocess.run(["cmd.exe", "/c", "mklink", "/J", str(linked_source / "public"), str(outside)], capture_output=True, check=True)
    else:
        (linked_source / "public").symlink_to(outside, target_is_directory=True)
    rejects(lambda: copy_source(linked_source, root / "unsafe-export"), "Linked public directory must be rejected")
    store.update(two, published="fixture")
    store.update(restored_again, published="removed", deploy_url="https://example.com/obsolete", deploy_sha="old")
    deploy_settings = copy.deepcopy(settings)
    deploy_settings["deploy"] = {"repository": "fixture/factory", "pages_url": "https://example.com/arcade/"}
    responses = [
        [{"databaseId": 2, "headSha": "pr", "conclusion": "success", "status": "completed", "event": "pull_request"},
         {"databaseId": 1, "headSha": "production", "conclusion": "success", "status": "completed", "event": "push"}],
        {"jobs": [{"name": "deploy", "conclusion": "success"}]},
        {"tree": [{"path": f"prototypes/{two}/prototype.json"}]},
    ]
    with patch.object(export, "executable", return_value="fixture-gh"), patch("subprocess.run", side_effect=[subprocess.CompletedProcess([], 0, json.dumps(value), "") for value in responses]):
        require(export.check_deploy(store, deploy_settings) == 1, "Production reconciliation must ignore newer PR builds")
    require(store.get(restored_again)["deploy_url"] is None, "Removed prototypes must lose confirmed links")
    require(store.get(two)["deploy_sha"] == "production", "Reconciliation must record deployed commit")
    print("PASS intake, snapshots, revisions, locks, recovery, process cleanup, linked-export rejection, deployment reconciliation, notification payload")
    if quick:
        return
    (root / "templates").mkdir()
    for template in ("canvas", "three"):
        copy_source(ROOT / "templates" / template, root / "templates" / template)
    fake = root / "fake_claude.py"
    fake.write_text('''import json,sys
from pathlib import Path
prompt=sys.stdin.read()
assert "Idea:" in prompt
Path("PROTOTYPE.md").write_text("# Fake integration build\\nA deterministic local CLI fixture, no model was called.")
index=Path("index.html")
index.write_text(index.read_text().replace("Signal Garden", "Fixture Garden"))
print(json.dumps({"type":"result","subtype":"success","is_error":False}))
''', encoding="utf-8")
    original = runner.claude_command
    runner.claude_command = lambda builder: [sys.executable, str(fake)]
    try:
        fake_job = store.retry(two)
        runner.worker(store, settings, once=True)
        require(store.get(fake_job)["status"] == "ready", "Fake Claude job must reach ready")
        exported = publish(store, fake_job)
        require(not (exported / ".git").exists() and not (exported / "node_modules").exists(), "Export must exclude local state/dependencies")
        require(not (exported / "idea.md").exists(), "Export must exclude private intake")
    finally:
        runner.claude_command = original
    demo_idea = dict(batch[0], idea_key="three-demo", digest="three-demo", template="three", title="Three starter demo")
    demo_job = store.enqueue([demo_idea], "", settings)[0]
    runner.worker(store, settings, once=True, demo=True)
    require(store.get(demo_job)["status"] == "demo_ready", "Demo must not claim Claude completion")
    publish(store, demo_job)
    site = build_site(root)
    require(len(json.loads((site / "manifest.json").read_text())) == 2, "Gallery must contain both exports")
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler(store))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_port}"
        for path in ("/", "/api/status", f"/job/{fake_job}", f"/play/{fake_job}/"):
            with urllib.request.urlopen(base + path, timeout=5) as response:
                require(response.status == 200, f"Dashboard route failed: {path}")
        for path in (f"/play/{fake_job}/%2e%2e/%2e%2e/idea.md", f"/play/{one}/"):
            try:
                urllib.request.urlopen(base + path, timeout=5)
                raise RuntimeError("Preview escaped its build or exposed an unready job")
            except urllib.error.HTTPError as error:
                require(error.code == 404, "Expected safe 404")
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    print("PASS fake Claude subprocess, Canvas/Three demo builds, source export, gallery, dashboard, preview traversal protection")
    if live:
        live_settings = copy.deepcopy(settings)
        live_settings["builder"].update(max_budget_usd=1.0, max_turns=12, timeout_seconds=240)
        live_idea = dict(batch[0], idea_key="live-integration", digest="live-integration", title="Live integration",
                        body="Keep the existing Signal Garden game intact. Change its visible title to Signal Garden Live and describe that change in PROTOTYPE.md. Do not add dependencies.")
        live_job = store.enqueue([live_idea], "Make only the requested tiny change.", live_settings)[0]
        runner.worker(store, live_settings, once=True)
        result = store.get(live_job)
        require(result["status"] == "ready", f"Live Claude check failed: {result['error']}. Evidence: {result['folder']}")
        require("Signal Garden Live" in (Path(result["folder"]) / "index.html").read_text(), "Live Claude did not make the requested change")
        print("PASS live authenticated Claude job (estimated cap $1, 12 turns, 240 seconds)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true", help="Queue/process checks only; no npm install/build")
    parser.add_argument("--live-claude", action="store_true", help="Also make one authenticated model call, capped at an estimated $1")
    args = parser.parse_args()
    if args.quick and args.live_claude:
        parser.error("--quick and --live-claude cannot be combined")
    # Verification never sends external messages, even if a webhook is configured.
    os.environ.pop("DISCORD_WEBHOOK_URL", None)
    (ROOT / ".factory").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="verify-", dir=ROOT / ".factory") as temporary:
        try:
            smoke(Path(temporary), args.quick, args.live_claude)
        except Exception:
            evidence = ROOT / ".factory" / "last-verification-failure"
            if not evidence.exists():
                import shutil
                shutil.copytree(temporary, evidence, ignore=shutil.ignore_patterns("node_modules"))
            raise
    print("Verification complete. No external notification or deployment performed.")
