// Nest & Nibble: API sinkron realtime di Cloudflare Workers + D1
const COLS = new Set(['orders', 'att', 'stock', 'day', 'cfg']);
const PATH_RE = /^(orders|att|stock|day|cfg)\/[A-Za-z0-9_.:\-]{1,80}$/;
const MAX_BODY = 200 * 1024;

const safeEq = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
    }
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const tok = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.API_TOKEN || !safeEq(tok, env.API_TOKEN)) return json({ error: 'unauthorized' }, 401);

    try {
      if (url.pathname === '/api/health') return json({ ok: true, now: Date.now() });

      // Perubahan sejak kursor. since=0 -> muat awal (tanpa yang terhapus, terfilter tanggal)
      if (url.pathname === '/api/changes' && req.method === 'GET') {
        const since = Math.max(0, parseInt(url.searchParams.get('since')) || 0);
        const cut = (url.searchParams.get('cut') || '').slice(0, 10);
        const LIMIT = 1500;
        const q = since === 0
          ? env.DB.prepare("SELECT path,col,body,updated_at,deleted FROM docs WHERE deleted=0 AND (col='cfg' OR dkey>=?1) ORDER BY updated_at ASC LIMIT ?2").bind(cut, LIMIT + 1)
          : env.DB.prepare('SELECT path,col,body,updated_at,deleted FROM docs WHERE updated_at>=?1 ORDER BY updated_at ASC LIMIT ?2').bind(since, LIMIT + 1);
        const { results } = await q.all();
        const more = results.length > LIMIT;
        const rows = more ? results.slice(0, LIMIT) : results;
        return json({
          now: Date.now(),
          more,
          max: rows.length ? rows[rows.length - 1].updated_at : since,
          docs: rows.map(r => ({ path: r.path, col: r.col, deleted: !!r.deleted, body: r.deleted ? null : JSON.parse(r.body), at: r.updated_at })),
        });
      }

      if (url.pathname === '/api/doc' && req.method === 'POST') {
        const raw = await req.text();
        if (raw.length > MAX_BODY) return json({ error: 'too large' }, 413);
        const { path, body } = JSON.parse(raw);
        if (!PATH_RE.test(path || '') || !body || typeof body !== 'object') return json({ error: 'bad request' }, 400);
        const col = path.split('/')[0];
        const dkey = String(body.d || body.date || '').slice(0, 10);
        const u = Number(body.u) || 0;
        await env.DB.prepare(
          `INSERT INTO docs (path,col,dkey,body,u,updated_at,deleted) VALUES (?1,?2,?3,?4,?5,?6,0)
           ON CONFLICT(path) DO UPDATE SET col=excluded.col, dkey=excluded.dkey, body=excluded.body, u=excluded.u, updated_at=excluded.updated_at, deleted=0
           WHERE excluded.u >= docs.u`
        ).bind(path, col, dkey, JSON.stringify(body), u, Date.now()).run();
        return json({ ok: true });
      }

      if (url.pathname === '/api/doc' && req.method === 'DELETE') {
        const path = url.searchParams.get('path') || '';
        if (!PATH_RE.test(path)) return json({ error: 'bad request' }, 400);
        await env.DB.prepare('UPDATE docs SET deleted=1, updated_at=?2 WHERE path=?1').bind(path, Date.now()).run();
        return json({ ok: true });
      }

      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error' }, 500);
    }
  },
};
