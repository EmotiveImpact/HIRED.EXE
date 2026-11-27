// The guestbook: the Guestbook window on the desktop (src/guestbook.js) reads the entries with
// GET and signs with POST. Entries are kept for good in the guestbook table, beside the visitor
// log. Names and messages are plain text: this stores them as typed and the window shows them
// as text, never as HTML. Nothing here can remove an entry; the applicant hides one from the
// private visitors page (stats.js), which posts back here with the page's key.
//
// The table, made once in the database (the site's role may read and add rows, and change only "hidden"):
//   create table guestbook (id bigint generated always as identity primary key, at timestamptz not null default now(),
//     name text not null check (char_length(name) between 1 and 40), message text not null check (char_length(message) between 1 and 500),
//     who text, visit text, source text, hidden boolean not null default false);
//   create index guestbook_at on guestbook (at desc);
//   grant select, insert on guestbook to hire_site; grant update (hidden) on guestbook to hire_site;
'use strict';
const crypto = require('node:crypto');
const {sql, isBot, rightKey} = require('./_visits.js');

const NAME_MAX = 40, MESSAGE_MAX = 500, LINES_MAX = 8, SHOWN = 200;
// One signer may sign a few times; the whole book takes only so many a day and so many in all.
const LIMITS = {signerHour: 4, signerDay: 10, bookDay: 300, book: 5000};

// Invisible and direction-changing characters go, and a pile of accents on one letter is trimmed.
const tidy = value => String(value).normalize('NFC')
  .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, '')
  .replace(/(\p{M}{2})\p{M}+/gu, '$1');
const cleanName = value => typeof value === 'string' ? tidy(value).replace(/\s+/g, ' ').trim() : '';
function cleanMessage(value) {
  if (typeof value !== 'string') return '';
  const lines = tidy(value).replace(/\r\n?/g, '\n').split('\n').map(line => line.replace(/[^\S\n]+/g, ' ').trim());
  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().split('\n');
  // A long run of short lines is folded into its last line, so one entry cannot fill the window.
  if (text.length > LINES_MAX) text.splice(LINES_MAX - 1, Infinity, text.slice(LINES_MAX - 1).filter(Boolean).join(' '));
  return text.join('\n');
}
const length = text => [...text].length;
const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|info|biz|ru|cn|xyz|top|site|online|shop|click|link|ly)\b/i;
const RUDE = /\b(f+u+c+k+\w*|c+u+n+t+s?|w+a+n+k+\w*|n+i+g+g+\w*|f+a+g+g*o*t*s?|r+e+t+a+r+d+\w*|k+i+k+e+s?|tw+a+t+s?|b+i+t+c+h+\w*|sh[i1]+t+\w*|a+r+s+e+h+o+l+e+s?|a+s+s+h+o+l+e+s?|d+i+c+k+h+e+a+d+s?)\b/i;

// What is wrong with an entry, or '' when it can go in the book.
function refusal(name, message) {
  if (!name) return 'name';
  if (!message) return 'message';
  if (length(name) > NAME_MAX || length(message) > MESSAGE_MAX) return 'long';
  if (LINK.test(name) || LINK.test(message)) return 'link';
  if (RUDE.test(name) || RUDE.test(message)) return 'rude';
  return '';
}

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 4000) break; }
  return body;
}
function parse(body) {
  try { const data = JSON.parse(body); if (data && typeof data === 'object') return data; } catch (_) { /* A form post, then. */ }
  return Object.fromEntries(new URLSearchParams(body));
}

// The signer, for the limits only: the address is mixed with the date and a secret and the
// result cannot be turned back into it. The address itself is never stored.
function signer(req) {
  const address = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const secret = process.env.HIRE_STATS_KEY || process.env.HIRE_VISITS_DB || '';
  return crypto.createHash('sha256').update(address + '|' + new Date().toISOString().slice(0, 10) + '|' + secret).digest('hex').slice(0, 20);
}

