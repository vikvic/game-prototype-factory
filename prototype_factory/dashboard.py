import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

PAGE = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Game Factory · Monitor</title>
<style>body{background:#0b1220;color:#edf4ff;font:16px system-ui;margin:0}main{max-width:1150px;margin:50px auto;padding:24px}h1{font-size:42px;margin-bottom:8px}.muted{color:#a2b3cd}#jobs{display:grid;gap:18px;margin:30px 0}.job{background:#152139;border:1px solid #2c405f;border-radius:14px;padding:24px}.tag{font:12px monospace;color:#8ae0ce}h2{margin:10px 0}a{color:#96c8ff;margin-right:18px}code{overflow-wrap:anywhere;color:#a2b3cd}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{background:#203756;color:white;border:1px solid #48617f;border-radius:5px;padding:8px;cursor:pointer}.error{color:#ffbbab}#events{color:#b5c5dd;font:13px monospace;line-height:1.7}</style>
<main><div class="tag">LOCAL WORKSPACE / READ ONLY</div><h1>Game prototype factory</h1><p class="muted">Jobs, evidence, and play links. Refreshes every 3 seconds. <span id="health"></span></p><div id="jobs"></div><h2>Recent activity</h2><div id="events"></div></main>
<script>
const jobs=document.querySelector('#jobs'),events=document.querySelector('#events');
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
async function refresh(){try{const response=await fetch('/api/status');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();jobs.replaceChildren();for(const j of data.jobs){const card=el('article','','job');card.append(el('div',j.status+' / '+j.phase+' · attempt '+j.attempt,'tag'),el('h2',j.title),el('code',j.id),el('p','Updated '+j.updated,'muted'));if(j.error)card.append(el('p',j.error,'error'));if(j.folder)card.append(el('pre',j.folder));const links=el('p','');for(const [label,url] of [['Details','/job/'+j.id],...(j.status==='ready'||j.status==='demo_ready'?[['Play locally','/play/'+j.id+'/']]:[]),...(j.deploy_url?[['Confirmed deployment',j.deploy_url]]:[])]){const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener';links.append(a)}card.append(links);jobs.append(card)}if(!data.jobs.length)jobs.append(el('p','No jobs yet. Add an idea, then run ingest.','muted'));events.replaceChildren(...data.events.map(e=>el('div',e.at+' · '+e.job_id+' · '+e.message)));document.querySelector('#health').textContent='Connected';}catch(error){document.querySelector('#health').textContent='Disconnected — '+error.message}}
refresh();setInterval(refresh,3000);
</script></html>'''


def handler(store):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, content, mime="application/json", status=200):
            if isinstance(content, str):
                content = content.encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", mime + ("; charset=utf-8" if mime.startswith("text/") else ""))
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(content)

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            try:
                if path == "/":
                    return self.reply(PAGE, "text/html")
                if path == "/api/status":
                    jobs = [{key: value for key, value in job.items() if key not in {"body", "preferences", "config", "source", "digest"}} for job in store.jobs()]
                    return self.reply(json.dumps({"jobs": jobs, "events": store.events()}))
                if path.startswith("/job/"):
                    job = store.get(path.removeprefix("/job/"))
                    detail = {key: value for key, value in job.items() if key not in {"body", "preferences", "config"}}
                    detail["events"] = store.events(job["id"])
                    return self.reply(json.dumps(detail, indent=2), "text/plain")
                if path.startswith("/play/"):
                    parts = path.split("/")
                    job = store.get(parts[2])
                    if job["status"] not in {"ready", "demo_ready"}:
                        raise ValueError("Job has no verified build")
                    if len(parts) == 3:
                        self.send_response(302)
                        self.send_header("Location", path + "/")
                        return self.end_headers()
                    base = (Path(job["folder"]) / "dist").resolve()
                    target = (base / ("/".join(parts[3:]) or "index.html")).resolve()
                    if not target.is_relative_to(base) or not target.is_file():
                        raise ValueError("Not found")
                    return self.reply(target.read_bytes(), mimetypes.guess_type(target.name)[0] or "application/octet-stream")
                return self.reply("Not found", "text/plain", 404)
            except (ValueError, OSError, IndexError):
                return self.reply("Not found", "text/plain", 404)
    return Handler


def serve(store, port=8765):
    if not 1 <= port <= 65535:
        raise ValueError("Port must be between 1 and 65535")
    server = ThreadingHTTPServer(("127.0.0.1", port), handler(store))
    print(f"Monitor and local play links: http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
