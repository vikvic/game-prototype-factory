import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2', '.wasm':'application/wasm', '.mp3':'audio/mpeg', '.ogg':'audio/ogg'};
export async function serve(mounts) {
  const normalized = await Promise.all(mounts.map(async m => ({...m, root: await realpath(m.root)})));
  const server = createServer(async (req,res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const mount = normalized.find(m => path.startsWith(m.prefix));
      if (!mount || path.includes('\\') || path.includes('\0')) throw Error('Invalid path');
      let target = resolve(mount.root, path.slice(mount.prefix.length) || 'index.html');
      let rel = relative(mount.root, target);
      if (rel.startsWith('..'+sep) || rel==='..' || resolve(mount.root,rel)!==target) throw Error('Traversal');
      if ((await stat(target)).isDirectory()) target = resolve(target,'index.html');
      const actual = await realpath(target);
      rel = relative(mount.root,actual);
      if (rel.startsWith('..'+sep) || rel==='..') throw Error('Linked traversal');
      res.setHeader('content-type',mime[extname(target)] || 'application/octet-stream');
      res.setHeader('cache-control','no-store'); res.end(await readFile(actual));
    } catch { res.writeHead(404,{'content-type':'text/plain'});res.end('Required file not found'); }
  });
  await new Promise((yes,no) => {server.once('error',no);server.listen(0,'127.0.0.1',yes);});
  return {base:`http://127.0.0.1:${server.address().port}`, close: async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
