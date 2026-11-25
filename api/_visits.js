// Shared by the visitor log (t.js) and its private page (stats.js). The site keeps no packages,
// so this talks to the Neon database over HTTPS, the way Neon's own serverless driver does.
// HIRE_VISITS_DB is the connection string of a role that can only read and add rows in
// visit_events; it is set on the Vercel project, never in the repository.
'use strict';

async function sql(query, params = []) {
  const db = process.env.HIRE_VISITS_DB;
  if (!db) throw new Error('HIRE_VISITS_DB is not set');
  const response = await fetch('https://' + new URL(db).hostname + '/sql', {
    method: 'POST',
    headers: {
      'Neon-Connection-String': db, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({query, params})
  });
  if (!response.ok) throw new Error('Visitor database answered ' + response.status);
  return (await response.json()).rows;
}

// Enough of the user agent to say "a phone, Safari on iOS". Nothing else about the browser is kept.
function describeBrowser(ua) {
  const app = /LinkedInApp/.test(ua) ? 'LinkedIn app' : /Slack/.test(ua) ? 'Slack app' : /WhatsApp/.test(ua) ? 'WhatsApp'
    : /FBAN|FBAV|Instagram/.test(ua) ? 'Meta app' : '';
  const browser = app || (/Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other');
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const device = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Phone' : 'Computer';
  return {browser, os, device};
}

const isBot = ua => !ua || /bot|crawl|spider|headless|preview|lighthouse|vercel|monitor|curl|wget|python|node/i.test(ua);

module.exports = {sql, describeBrowser, isBot};
