// The private page that shows what visitors did: /api/stats?key=... where the key is
// HIRE_STATS_KEY on the Vercel project. Without the right key it answers 404, like any
// page that is not there. Every visit is listed with its place, device and the moments
// src/track.js noted, newest first.
'use strict';
const crypto = require('node:crypto');
const {sql} = require('./_visits.js');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clock = secs => Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
const stayed = secs => secs < 60 ? secs + ' s' : Math.floor(secs / 60) + ' min ' + (secs % 60 ? secs % 60 + ' s' : '');
const countries = new Intl.DisplayNames(['en-GB'], {type: 'region'});
const country = code => { try { return countries.of(code); } catch (_) { return code; } };
const PERIODS = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [365, 'A year']];

function rightKey(given) {
  const key = process.env.HIRE_STATS_KEY || '';
  const a = Buffer.from(String(given || '')), b = Buffer.from(key);
  return key.length >= 12 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function page(rows, days, key) {
  const visits = new Map();
  for (const [id, when, name, detail, secs, code, , city, device, browser, os, referrer, source] of rows) {
    let v = visits.get(id);
    if (!v) visits.set(id, v = {when, moments: [], last: 0});
    v.last = Math.max(v.last, Number(secs) || 0);
    v.place ||= [city, code && country(code)].filter(Boolean).join(', ');
    v.device ||= [device, [browser, os].filter(Boolean).join(' on ')].filter(Boolean).join(', ');
    v.referrer ||= referrer; v.source ||= source;
    if (name !== 'Arrived' && name !== 'Away') v.moments.push({name, detail, secs: Number(secs) || 0});
  }
  const list = [...visits.values()];
  // Notes sent close together can reach the database out of turn, so each visit is put back in the order it happened.
  for (const v of list) v.moments.sort((a, b) => a.secs - b.secs);
  const did = test => list.filter(v => v.moments.some(test)).length;
  const tiles = [
    ['Visits', list.length],
    ['Played the game', did(m => m.name === 'World started')],
    ['Reached the interview', did(m => m.name === 'Interview reached')],
    ['Finished the game', did(m => m.name === 'Game completed')],
    ['Opened a CV', did(m => /\bCV\b/.test(m.detail))]
  ];
  const tally = new Map();
  for (const v of list) for (const what of new Set(v.moments.map(m => m.name + (m.detail ? ': ' + m.detail : '')))) tally.set(what, (tally.get(what) || 0) + 1);
  const popular = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const link = d => '/api/stats?key=' + encodeURIComponent(key) + '&days=' + d;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>HIRE.EXE visitors</title><style>
:root{color-scheme:light dark;--bg:#f3f1ea;--card:#fff;--ink:#1c1a2e;--soft:#625f78;--line:#d9d5c8;--accent:#2a3f9d;--chip:#ecebf6}
@media(prefers-color-scheme:dark){:root{--bg:#14132a;--card:#1e1c3a;--ink:#f1eefc;--soft:#aaa6c6;--line:#353260;--accent:#ffc956;--chip:#2a2850}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 56px}h1{font:700 22px/1.2 ui-monospace,Menlo,Consolas,monospace;margin:0 0 4px}
h1 span{color:var(--accent)}h2{font-size:15px;margin:32px 0 10px;text-transform:uppercase;letter-spacing:.08em;color:var(--soft)}
p{margin:0}.soft{color:var(--soft)}nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 20px}
nav a{padding:5px 12px;border:1px solid var(--line);border-radius:999px;color:inherit;text-decoration:none;background:var(--card)}
nav a[aria-current]{background:var(--accent);border-color:var(--accent);color:var(--bg);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.tile,.visit,table{background:var(--card);border:1px solid var(--line);border-radius:10px}
.tile{padding:12px 14px}.tile b{display:block;font-size:28px;line-height:1.1;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden}td{padding:7px 14px;border-top:1px solid var(--line)}
tr:first-child td{border-top:0}td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.visit{padding:14px 16px;margin-bottom:10px}.visit header{display:flex;gap:6px 14px;flex-wrap:wrap;align-items:baseline}
.visit header strong{font-size:16px}.visit ol{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.visit li{background:var(--chip);border-radius:6px;padding:2px 8px;font-size:13.5px}.visit li time{color:var(--soft);margin-right:6px;font-variant-numeric:tabular-nums}
.empty{padding:28px 16px;text-align:center;color:var(--soft);background:var(--card);border:1px dashed var(--line);border-radius:10px}
</style></head><body><main>
<h1>HIRE<span>.EXE</span> visitors</h1>
<p class="soft">What people did on hireexe.me. Times are London time. No cookies and no IP addresses are kept, so each page load counts as its own visit.</p>
<nav aria-label="Period">${PERIODS.map(([d, label]) => `<a href="${esc(link(d))}"${d === days ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
<div class="tiles">${tiles.map(([label, n]) => `<div class="tile"><b>${n}</b>${label}</div>`).join('')}</div>
${list.length ? `<h2>Each visit, newest first</h2>
${list.map(v => `<section class="visit"><header><strong>${esc(v.when)}</strong><span>${esc(v.place || 'Place unknown')}</span><span class="soft">${esc(v.device)}</span>${
  v.source || v.referrer ? `<span class="soft">from ${esc([v.source, v.referrer].filter(Boolean).join(' via '))}</span>` : ''}<span class="soft">stayed ${esc(stayed(v.last))}</span></header>${
  v.moments.length ? `<ol>${v.moments.map(m => `<li><time>${clock(m.secs)}</time>${esc(m.name)}${m.detail ? ': ' + esc(m.detail) : ''}</li>`).join('')}</ol>` : '<p class="soft">Looked at the desktop and opened nothing.</p>'}</section>`).join('')}
<h2>What they did</h2>
${popular.length ? `<table>${popular.map(([what, n]) => `<tr><td>${esc(what)}</td><td>${n} ${n === 1 ? 'visit' : 'visits'}</td></tr>`).join('')}</table>` : '<p class="empty">Nobody has opened anything yet.</p>'}`
  : '<h2>Each visit</h2><p class="empty">No visits in this period yet.</p>'}
</main></body></html>`;
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://hireexe.me');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const key = url.searchParams.get('key');
  if (!rightKey(key)) { res.statusCode = 404; return res.end('<!doctype html><title>404</title><p>Not found.</p>'); }
  const days = PERIODS.map(p => p[0]).includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  try {
    // "Today" means since midnight in London; the longer periods count back whole days.
    const rows = await sql(
      `select visit, to_char(min(at) over (partition by visit) at time zone 'Europe/London', 'Dy DD Mon, HH24:MI'),
              name, detail, secs, country, region, city, device, browser, os, referrer, source
       from visit_events
       where at >= case when $1::int = 1 then date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London'
                        else now() - $1::int * interval '1 day' end
       order by min(at) over (partition by visit) desc, at, id
       limit 20000`, [days]);
    res.statusCode = 200;
    res.end(page(rows, days, key));
  } catch (error) {
    console.error('visitor page:', error.message);
    res.statusCode = 500;
    res.end('<!doctype html><title>HIRE.EXE visitors</title><p>The visitor database did not answer. Try again in a moment.</p>');
  }
};
