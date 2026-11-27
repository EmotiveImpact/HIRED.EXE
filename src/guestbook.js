// Guestbook: visitors sign their name and leave a few words, and every later visitor can read
// them. The entries are kept by this site's own /api/guestbook in the applicant's database.
// Names and messages are only ever shown as plain text. An email address is optional, goes to the
// applicant alone and never comes back to this window. A copy of the site that cannot reach
// the book (an offline edition, a local file, a test server) opens the window and says so.
(function (H) {
  'use strict';
  const wm = H.wm;
  const ID = 'guestbook', NAME_MAX = 40, MESSAGE_MAX = 500, EMAIL_MAX = 120;
  const live = /^(www\.)?hireexe\.me$/.test(location.hostname) || location.hostname.endsWith('.vercel.app');
  const address = () => globalThis.HIRED_GUESTBOOK_URL || (live ? '/api/guestbook' : '');
  H.guestbookIcon = H.linkIcon('Guestbook');

  // Why an entry was not taken, in the book's own words.
  const WHY = {
    name: 'The guestbook needs a name. It need not be your real one, but it does have to be there.',
    message: 'A name and nothing else. Mysterious. Add a few words.',
    long: 'A little shorter, please. It is a guestbook, not a memoir.',
    email: 'That does not look like an email address. Correct it, or leave the box empty.',
    link: 'No links, please. This is a guestbook, not a lamp post.',
    rude: 'The guestbook has read that and would rather not keep it.',
    often: 'That is enough signing for now. Leave some pages for the others.',
    full: 'The guestbook has taken all it can today. Try again tomorrow.',
    down: 'The guestbook is not answering. It is not you. Try again in a moment.'
  };
  // The second sentence is dropped when the window is too short to spare the line.
  const INTRO = ['Sign your name and say what you thought.', 'Praise, complaints and job offers are all accepted.'];
  const day = new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
  const plural = n => n + (n === 1 ? ' entry' : ' entries');
  // What the last visit to the book brought back, so the window fills at once when it is opened again.
  let entries = null, total = 0, state = address() ? 'loading' : 'offline';

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  H.guestbook = function ({iconId = 'guestbook-icon', defaultGeo, onGeometry} = {}) {
    const running = wm.get(ID);
    if (running?.el.isConnected) {
      if (running.state === 'min') wm.restore(ID); else wm.activate(ID);
      return running.el;
    }
    const win = wm.openApp({
      id: ID, title: 'Guestbook', icon: H.guestbookIcon, iconId, className: 'guestbook-window', closeId: 'guestbook-close',
      resizable: true, maximisable: true, minSize: [220, 150], defaultGeo, onGeometry,
      focus: () => document.getElementById('guestbook-sign')?.focus({preventScroll: true}),
      body: '<div class="gb"><div class="gb-list" tabindex="0" role="region" aria-label="Guestbook entries"></div>' +
        '<div class="gb-foot"><span class="gb-status" role="status"></span><button type="button" class="gb-sign" id="guestbook-sign">' + wm.mnemonic('&Sign the Guestbook...').html + '</button></div></div>'
    });
    const list = win.querySelector('.gb-list'), status = win.querySelector('.gb-status'), signButton = win.querySelector('.gb-sign');

    function render(said) {
      const intro = element('p', 'gb-intro');
      intro.append(element('span', '', INTRO[0]), ' ', element('span', 'gb-more', INTRO[1]));
      const rows = [intro];
      const note = state === 'offline' ? 'The guestbook is kept at hireexe.me. This copy cannot reach it.'
        : state === 'down' && !entries ? WHY.down
        : !entries ? 'Opening the guestbook...'
        : !entries.length ? 'Nobody has signed yet. Being first is awkward, but somebody has to.' : '';
      if (note) rows.push(element('p', 'gb-note', note));
      for (const e of entries || []) {
        const row = element('article', 'gb-entry'), head = element('header');
        const when = new Date(e.at);
        head.append(element('b', '', e.name), element('time', '', isNaN(when) ? '' : day.format(when)));
        row.append(head, element('p', '', e.message));
        rows.push(row);
      }
      if (entries && total > entries.length) rows.push(element('p', 'gb-note', 'And ' + plural(total - entries.length).replace(/ /, ' earlier ') + '.'));
      list.replaceChildren(...rows);
      status.textContent = said || (entries ? plural(total) : '');
      signButton.disabled = state === 'offline';
    }

    async function load() {
      if (!address()) return;
      try {
        const response = await fetch(address(), {headers: {Accept: 'application/json'}});
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();
        entries = Array.isArray(data.entries) ? data.entries : [];
        total = Number.isFinite(data.total) ? data.total : entries.length;
        state = 'open';
      } catch (_) { state = 'down'; }
      if (win.isConnected) render();
    }

    function sign() {
      if (state === 'offline') return;
      const field = (label, control) => { const m = wm.mnemonic(label); return '<div class="w31-field"><label for="gb-' + control.name + '" data-key="' + m.key + '">' + m.html + '</label>' + control.html + '</div>'; };
      wm.dialog({
        title: 'Sign the Guestbook', owner: win, layout: 'side', className: 'gb-dialog',
        body: field('&Name:', {name: 'name', html: '<input id="gb-name" name="name" maxlength="' + NAME_MAX + '" autocomplete="name" autocapitalize="words" spellcheck="false">'}) +
          field('&Email:', {name: 'email', html: '<input id="gb-email" name="email" type="email" inputmode="email" maxlength="' + EMAIL_MAX + '" autocomplete="email" autocapitalize="off" spellcheck="false">'}) +
          '<p class="gb-hint gb-private">Optional. Only ' + wm.esc(globalThis.HIRED_EDITION?.applicant?.split(' ')[0] || 'the applicant') + ' sees it, to say thank you or to connect. It is never shown and never shared.</p>' +
          field('&Message:', {name: 'message', html: '<textarea id="gb-message" name="message" maxlength="' + MESSAGE_MAX + '" rows="5"></textarea>'}) +
          // Left empty by people, who cannot see it.
          '<input class="gb-website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<p class="gb-hint">Your name and message are shown to everyone who visits, and they stay in the book.</p>',
        buttons: [{label: '&Sign', value: 'sign', default: true, id: 'guestbook-ok'}, {label: 'Cancel', value: 'cancel', cancel: true, id: 'guestbook-cancel'}],
        onButton: async (value, v, box) => {
          if (value !== 'sign') return;
          const refuse = async why => { await wm.message({title: 'Guestbook', icon: 'exclaim', text: Object.hasOwn(WHY, why) ? WHY[why] : WHY.down}); return false; };
          const name = v.name.replace(/\s+/g, ' ').trim(), message = v.message.trim(), email = (v.email || '').replace(/\s+/g, '');
          if (!name || !message) { const keep = await refuse(name ? 'message' : 'name'); box.querySelector(name ? '#gb-message' : '#gb-name')?.focus({preventScroll: true}); return keep; }
          if (email && !/^[^@]+@[^@]+\.[^@.]+$/.test(email)) { const keep = await refuse('email'); box.querySelector('#gb-email')?.focus({preventScroll: true}); return keep; }
          const buttons = [...box.querySelectorAll('.w31-buttons button')];
          for (const b of buttons) b.disabled = true;
          let why = 'down';
          try {
            const arrived = H.track?.live ? H.track.log[0] : null;
            const response = await fetch(address(), {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'},
              body: JSON.stringify({name, message, email, website: v.website, visit: arrived?.v, source: arrived?.f})});
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.entry) {
              // An entry the unseen box caught comes back with no number, and is shown to its sender alone.
              if (!(entries || []).some(e => e.id && e.id === data.entry.id)) { entries = [data.entry, ...(entries || [])]; total++; }
              state = 'open';
              render('Signed. Thank you. It is in ink now.');
              list.scrollTop = 0;
              H.track?.('Guestbook signed');
              return;
            }
            why = data.error || 'down';
          } catch (_) { /* The book could not be reached. */ }
          for (const b of buttons) b.disabled = false;
          return refuse(why);
        }
      });
    }

    signButton.addEventListener('click', sign);
    win.addEventListener('keydown', e => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyS' && !wm.dialogOpen()) { e.preventDefault(); sign(); }
    });
    render();
    load();
    return win;
  };
})(globalThis.Hired);
