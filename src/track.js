// What visitors do, for the applicant to read: one small note per moment, sent to this site's
// own /api/t and kept in the applicant's database. No cookies, no storage, no third parties,
// no IP address kept. The visit id is random and lasts one page load. Nothing is sent from
// the offline editions, local files, test servers, or a browser that asks not to be tracked.
// Open the site once with ?notrack to leave this browser out (the owner's own visits);
// ?track puts it back.
(function (H) {
  'use strict';
  const URL_PATH = '/api/t', OPT_OUT = 'hired-exe:notrack', LIMIT = 150;
  const query = new URLSearchParams(location.search);
  let optedOut = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  try {
    if (query.has('notrack')) localStorage.setItem(OPT_OUT, '1');
    else if (query.has('track')) localStorage.removeItem(OPT_OUT);
    optedOut ||= localStorage.getItem(OPT_OUT) === '1';
  } catch (_) { /* Storage can be blocked. The visit is still counted. */ }
  const live = /^(www\.)?hireexe\.me$/.test(location.hostname) && !optedOut;
  const visit = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join('');
  const seen = new Set(), log = [];
  let away = 0;

  function send(event) {
    log.push(event);
    if (log.length > LIMIT) log.shift();
    if (!live) return;
    const body = JSON.stringify(event);
    try { if (navigator.sendBeacon?.(URL_PATH, body)) return; } catch (_) { /* Fall through to fetch. */ }
    fetch(URL_PATH, {method: 'POST', body, keepalive: true}).catch(() => {});
  }
  const seconds = () => Math.round(performance.now() / 1000);

  // Each moment counts once per visit: opening CV.PDF three times is one line in the story.
  function track(name, detail) {
    name = String(name).slice(0, 60);
    detail = detail == null ? '' : String(detail).replace(/\s+/g, ' ').trim().slice(0, 120);
    const key = name + '|' + detail;
    if (seen.has(key) || seen.size >= LIMIT) return;
    seen.add(key);
    send({v: visit, n: name, d: detail, s: seconds()});
  }
  track.log = log;
  track.live = live;

  // Program Manager items: note the label of whatever is opened, by double-click, Enter or File > Run.
  track.items = items => {
    for (const item of Object.values(items)) {
      if (typeof item.open !== 'function') continue;
      const open = item.open;
      item.open = function () { track('Opened', item.label); return open.apply(this, arguments); };
    }
    return items;
  };

  // Links. Program Manager cancels the click that only selects an icon, so what reaches here
  // un-cancelled is a real visit to the link.
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!a || e.defaultPrevented) return;
    const href = a.getAttribute('href');
    if (/^(#|javascript:|blob:)/i.test(href)) return;
    if (a.classList.contains('pm-item')) { track('Opened', a.title); return; }
    const label = a.textContent;
    let where = 'this site';
    try {
      const url = new URL(a.href);
      where = url.protocol === 'mailto:' ? 'email' : url.host && url.host !== location.host ? url.host : 'this site';
    } catch (_) { /* Keep the default. */ }
    track('Link clicked', label + ' (' + where + ')');
  });

  // How long they stayed: the last of these gives the time on the page.
  function leaving() { if (away++ < 20) send({v: visit, n: 'Away', d: '', s: seconds()}); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); });
  addEventListener('pagehide', leaving);

  // The first note says where they came from: the referring site's name only, and an
  // optional label from the link itself, as in hireexe.me/?from=email.
  let referrer = '';
  try { const host = new URL(document.referrer).host; if (host && host !== location.host) referrer = host.replace(/^www\./, ''); } catch (_) { /* No referrer. */ }
  const source = (query.get('from') || query.get('ref') || query.get('utm_source') || '').replace(/[^\w .-]/g, '').slice(0, 40);
  seen.add('Arrived|');
  send({v: visit, n: 'Arrived', d: '', s: 0, r: referrer.slice(0, 80), f: source,
    w: matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'});

  H.track = track;
})(globalThis.Hired = globalThis.Hired || {});