const STAMP = `to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const entry = ([id, name, message, at]) => ({id: Number(id), name, message, at});

function answer(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function list(res) {
  const rows = await sql(`select id, name, message, ${STAMP}, count(*) over () from guestbook where not hidden order by at desc, id desc limit ${SHOWN}`);
  answer(res, 200, {entries: rows.map(entry), total: rows.length ? Number(rows[0][4]) : 0});
}

async function sign(req, res) {
  const ua = String(req.headers['user-agent'] || '');
  let sameSite = false;
  try { sameSite = new URL(req.headers.origin).host === req.headers.host; } catch (_) { /* No origin: not this site's window. */ }
  if (!sameSite || isBot(ua)) return answer(res, 403, {error: 'closed'});
  const body = await readBody(req);
  if (body.length > 4000) return answer(res, 413, {error: 'long'});
  const data = parse(body);
  const name = cleanName(data.name), message = cleanMessage(data.message);
  // The window has a box no person can see. Whatever fills it in is thanked and not kept.
  if (data.website) return answer(res, 200, {entry: {id: 0, name, message, at: new Date().toISOString()}});
  const wrong = refusal(name, message);
  if (wrong) return answer(res, 422, {error: wrong});
  const who = signer(req);
  const [[same, hour, day, bookDay, book]] = await sql(
    `select (select count(*) from guestbook where name = $1::text and message = $2::text and at > now() - interval '1 day'),
            (select count(*) from guestbook where who = $3::text and at > now() - interval '1 hour'),
            (select count(*) from guestbook where who = $3::text and at > now() - interval '1 day'),
            (select count(*) from guestbook where at > now() - interval '1 day'),
            (select count(*) from guestbook)`, [name, message, who]);
  // Pressed twice: the entry already in the book is the answer.
  if (Number(same)) {
    const rows = await sql(`select id, name, message, ${STAMP} from guestbook where name = $1::text and message = $2::text order by at desc limit 1`, [name, message]);
    return answer(res, 200, {entry: entry(rows[0])});
  }
  if (Number(hour) >= LIMITS.signerHour || Number(day) >= LIMITS.signerDay) return answer(res, 429, {error: 'often'});
  if (Number(bookDay) >= LIMITS.bookDay || Number(book) >= LIMITS.book) return answer(res, 429, {error: 'full'});
  const visit = /^[a-z0-9]{12}$/.test(data.visit) ? data.visit : null;
  const source = typeof data.source === 'string' ? data.source.replace(/[^\w .-]/g, '').slice(0, 40) || null : null;
  const rows = await sql(
    `insert into guestbook (name, message, who, visit, source) values ($1::text, $2::text, $3::text, $4::text, $5::text)
     returning id, name, message, ${STAMP}`, [name, message, who, visit, source]);
  answer(res, 200, {entry: entry(rows[0])});
}

// From the private visitors page: hide an entry from the window, or show it again.
async function moderate(req, res, key) {
  if (req.method !== 'POST' || !rightKey(key)) { res.statusCode = 404; return res.end('Not found.'); }
  const data = parse(await readBody(req));
  const id = Number(data.hide || data.show);
  if (Number.isInteger(id) && id > 0) await sql('update guestbook set hidden = $2::boolean where id = $1::bigint', [id, data.hide ? 'true' : 'false']);
  res.statusCode = 303;
  res.setHeader('Location', '/api/stats?key=' + encodeURIComponent(key) + '#guestbook');
  res.end();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    const key = new URL(req.url, 'https://hireexe.me').searchParams.get('key');
    if (key !== null) { res.setHeader('Referrer-Policy', 'no-referrer'); return await moderate(req, res, key); }
    if (req.method === 'GET') return await list(res);
    if (req.method === 'POST') return await sign(req, res);
    answer(res, 405, {error: 'closed'});
  } catch (error) {
    console.error('guestbook:', error.message);
    answer(res, 500, {error: 'down'});
  }
};
Object.assign(module.exports, {cleanName, cleanMessage, refusal, NAME_MAX, MESSAGE_MAX});
