// Hire Augustus.exe: the desktop's last program. It runs an old-style Setup that
// installs the applicant, with the progress messages doing the talking, and
// ends on Setup Complete with a real way to get in touch.
(function (H) {
  'use strict';
  const wm = H.wm, esc = wm.esc;
  const ID = 'hire-setup';
  H.setupIcon = '<span class="pm-glyph pm-glyph-setup" aria-hidden="true"><svg viewBox="0 0 32 32">' +
    '<path d="M3.5 2.5h22l3 3v24h-25z" fill="#000080" stroke="#000"/>' +
    '<rect x="8.5" y="2.5" width="14" height="9" fill="#c0c0c0" stroke="#000"/><rect x="17" y="4" width="3" height="6" fill="#000080"/>' +
    '<rect x="6.5" y="15.5" width="19" height="14" fill="#fff" stroke="#000"/><path d="M9 19.5h14M9 22.5h14M9 25.5h9" stroke="#000080"/></svg></span>';

  // The feed line shows as the step starts; the second line lands halfway through.
  // An edition can supply its own list as setupSteps, to answer that employer's advert.
  const STEPS = [
    {file: 'DESK.IN_', act: 'Checking available desk space...', aside: 'Space required: one desk. Space available: Setup was too polite to ask.', to: 10},
    {file: 'EDITING.DL_', act: 'Uncompressing twenty years of film and editing...', aside: 'This may take a while. It took twenty years the first time.', to: 22},
    {file: 'DIRECTOR.DL_', act: 'Installing creative direction...', aside: 'Includes saying “it’s nearly there” and meaning it.', to: 34},
    {file: 'AGENTS.IN_', act: 'Configuring AI coding agents...', aside: 'They have been told to ask before deleting anything. They have asked twice already.', to: 46},
    {disk: true, file: 'REFS.TX_', act: 'Reading Disk 2 (References)...', aside: 'References available on request. As is traditional.', to: 58},
    {file: 'SALARY.IN_', act: 'Writing salary expectations...', aside: 'Set to “competitive”. Two can play at that game.', to: 68},
    {file: 'KETTLE.SY_', act: 'Locating the office kettle...', aside: 'Found. The first round is on Augustus.', to: 78},
    {file: 'COVERLET.TX_', act: 'Deleting “I look forward to hearing from you”...', aside: 'It had been looking forward for some time.', to: 88},
    {file: 'ETHIC.DL_', act: 'Installing work ethic...', aside: 'Still at 97%. It’s staying late to finish.', to: 97, stall: true}
  ];

  H.hireSetup = function ({E = globalThis.HIRED_EDITION || {}, icon = H.setupIcon, iconId = 'setup-icon', safeLink = v => v, openInternet = null} = {}) {
    // Opening Hire Augustus.exe again returns to the Setup already running.
    const running = wm.get(ID);
    if (running?.el.isConnected) {
      if (running.state === 'min') wm.restore(ID); else wm.activate(ID);
      return running.el;
    }
    const person = E.applicant || 'Augustus Edem', first = person.split(' ')[0];
    const company = E.company || 'your company';
    const folder = 'C:\\' + ((E.company || 'Work').split(/\s+/)[0].replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'WORK');
    const email = safeLink(E.contactUrl);
    // The address on its own, shown in a box to copy rather than fired at a mail program.
    const address = /^mailto:/i.test(email || '') ? decodeURIComponent(email.slice(7).split('?')[0]) : '';
    const steps = Array.isArray(E.setupSteps) && E.setupSteps.length ? E.setupSteps : STEPS;
    let stage = 'welcome', paused = false, asking = false, target = folder;

    const win = wm.openApp({
      id: ID, title: 'Hire Augustus Setup', icon, iconId, className: 'setup-window', resizable: true, maximisable: true, minSize: [300, 320],
      onClose: () => {
        if (stage === 'done') return true;
        confirmExit();
        return false;
      },
      body: '<div class="setup-stage"><p class="setup-brand" aria-hidden="true">Hire Augustus Setup</p>' +
        '<section class="setup-box" role="group" aria-labelledby="setup-cap"><header class="setup-cap" id="setup-cap"></header>' +
        '<div class="setup-main"></div><div class="w31-buttons setup-buttons"></div></section></div>'
    });
    wm.maximise(ID);
    const box = win.querySelector('.setup-box'), cap = box.querySelector('.setup-cap');
    const main = box.querySelector('.setup-main'), buttons = box.querySelector('.setup-buttons');

    // A pause that stops while a question is on screen and ends at once if the window goes,
    // so the install below can return instead of waiting for ever.
    function wait(ms) {
      return new Promise(resolve => {
        let left = ms, last = performance.now();
        (function tick() {
          if (!win.isConnected || stage === 'done') return resolve();
          const now = performance.now();
          if (!paused) left -= now - last;
          last = now;
          if (left <= 0) resolve(); else setTimeout(tick, Math.min(60, left));
        })();
      });
    }
    function screen(title, html, list) {
      cap.textContent = title;
      main.innerHTML = html;
      buttons.innerHTML = list.map((b, i) => b.href
        ? '<a href="' + esc(b.href) + '"' + (b.id ? ' id="' + b.id + '"' : '') + (b.default ? ' class="is-default"' : '') + '>' + esc(b.label) + '</a>'
        : '<button type="button" data-i="' + i + '"' + (b.id ? ' id="' + b.id + '"' : '') + (b.default ? ' class="is-default"' : '') + '>' + esc(b.label) + '</button>').join('');
      buttons.onclick = e => { const b = e.target.closest('button[data-i]'); if (b) list[Number(b.dataset.i)].action(); };
      requestAnimationFrame(() => (main.querySelector('input') || buttons.querySelector('.is-default') || buttons.firstElementChild)?.focus({preventScroll: true}));
    }
    box.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.target.closest('.setup-buttons')) return;
      const def = buttons.querySelector('.is-default');
      if (def) { e.preventDefault(); def.click(); }
    });

    async function confirmExit() {
      if (asking || stage === 'done') return;
      asking = true; paused = true;
      const answer = await wm.message({
        title: 'Exit Setup', icon: 'exclaim', owner: win, buttons: ['&Continue', 'E&xit'],
        text: 'Setup is not complete. If you exit now, ' + esc(person) + ' will remain available to other companies.<br><br>To carry on installing, choose Continue. To leave things as they are, choose Exit.'
      });
      asking = false; paused = false;
      if (answer === 'exit') wm.remove(ID);
    }

    function welcome() {
      stage = 'welcome';
      screen('Welcome',
        '<p>Welcome to Hire Augustus Setup.</p>' +
        '<p class="setup-plain">Setup will install ' + esc(person) + ', AI-native product builder and creative director, at ' + esc(company) + '.</p>' +
        '<p class="setup-plain">It is strongly recommended that you quit all other applications before continuing. Especially the other candidates’.</p>' +
        '<label class="setup-field">Install to:<input name="path" value="' + esc(folder) + '" maxlength="40" spellcheck="false" autocomplete="off" autocapitalize="characters"></label>',
        [{label: 'Continue', id: 'setup-continue', default: true, action: () => {
          const typed = main.querySelector('input').value.trim().toUpperCase();
          target = /^[A-Z]:\\/.test(typed) ? typed.replace(/\\+$/, '') : folder;
          install();
        }}, {label: 'Exit Setup', id: 'setup-exit', action: confirmExit}]);
    }

    async function install() {
      stage = 'installing';
      screen('Hire Augustus Setup',
        '<p class="setup-file">Copying file: <span></span></p>' +
        '<div class="setup-news" role="status"><p class="setup-act"></p><p class="setup-aside"></p></div>' +
        '<div class="setup-gauge" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span>0%</span><span class="setup-fill" aria-hidden="true">0%</span></div>',
        [{label: 'Skip', id: 'setup-skip', action: () => { if (!asking) complete(); }},
         {label: 'Cancel', id: 'setup-cancel', default: true, action: confirmExit}]);
      const file = main.querySelector('.setup-file span'), act = main.querySelector('.setup-act'), aside = main.querySelector('.setup-aside');
      const gauge = main.querySelector('.setup-gauge');
      let shown = 0;
      const set = p => {
        shown = p;
        gauge.style.setProperty('--p', p + '%');
        gauge.setAttribute('aria-valuenow', String(p));
        for (const s of gauge.querySelectorAll('span')) s.textContent = p + '%';
      };
      async function fill(to, ms) {
        const from = shown, n = Math.max(1, Math.round(ms / 140));
        for (let i = 1; i <= n; i++) { await wait(ms / n); if (!win.isConnected || stage === 'done') return; set(Math.round(from + (to - from) * i / n)); }
      }
      // Files arrive compressed (EDITING.DL_) and are expanded as they are copied (EDITING.DLL).
      const step = s => {
        file.textContent = target + '\\' + s.file.replace(/\.(\w\w)_$/, (m, x) => '.' + x + ({DL: 'L', IN: 'I', TX: 'T', SY: 'S'}[x] || '_'));
        act.textContent = s.act; aside.textContent = '';
      };
      for (const s of steps) {
        // Skip jumps straight to Setup Complete, so the rest of the install stops here.
        if (!win.isConnected || stage === 'done') return;
        if (s.disk) {
          // A minimised Setup waits for its window before asking for the disk.
          while (win.isConnected && wm.get(ID)?.state === 'min') await wait(250);
          if (!win.isConnected) return;
          paused = true;
          await wm.message({title: 'Hire Augustus Setup', icon: 'info', owner: win, buttons: ['OK'],
            text: 'Please insert the disk labelled:<br><br>Hire Augustus Disk 2 (References)<br><br>into drive A:'});
          paused = false;
          if (!win.isConnected || stage === 'done') return;
        }
        step(s);
        const half = shown + Math.round((s.to - shown) / 2);
        if (s.stall) {
          await fill(s.to, 1300);
          await wait(900);
          aside.textContent = s.aside;
          await wait(2900);
          await fill(100, 500);
          await wait(400);
        } else {
          await fill(half, 900);
          aside.textContent = s.aside;
          await fill(s.to, 1700);
        }
      }
      if (win.isConnected && stage !== 'done') complete();
    }

    function showEmail() {
      H.track?.('Email address shown');
      let copied = false;
      wm.dialog({
        title: 'Send an Email', owner: win, className: 'setup-email-box',
        body: '<p>To reach ' + esc(first) + ', copy this address into your email:</p>' +
          '<input class="setup-address" id="setup-address" name="address" value="' + esc(address) + '" readonly spellcheck="false" aria-label="Email address">' +
          '<p class="setup-copied" id="setup-copied" aria-live="polite"></p>',
        buttons: [{label: '&Copy', value: 'copy', id: 'setup-copy', default: true}, {label: 'OK', value: 'ok', id: 'setup-email-ok', cancel: true}],
        init(box) { const field = box.querySelector('.setup-address'); field.addEventListener('focus', () => field.select()); },
        async onButton(value, v, box) {
          if (value !== 'copy') return true;
          H.track?.('Email address copied');
          const field = box.querySelector('.setup-address');
          field.focus(); field.select();
          try { await navigator.clipboard.writeText(address); copied = true; } catch (_) { copied = document.execCommand?.('copy') || false; }
          box.querySelector('.setup-copied').textContent = copied ? 'Copied to the Clipboard.' : 'Press Ctrl+C to copy.';
          return false;
        }
      });
    }

    function complete() {
      stage = 'done';
      H.track?.('Setup completed');
      const list = [];
      if (address) list.push({label: 'Send an Email', id: 'setup-email', default: true, action: showEmail});
      list.push({label: 'Close', id: 'setup-close', default: !list.length, action: () => wm.close(ID)});
      screen('Setup Complete',
        '<div class="setup-done"><span class="w31-icon w31-icon-info" aria-hidden="true">i</span><div>' +
        '<p>' + esc(person) + ' has been installed at ' + esc(company) + '.</p>' +
        '<p class="setup-plain">Before ' + esc(first) + ' can start, you will need to arrange an interview. Restarting your computer will not help.</p>' +
        (openInternet ? '<p class="setup-plain">To find ' + esc(first) + ' elsewhere online, open the Internet group in Program Manager.</p>' : '') + '</div></div>',
        list);
    }

    welcome();
    return win;
  };
})(globalThis.Hired);
