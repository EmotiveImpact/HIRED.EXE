// The visitor log: src/track.js posts one small note per moment and this adds a row to
// visit_events. No cookies are set or read and the IP address is never stored; the town and
// country are the ones Vercel works out for every request. It always answers 204, whatever happened.
'use strict';
const {sql, describeBrowser, isBot} = require('./_visits.js');

const text = (value, max) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const header = (req, name) => {
  const value = req.headers[name];
  if (typeof value !== 'string' || !value) return null;
  try { return decodeURIComponent(value).slice(0, 80); } catch (_) { return value.slice(0, 80); }
};

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2000) break; }
  return body;
}

module.exports = async function handler(req, res) {
  res.statusCode = 204;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const ua = String(req.headers['user-agent'] || '');
    const fromSite = /^https:\/\/(www\.)?hireexe\.me$/.test(req.headers.origin || '');
    if (req.method !== 'POST' || !fromSite || isBot(ua)) return res.end();
    const body = await readBody(req);
    if (body.length > 2000) return res.end();
    const event = JSON.parse(body);
    const visit = text(event.v, 16), name = text(event.n, 60);
    if (!/^[a-z0-9]{12}$/.test(visit) || !name) return res.end();
    const secs = Number.isFinite(event.s) ? Math.max(0, Math.min(86400, Math.round(event.s))) : null;
    const seen = describeBrowser(ua);
    // A visit is capped at 200 rows and a day at 20,000, so nobody can fill the database for sport.
    await sql(
      `insert into visit_events (visit, name, detail, secs, country, region, city, device, browser, os, referrer, source)
       select $1::text, $2::text, $3::text, $4::int, $5::text, $6::text, $7::text, $8::text, $9::text, $10::text, $11::text, $12::text
       where (select count(*) from visit_events where visit = $1::text) < 200
         and (select count(*) from visit_events where at > now() - interval '1 day') < 20000`,
      [visit, name, text(event.d, 120), secs,
        header(req, 'x-vercel-ip-country'), header(req, 'x-vercel-ip-country-region'), header(req, 'x-vercel-ip-city'),
        seen.device, seen.browser, seen.os, text(event.r, 80) || null, text(event.f, 40) || null]);
  } catch (error) {
    console.error('visitor log:', error.message);
  }
  res.end();
};
