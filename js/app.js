/*
 * BRIDGET front-end demo.
 * Everything "backend" (accounts, applications, approvals, payments, notifications)
 * is simulated in localStorage so the whole journey can be clicked through.
 * In the real build these functions become API calls.
 */
(() => {
  'use strict';
  const D = window.BRIDGET_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('#app');

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // [[text]] -> redaction bar sized to the hidden text (the text itself is never rendered)
  const redact = (s) => esc(s).replace(/\[\[(.+?)\]\]/g, (_, t) => `<span class="redact" style="width:${Math.max(2, t.length * 0.55)}em" aria-label="redacted"></span>`);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA');
  const fmtStamp = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const hash = (s) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36); }; // demo only; real build uses bcrypt on the server
  const query = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const go = (path) => { location.hash = '#/' + path; };

  /* ---------- storage (falls back to memory if localStorage is blocked) ---------- */
  const mem = {};
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('bridget.' + k); if (v !== null) return JSON.parse(v); } catch (e) { /* ignore */ }
      return k in mem ? mem[k] : d;
    },
    set(k, v) { mem[k] = v; try { localStorage.setItem('bridget.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    clear() { Object.keys(mem).forEach((k) => delete mem[k]); try { Object.keys(localStorage).filter((k) => k.startsWith('bridget.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } }
  };
  const db = {
    users: () => store.get('users', []),
    apps: () => store.get('apps', []),
    notes: () => store.get('notes', []),
    anns: () => [...store.get('anns', []), ...D.announcements].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date.localeCompare(a.date)),
  };
  const me = () => { const id = store.get('session', null); return id ? db.users().find((u) => u.id === id) || null : null; };
  const getExp = (id) => D.experiences.find((e) => e.id === id);
  const seatsLeft = (e) => Math.max(0, e.seatsLeft - db.apps().filter((a) => a.expId === e.id && a.status === 'confirmed').reduce((s, a) => s + a.teamSize, 0));
  const updateApp = (id, patch) => store.set('apps', db.apps().map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const notify = (userId, text, tone = 'muted') => { const n = db.notes(); n.unshift({ id: uid(), userId, text, tone, at: Date.now(), read: false }); store.set('notes', n); };

  const STATUS = {
    submitted: { label: 'Submitted', step: 1, tone: 'muted' },
    review: { label: 'Under review', step: 2, tone: 'teal' },
    selected: { label: 'Selected · payment due', step: 3, tone: 'gold' },
    confirmed: { label: 'Confirmed', step: 4, tone: 'green' },
    waitlisted: { label: 'Waitlisted', step: 2, tone: 'muted' },
    rejected: { label: 'Not selected', step: 0, tone: 'red' },
  };
  const EXP_STATUS = { open: 'Applications open', soon: 'Coming soon', sealed: 'Sealed' };
  const PERSONAS = [
    ['solver', 'The Solver', 'Codes, patterns, logic'],
    ['explorer', 'The Explorer', 'Maps, places, movement'],
    ['strategist', 'The Strategist', 'Plans, roles, timing'],
    ['storyteller', 'The Storyteller', 'People, clues, hunches'],
  ];

  /* ---------- UI primitives ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
  }
  function openModal(html, wide = false) {
    const m = $('#modal');
    m.innerHTML = `<div class="modal-box ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button>${html}</div>`;
    m.hidden = false; document.body.style.overflow = 'hidden';
    setTimeout(() => $('.modal-box button, .modal-box a', m)?.focus(), 30);
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; document.body.style.overflow = ''; }
  const difficulty = (n) => `<span class="difficulty" aria-label="Difficulty ${n} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const statusPill = (s) => `<span class="pill ${STATUS[s].tone}">${STATUS[s].label}</span>`;
  const playIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  /* ======================================================================
     PAGES
     ====================================================================== */

  function home() {
    const next = D.experiences.find((e) => e.status === 'open');
    const anns = db.anns().slice(0, 3);
    return `
    <section class="hero">
      <div class="hero-rings" data-rings aria-hidden="true"></div>
      <div class="wrap hero-inner">
        <p class="eyebrow reveal">Goa · IRL Gaming &amp; Entertainment · Season One</p>
        <h1 class="hero-title glitch" data-text="BRIDGET" aria-label="BRIDGET">${[...'BRIDGET'].map((c, i) => `<span style="--i:${i}" aria-hidden="true">${c}</span>`).join('')}</h1>
        <p class="hero-tag reveal">Connecting the Unconnected.</p>
        <p class="hero-sub reveal">Everything is connected. <span class="gold">Can you find the connection?</span></p>
        <div class="cta-row reveal">
          <a class="btn primary" href="#/${me() ? 'experiences' : 'join'}">Request an invitation</a>
          <a class="btn ghost" href="#/experience/${next.id}">Open the first dossier</a>
        </div>
        <div class="countdown reveal" data-countdown="${next.date}T${to24(next.time)}:00+05:30">
          <span class="label">${esc(next.code)} begins in</span>
          <div class="cd-grid"><div><b data-u="d">--</b><span>days</span></div><div><b data-u="h">--</b><span>hrs</span></div><div><b data-u="m">--</b><span>min</span></div><div><b data-u="s">--</b><span>sec</span></div></div>
        </div>
      </div>
      <div class="scroll-hint">Look closer</div>
    </section>

    ${marquees()}

    <section class="section">
      <div class="ghost-word" data-parallax="0.18" aria-hidden="true">CONNECTED</div>
      <div class="wrap">
        <p class="eyebrow reveal">The concept</p>
        <p class="concept-lead reveal">Not an escape room. Not a scavenger hunt. <em>Something in between, and something more.</em> Real streets, real people, real puzzles, and a story that only reveals itself to those who play.</p>
        <div class="pillars reveal">
          ${pillar('01', 'Mystery', 'Every game begins with a question nobody has answered yet. You won’t know the rules until you need them.', '<circle cx="22" cy="22" r="14" fill="none" stroke="currentColor"/><path d="M18 18a4 4 0 1 1 5 4v3M22 30v.5" stroke="currentColor" fill="none" stroke-linecap="round"/>')}
          ${pillar('02', 'Adventure', 'Streets, beaches, riverbanks, ferries. Goa is the game board, and you’ve only seen half of it.', '<path d="M6 34 L18 14 L26 26 L31 19 L38 34 Z" fill="none" stroke="currentColor" stroke-linejoin="round"/>')}
          ${pillar('03', 'Challenge', 'Puzzles, people and places. The clues are everywhere. The hard part is seeing how they connect.', '<circle cx="10" cy="30" r="3" fill="currentColor"/><circle cx="22" cy="12" r="3" fill="currentColor"/><circle cx="34" cy="28" r="3" fill="currentColor"/><path d="M10 30 L22 12 L34 28" fill="none" stroke="currentColor" stroke-dasharray="3 3"/>')}
        </div>
      </div>
      <button class="secret ${secretFound(1)}" style="right:8%;top:70px" data-action="secret" data-n="1" aria-label="Something glints here"></button>
    </section>

    <section class="section tight">
      <div class="wrap">
        <div class="section-head"><div><p class="eyebrow reveal">How it works</p><h2 class="reveal">Four steps. One way in.</h2></div><p class="muted reveal">Seats are limited and every application is reviewed by hand. We look for curiosity, not credentials.</p></div>
        <div class="steps">
          ${step('01', 'Apply', 'Create an account and request a seat for an upcoming experience.')}
          ${step('02', 'Get selected', 'We review applications every Friday. Selected players are notified first.')}
          ${step('03', 'Confirm your seat', 'Secure payment locks your place. You have 48 hours before it moves to the waitlist.')}
          ${step('04', 'Play', 'Your first clue arrives before the game begins. Watch your phone.')}
        </div>
      </div>
      <button class="secret ${secretFound(2)}" style="left:4%;bottom:30px" data-action="secret" data-n="2" aria-label="Something glints here"></button>
    </section>

    <section class="section">
      <div class="ghost-word right" data-parallax="-0.15" aria-hidden="true">CASES</div>
      <div class="wrap">
        <div class="section-head"><div><p class="eyebrow reveal">Upcoming experiences</p><h2 class="reveal">Choose your first case.</h2></div><a class="btn ghost reveal" href="#/experiences">All experiences →</a></div>
        <div class="grid-exp">${D.experiences.slice(0, 3).map(expCard).join('')}</div>
      </div>
    </section>

    <section class="section tight">
      <div class="wrap">
        <div class="section-head"><div><p class="eyebrow reveal">Transmissions</p><h2 class="reveal">Latest announcements</h2></div><a class="btn ghost reveal" href="#/announcements">All announcements →</a></div>
        <div class="ann-strip">${anns.map(annItem).join('')}</div>
      </div>
    </section>

    <section class="section tight">
      <div class="wrap">
        <div class="section-head"><div><p class="eyebrow reveal">From the field</p><h2 class="reveal">Adventures on camera</h2></div><a class="btn ghost reveal" href="#/media">Media →</a></div>
        <div class="grid-media">${D.media.slice(0, 3).map(mediaCard).join('')}</div>
      </div>
    </section>

    <section class="section">
      <div class="wrap vision">
        <div>
          <p class="eyebrow reveal">The long game</p>
          <h2 class="reveal">Goa first.<br>Then everywhere.</h2>
          <p class="muted reveal">BRIDGET starts on the streets of Goa and grows into a nationwide network of real-life games. Every city has a story hidden in plain sight. We intend to find them all, and we’ll need players who can keep a secret.</p>
          <div class="radar reveal" data-radar aria-hidden="true"></div>
        </div>
        <ul class="cities reveal">
          <li>Goa <span class="pill open">Live · Season One</span></li>
          <li>${redact('[[Mumbai]]')} <span class="pill muted">Classified</span></li>
          <li>${redact('[[Bengaluru]]')} <span class="pill muted">Classified</span></li>
          <li>${redact('[[Delhi]]')} <span class="pill muted">Classified</span></li>
        </ul>
      </div>
      <button class="secret ${secretFound(3)}" style="right:6%;bottom:40px" data-action="secret" data-n="3" aria-label="Something glints here"></button>
    </section>

    <section class="final-cta">
      <div class="wrap">
        <p class="eyebrow reveal">${secretCount()}/3 connections found</p>
        <h2 class="reveal">The first clue is that you’re still reading.</h2>
        <p class="muted reveal">Join the list. Be first to know when seats open.</p>
        <div class="cta-row reveal"><a class="btn primary" href="#/${me() ? 'dashboard' : 'join'}">${me() ? 'Go to my dashboard' : 'Create your account'}</a></div>
      </div>
    </section>`;
  }
  function marquees() {
    const big = ['Mystery', 'Adventure', 'Treasure hunts', 'Ciphers', 'Real streets', 'Real people', 'Interactive challenges', 'Goa'];
    const small = ['Everything is connected', 'Can you find the connection', 'Season One', 'Seats are limited', 'Look closer'];
    const band = (words, outlineEvery) => {
      const set = words.map((w, i) => `<span class="${outlineEvery && i % 2 ? 'o' : ''}">${w}</span><i>✦</i>`).join('');
      return `<div class="marquee-track">${set}${set}</div>`;
    };
    return `<div class="marquees" aria-hidden="true"><div class="marquee">${band(big, true)}</div><div class="marquee rev">${band(small, false)}</div></div>`;
  }
  const pillar = (n, t, p, g) => `<div class="pillar"><span class="num">${n}</span><svg class="glyph" viewBox="0 0 44 44" aria-hidden="true" stroke-width="1.3">${g}</svg><h3>${t}</h3><p>${p}</p></div>`;
  const step = (n, t, p) => `<div class="step reveal"><div class="node">${n}</div><h3>${t}</h3><p>${p}</p></div>`;
  function to24(t) { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(t || ''); if (!m) return '10:00'; let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return String(h).padStart(2, '0') + ':' + m[2]; }

  function expCard(e) {
    const left = seatsLeft(e);
    const pct = e.seats ? Math.round(((e.seats - left) / e.seats) * 100) : 0;
    const sealed = e.status === 'sealed';
    return `
    <article class="exp-card reveal ${sealed ? 'sealed' : ''}">
      <div class="exp-top"><span class="mono muted">${esc(e.code)}</span><span class="pill ${e.status}">${EXP_STATUS[e.status]}</span></div>
      <h3>${esc(e.title)}</h3>
      <p>${esc(e.tagline)}</p>
      <dl class="exp-meta">
        <div><dt>When</dt><dd>${e.date ? fmtDate(e.date) : esc(e.dateLabel)}</dd></div>
        <div><dt>Where</dt><dd>${redact(e.location.split(',')[0])}</dd></div>
        <div><dt>Team</dt><dd>${e.teamMin === e.teamMax ? e.teamMin : `${e.teamMin}–${e.teamMax}`} players</dd></div>
      </dl>
      ${sealed ? `<div class="seats"><span class="mono muted">Difficulty</span> ${difficulty(e.difficulty)}</div>` : `<div class="seats"><div class="bar"><span style="width:${pct}%"></span></div><span class="mono">${left} of ${e.seats} seats left</span></div>`}
      <a class="btn ghost" href="#/experience/${e.id}">${sealed ? 'Attempt to open' : 'View dossier'} →</a>
    </article>`;
  }

  function experiences() {
    return `
    <section class="page-head"><div class="wrap">
      <p class="eyebrow">Season One · Goa</p>
      <h1>Experiences</h1>
      <p>Each experience is a self-contained story played out in the real world. We tell you where to be and when. Everything else, you discover.</p>
    </div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap"><div class="grid-exp">${D.experiences.map(expCard).join('')}</div></div></section>`;
  }

  function experience(id) {
    const e = getExp(id);
    if (!e) return notFound();
    const u = me();
    const mine = u && db.apps().find((a) => a.userId === u.id && a.expId === e.id);
    const left = seatsLeft(e);
    let cta;
    if (e.status === 'sealed') cta = `<button class="btn ghost block" data-action="sealed">Attempt to open the file</button>`;
    else if (e.status === 'soon') cta = `<button class="btn ghost block" data-action="notify-me" data-id="${e.id}">Notify me when it opens</button>`;
    else if (mine) cta = `<div class="notice">You applied on ${fmtStamp(mine.at)}. ${statusPill(mine.status)}</div><a class="btn ghost block" href="#/dashboard">View in dashboard</a>`;
    else if (!left) cta = `<button class="btn ghost block" disabled>Fully booked</button>`;
    else cta = `<a class="btn primary block" href="#/apply/${e.id}">Apply for a seat</a>`;

    return `
    <section class="page-head"><div class="wrap">
      <p class="eyebrow"><a href="#/experiences" class="muted">Experiences</a> / ${esc(e.code)}</p>
      <h1>${esc(e.title)}</h1>
      <p>${esc(e.tagline)}</p>
    </div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap dossier">
      <div class="paper reveal">
        <span class="stamp">${e.status === 'sealed' ? 'SEALED' : 'CONFIDENTIAL · DOSSIER ' + esc(e.code)}</span>
        <div class="briefing">${e.briefing.map((p) => `<p>${redact(p)}</p>`).join('')}</div>
        <div class="lists">
          <div class="can"><h4>What we can tell you</h4><ul>${e.canTell.map((x) => `<li>${redact(x)}</li>`).join('')}</ul></div>
          <div class="cant"><h4>What we can’t</h4><ul>${e.cantTell.map((x) => `<li>${redact(x)}</li>`).join('')}</ul></div>
        </div>
      </div>
      <aside class="side-card reveal">
        <span class="pill ${e.status}">${EXP_STATUS[e.status]}</span>
        ${e.price ? `<div class="price">${inr(e.price)}</div><p class="muted tiny">per player · taxes included</p>` : '<div class="price">—</div>'}
        <div class="kv"><span>Date</span><span>${e.date ? fmtDate(e.date) + ' · ' + esc(e.time) : esc(e.dateLabel)}</span></div>
        <div class="kv"><span>Format</span><span>${redact(e.format)}</span></div>
        <div class="kv"><span>Area</span><span>${redact(e.location)}</span></div>
        <div class="kv"><span>Duration</span><span>${redact(e.duration)}</span></div>
        <div class="kv"><span>Team size</span><span>${e.teamMin === e.teamMax ? e.teamMin : `${e.teamMin}–${e.teamMax}`}</span></div>
        <div class="kv"><span>Difficulty</span><span>${difficulty(e.difficulty)}</span></div>
        ${e.seats ? `<div class="kv"><span>Seats left</span><span class="gold">${left} / ${e.seats}</span></div>` : ''}
        <div style="margin-top:22px">${cta}</div>
      </aside>
    </div></section>`;
  }

  function annItem(a) {
    return `<article class="ann reveal ${a.pinned ? 'pinned' : ''}">
      <div><div class="date">${fmtDate(a.date)}</div>${a.pinned ? '<div class="mono gold tiny" style="margin-top:6px">PINNED</div>' : ''}</div>
      <div><span class="pill ${a.pinned ? 'gold' : 'teal'}">${esc(a.tag)}</span><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p></div>
    </article>`;
  }
  function announcements() {
    return `
    <section class="page-head"><div class="wrap"><p class="eyebrow">Transmissions</p><h1>Announcements</h1><p>New experiences, seat updates and important notices. Selected players also get these by email and WhatsApp.</p></div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap"><div class="ann-list">${db.anns().map(annItem).join('')}</div></div></section>`;
  }

  const MEDIA_CATS = { all: 'All', adventure: 'YouTube adventures', highlight: 'Game highlights', coverage: 'Event coverage' };
  let mediaFilter = 'all';
  function mediaCard(m) {
    return `<button class="media-card reveal" data-action="play" data-id="${m.id}">
      <div class="thumb" style="background:linear-gradient(135deg,hsl(${m.hue} 45% 18%),hsl(${(m.hue + 40) % 360} 35% 8%))">
        <span class="pill cat">${MEDIA_CATS[m.cat]}</span><span class="play">${playIcon}</span><span class="dur">${m.duration}</span>
      </div>
      <h3>${esc(m.title)}</h3><span class="muted tiny mono">${m.youtubeId ? 'Watch now' : 'Premieres ' + m.date}</span>
    </button>`;
  }
  function media() {
    const items = D.media.filter((m) => mediaFilter === 'all' || m.cat === mediaFilter);
    return `
    <section class="page-head"><div class="wrap"><p class="eyebrow">From the field</p><h1>Media</h1><p>Adventures, highlights and coverage. We show you what it feels like to play, never how to win.</p></div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap">
      <div class="tabs" role="tablist">${Object.entries(MEDIA_CATS).map(([k, v]) => `<button class="tab ${k === mediaFilter ? 'on' : ''}" data-action="media-filter" data-cat="${k}" role="tab" aria-selected="${k === mediaFilter}">${v}</button>`).join('')}</div>
      <div class="grid-media">${items.map(mediaCard).join('')}</div>
    </div></section>`;
  }

  function auth(mode) {
    if (me()) { go('dashboard'); return ''; }
    const next = query().get('next') || 'dashboard';
    const join = mode === 'join';
    return `
    <div class="wrap auth">
      <div class="reveal">
        <p class="eyebrow">${join ? 'Request access' : 'Welcome back'}</p>
        <p class="auth-quote">${join ? 'Every player starts as a stranger. <span class="gold">Not for long.</span>' : 'We kept your seat warm. <span class="gold">Mostly.</span>'}</p>
        <p class="muted">${join ? 'An account lets you apply for experiences, track your selection status, pay securely and receive your briefings.' : 'Log in to check your applications, payments and updates.'}</p>
      </div>
      <div class="card reveal">
        <form class="form" data-form="${mode}" data-next="${esc(next)}" novalidate>
          <h3 style="margin:0">${join ? 'Create your account' : 'Log in'}</h3>
          ${join ? `<div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>` : ''}
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
          ${join ? `<div class="row">
            <div class="field"><label for="f-phone">Mobile (WhatsApp)</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" placeholder="+91" required></div>
            <div class="field"><label for="f-city">City</label><input id="f-city" name="city" type="text" autocomplete="address-level2" placeholder="Panaji" required></div>
          </div>` : ''}
          <div class="field"><label for="f-pass">Password</label><input id="f-pass" name="password" type="password" autocomplete="${join ? 'new-password' : 'current-password'}" minlength="6" required>${join ? '<small>At least 6 characters.</small>' : ''}</div>
          ${join ? `<label class="check"><input type="checkbox" name="adult" required> I am 18 or older and agree to the terms and the code of play.</label>` : ''}
          <p class="form-error" aria-live="polite"></p>
          <button class="btn primary block" type="submit">${join ? 'Create account' : 'Log in'}</button>
          <p class="form-foot">${join ? `Already have an account? <a href="#/login?next=${encodeURIComponent(next)}">Log in</a>` : `New here? <a href="#/join?next=${encodeURIComponent(next)}">Create an account</a>`}</p>
        </form>
      </div>
    </div>`;
  }

  function requireUser(path) {
    if (me()) return false;
    go('login?next=' + encodeURIComponent(path));
    return true;
  }

  function apply(id) {
    if (requireUser('apply/' + id)) return '';
    const e = getExp(id);
    if (!e || e.status !== 'open') return notFound();
    const u = me();
    if (db.apps().some((a) => a.userId === u.id && a.expId === id)) { go('dashboard'); return ''; }
    const sizes = []; for (let i = e.teamMin; i <= e.teamMax; i++) sizes.push(i);
    return `
    <section class="page-head"><div class="wrap"><p class="eyebrow"><a href="#/experience/${e.id}" class="muted">${esc(e.code)} · ${esc(e.title)}</a> / Application</p><h1>Request a seat</h1><p>Tell us a little about you and your team. There are no wrong answers, but there are interesting ones.</p></div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap dossier">
      <div class="card reveal">
        <form class="form" data-form="apply" data-exp="${e.id}" novalidate>
          <div class="row">
            <div class="field"><label for="a-team">Team name</label><input id="a-team" name="team" type="text" maxlength="40" required placeholder="The Unconnected"></div>
            <div class="field"><label for="a-size">Team size</label><select id="a-size" name="size">${sizes.map((s) => `<option value="${s}">${s} player${s > 1 ? 's' : ''}</option>`).join('')}</select></div>
          </div>
          <div class="field"><span class="label">Which one are you?</span>
            <div class="choices">${PERSONAS.map(([v, t, d], i) => `<label class="choice"><input type="radio" name="persona" value="${v}" ${i === 0 ? 'checked' : ''}><span><b>${t}</b><em>${d}</em></span></label>`).join('')}</div>
          </div>
          <div class="field"><label for="a-xp">Played anything like this before?</label>
            <select id="a-xp" name="xp"><option>Never: this is new to us</option><option>A few escape rooms</option><option>Treasure hunts or city games</option><option>We are seasoned players</option></select></div>
          <div class="field"><label for="a-why">Why should we pick you?</label><textarea id="a-why" name="why" maxlength="400" required placeholder="One good reason is enough."></textarea><small>Max 400 characters.</small></div>
          <div class="field"><label for="a-notes">Anything we should know? <span class="muted">(optional)</span></label><input id="a-notes" name="notes" type="text" maxlength="160" placeholder="Accessibility, dietary, medical"></div>
          <label class="check"><input type="checkbox" name="agree" required> I understand that applying doesn’t guarantee a seat, and that selected players must confirm with payment within 48 hours.</label>
          <p class="form-error" aria-live="polite"></p>
          <button class="btn primary block" type="submit">Submit application</button>
        </form>
      </div>
      <aside class="side-card reveal">
        <p class="eyebrow" style="margin-bottom:8px">${esc(e.code)}</p><h3>${esc(e.title)}</h3>
        <div class="kv"><span>Date</span><span>${fmtDate(e.date)} · ${esc(e.time)}</span></div>
        <div class="kv"><span>Price</span><span>${inr(e.price)} / player</span></div>
        <div class="kv"><span>Seats left</span><span class="gold">${seatsLeft(e)}</span></div>
        <p class="muted tiny" style="margin-top:18px">Applying as <b>${esc(u.name)}</b> · ${esc(u.email)}</p>
      </aside>
    </div></section>`;
  }

  function dashboard() {
    if (requireUser('dashboard')) return '';
    const u = me();
    const apps = db.apps().filter((a) => a.userId === u.id).sort((a, b) => b.at - a.at);
    const notes = db.notes().filter((n) => n.userId === u.id);
    const html = `
    <section class="page-head"><div class="wrap">
      <p class="eyebrow">Player dashboard</p>
      <h1>Hello, ${esc(u.name.split(' ')[0])}.</h1>
      <p>Your applications, seats and messages from the BRIDGET team.</p>
    </div></section>
    <div class="wrap">
      <div class="stats">
        <div class="stat"><b>${apps.length}</b><span>Applications</span></div>
        <div class="stat"><b>${apps.filter((a) => a.status === 'selected').length}</b><span>Awaiting payment</span></div>
        <div class="stat"><b>${apps.filter((a) => a.status === 'confirmed').length}</b><span>Confirmed seats</span></div>
        <div class="stat"><b>${secretCount()}/3</b><span>Connections found</span></div>
      </div>
      <div class="dash-grid">
        <div>
          ${apps.length ? apps.map(appCard).join('') : `<div class="empty"><p>You haven’t applied for anything yet.</p><a class="btn primary" href="#/experiences">Browse experiences</a></div>`}
          <p class="muted tiny mono" style="margin-top:18px">Demo tip: open the <a class="gold" href="#/console">organiser console</a> to approve your own application, then come back here to pay.</p>
        </div>
        <aside>
          <div class="card" style="padding:26px">
            <h3 style="font-size:1.05rem">Updates</h3>
            ${notes.length ? `<ul class="notes">${notes.slice(0, 8).map((n) => `<li class="${n.read ? '' : 'unread'}">${esc(n.text)}<time>${fmtStamp(n.at)}</time></li>`).join('')}</ul>` : '<p class="muted tiny">Nothing yet. Updates about your applications land here.</p>'}
          </div>
          <div class="card" style="padding:26px;margin-top:16px">
            <h3 style="font-size:1.05rem">Profile</h3>
            <div class="kv"><span>Email</span><span>${esc(u.email)}</span></div>
            <div class="kv"><span>Mobile</span><span>${esc(u.phone)}</span></div>
            <div class="kv"><span>City</span><span>${esc(u.city)}</span></div>
            <div class="kv"><span>Member since</span><span>${fmtStamp(u.at)}</span></div>
            <button class="btn ghost sm" style="margin-top:16px" data-action="logout">Log out</button>
          </div>
        </aside>
      </div>
    </div>`;
    // mark as read after rendering
    store.set('notes', db.notes().map((n) => (n.userId === u.id ? { ...n, read: true } : n)));
    return html;
  }

  function appCard(a) {
    const e = getExp(a.expId); const s = STATUS[a.status];
    const steps = ['Applied', 'Review', 'Selected', 'Confirmed'];
    const notice = {
      submitted: '<div class="notice">Application received. Selection results go out every Friday.</div>',
      review: '<div class="notice">Your application is on the shortlist and being reviewed.</div>',
      selected: `<div class="notice gold"><b>You’ve been selected.</b> Confirm your seat by paying before ${fmtStamp(a.selectedAt + 48 * 3600e3)}, or it moves to the waitlist.</div>`,
      confirmed: '',
      waitlisted: '<div class="notice">You’re on the waitlist. If a seat opens, you’ll be the first to know.</div>',
      rejected: '<div class="notice red">Not this time. Every season brings new experiences, so watch the announcements.</div>',
    }[a.status];
    return `
    <article class="app-card reveal">
      <div class="app-head">
        <div><span class="mono muted">${esc(e.code)} · ${fmtDate(e.date)}</span><h3>${esc(e.title)}</h3><span class="muted tiny">Team “${esc(a.team)}” · ${a.teamSize} player${a.teamSize > 1 ? 's' : ''}</span></div>
        ${statusPill(a.status)}
      </div>
      ${a.status !== 'rejected' ? `<div class="tracker">${steps.map((t, i) => `<div class="${i < s.step ? 'done' : ''} ${i === s.step - 1 ? 'now' : ''}">${t}</div>`).join('')}</div>` : ''}
      ${notice}
      ${a.status === 'confirmed' ? `
        <div class="pass">
          <span class="mono muted">FIELD PASS · ${esc(e.code)}</span>
          <div class="code">${esc(a.passCode)}</div>
          <div class="kv"><span>Date</span><span>${fmtDate(e.date)} · ${esc(e.time)}</span></div>
          <div class="kv"><span>Meeting point</span><span>${redact('[[Revealed 24h before]]')} <span class="muted tiny">revealed 24h before</span></span></div>
          <div class="kv"><span>Paid</span><span>${inr(a.amount)}</span></div>
        </div>` : ''}
      <div class="app-actions" style="margin-top:16px">
        ${a.status === 'selected' ? `<a class="btn primary" href="#/pay/${a.id}">Pay ${inr(e.price * a.teamSize)} &amp; confirm</a>` : ''}
        <a class="btn ghost sm" href="#/experience/${e.id}">View dossier</a>
        ${['submitted', 'review', 'waitlisted'].includes(a.status) ? `<button class="btn ghost sm danger" data-action="withdraw" data-id="${a.id}">Withdraw</button>` : ''}
      </div>
    </article>`;
  }

  function pay(appId) {
    if (requireUser('pay/' + appId)) return '';
    const a = db.apps().find((x) => x.id === appId && x.userId === me().id);
    if (!a || a.status !== 'selected') { go('dashboard'); return ''; }
    const e = getExp(a.expId);
    const total = e.price * a.teamSize;
    return `
    <section class="page-head"><div class="wrap"><p class="eyebrow">Confirm your seat</p><h1>Checkout</h1><p>One step left. Payment locks your team’s seats for ${esc(e.title)}.</p></div></section>
    <section class="section tight" style="padding-top:10px"><div class="wrap dossier">
      <div class="card reveal">
        <h3>Order summary</h3>
        <div class="kv"><span>${esc(e.code)} · ${esc(e.title)}</span><span>${fmtDate(e.date)}</span></div>
        <div class="kv"><span>Team “${esc(a.team)}”</span><span>${a.teamSize} × ${inr(e.price)}</span></div>
        <div class="kv"><span>Taxes (GST included)</span><span>${inr(0)}</span></div>
        <div class="kv" style="font-size:1.1rem"><span style="color:var(--text)"><b>Total</b></span><span class="gold"><b>${inr(total)}</b></span></div>
        <button class="btn primary block" style="margin-top:24px" data-action="pay-open" data-id="${a.id}">Pay ${inr(total)} securely</button>
        <p class="muted tiny center" style="margin-top:12px">UPI · Cards · Netbanking · Wallets, processed by Razorpay in the live version. Refundable up to 7 days before the event.</p>
      </div>
      <aside class="side-card reveal">
        <div class="notice gold" style="margin:0">Seat held until <b>${fmtStamp(a.selectedAt + 48 * 3600e3)}</b></div>
        <p class="muted tiny" style="margin-top:16px">After payment you get a field pass in your dashboard. The meeting point and your first clue arrive 24 hours before the game.</p>
      </aside>
    </div></section>`;
  }

  function payModal(a) {
    const e = getExp(a.expId); const total = e.price * a.teamSize;
    openModal(`
      <div id="rzp">
        <div class="rzp-head"><div class="rzp-logo">B</div><div><b>BRIDGET</b><div class="muted tiny">${esc(e.title)} · ${a.teamSize} seats</div></div><div style="margin-left:auto" class="gold"><b>${inr(total)}</b></div></div>
        <p class="mono muted tiny" style="margin:0">DEMO CHECKOUT · NO REAL PAYMENT IS TAKEN</p>
        <div class="methods">
          ${['UPI', 'Card', 'Netbanking', 'Wallet'].map((m, i) => `<button class="method ${i === 0 ? 'on' : ''}" data-action="pay-method">${m}<span class="muted">›</span></button>`).join('')}
        </div>
        <button class="btn primary block" data-action="pay-confirm" data-id="${a.id}">Complete demo payment</button>
      </div>`);
  }

  function adminConsole() {
    const filter = query().get('exp') || 'all';
    const all = db.apps();
    const apps = all.filter((a) => filter === 'all' || a.expId === filter).sort((a, b) => b.at - a.at);
    const users = db.users();
    const revenue = all.filter((a) => a.status === 'confirmed').reduce((s, a) => s + a.amount, 0);
    const btn = (a, st, label, cls = '') => (a.status === st ? '' : `<button class="btn ghost sm ${cls}" data-action="set-status" data-id="${a.id}" data-status="${st}">${label}</button>`);
    return `
    <section class="page-head"><div class="wrap">
      <p class="eyebrow">Organiser console · demo</p>
      <h1>Selection &amp; approval</h1>
      <p>Review applications, select players and post announcements. Selected players are notified automatically. In the live version this page needs an organiser login.</p>
    </div></section>
    <div class="wrap" style="padding-bottom:110px">
      <div class="stats">
        <div class="stat"><b>${all.length}</b><span>Applications</span></div>
        <div class="stat"><b>${all.filter((a) => ['submitted', 'review'].includes(a.status)).length}</b><span>To review</span></div>
        <div class="stat"><b>${all.filter((a) => a.status === 'confirmed').length}</b><span>Confirmed</span></div>
        <div class="stat"><b>${inr(revenue)}</b><span>Revenue</span></div>
      </div>
      <div class="toolbar">
        <select data-action="console-filter" aria-label="Filter by experience">
          <option value="all">All experiences</option>
          ${D.experiences.filter((e) => e.status === 'open').map((e) => `<option value="${e.id}" ${filter === e.id ? 'selected' : ''}>${esc(e.code)} · ${esc(e.title)}</option>`).join('')}
        </select>
        <button class="btn ghost sm" data-action="seed">+ Add sample applicants</button>
        <button class="btn ghost sm danger" data-action="reset">Reset demo data</button>
      </div>
      ${apps.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Applicant</th><th>Experience</th><th>Team</th><th>Profile</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${apps.map((a) => {
          const u = users.find((x) => x.id === a.userId) || { name: 'Unknown', email: '' };
          const e = getExp(a.expId);
          return `<tr>
            <td><b>${esc(u.name)}</b><div class="sub">${esc(u.email)}</div></td>
            <td>${esc(e.code)}<div class="sub">${esc(e.title)}</div></td>
            <td>${esc(a.team)}<div class="sub">${a.teamSize} players · ${fmtStamp(a.at)}</div></td>
            <td>${esc((PERSONAS.find((p) => p[0] === a.persona) || [])[1] || '')}<div class="sub" title="${esc(a.why)}">“${esc(a.why.slice(0, 60))}${a.why.length > 60 ? '…' : ''}”</div></td>
            <td>${statusPill(a.status)}</td>
            <td><div class="actions">${a.status === 'confirmed' ? `<span class="mono muted tiny">${esc(a.passCode)}</span>` : btn(a, 'review', 'Shortlist') + btn(a, 'selected', 'Select') + btn(a, 'waitlisted', 'Waitlist') + btn(a, 'rejected', 'Decline', 'danger')}</div></td>
          </tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty"><p>No applications yet.</p><button class="btn primary" data-action="seed">Add sample applicants</button></div>`}

      <div class="card" style="margin-top:40px;max-width:720px">
        <h3>Post an announcement</h3>
        <form class="form" data-form="announce" novalidate>
          <div class="row">
            <div class="field"><label for="n-title">Title</label><input id="n-title" name="title" type="text" maxlength="90" required></div>
            <div class="field"><label for="n-tag">Tag</label><select id="n-tag" name="tag"><option>Limited seats</option><option>Applications open</option><option>Notice</option><option>Coming soon</option><option>Results</option></select></div>
          </div>
          <div class="field"><label for="n-body">Message</label><textarea id="n-body" name="body" maxlength="300" required></textarea></div>
          <label class="check"><input type="checkbox" name="pinned"> Pin to the top</label>
          <p class="form-error" aria-live="polite"></p>
          <button class="btn primary" type="submit">Publish announcement</button>
        </form>
      </div>
    </div>`;
  }

  function notFound() {
    return `<section class="page-head center" style="padding:140px 0"><div class="wrap"><p class="eyebrow">404 · Lost signal</p><h1>This path doesn’t connect.</h1><p style="margin:0 auto 24px">Not every door leads somewhere. This one leads back.</p><a class="btn primary" href="#/">Return home</a></div></section>`;
  }

  /* ---------- secrets (the home page has 3 hidden nodes) ---------- */
  const secrets = () => store.get('secrets', []);
  const secretFound = (n) => (secrets().includes(n) ? 'found' : '');
  const secretCount = () => secrets().length;

  /* ======================================================================
     ROUTER
     ====================================================================== */
  const routes = [
    [/^$/, home, ''],
    [/^experiences$/, experiences, 'experiences'],
    [/^experience\/([\w-]+)$/, experience, 'experiences'],
    [/^announcements$/, announcements, 'announcements'],
    [/^media$/, media, 'media'],
    [/^login$/, () => auth('login'), ''],
    [/^join$/, () => auth('join'), ''],
    [/^apply\/([\w-]+)$/, apply, 'experiences'],
    [/^dashboard$/, dashboard, ''],
    [/^pay\/(\w+)$/, pay, ''],
    [/^console$/, adminConsole, ''],
  ];
  let lastPath = null;
  function render() {
    const path = location.hash.replace(/^#\/?/, '').split('?')[0];
    const match = routes.find(([re]) => re.test(path));
    let html, nav = '';
    if (match) { html = match[1](...path.match(match[0]).slice(1)); nav = match[2]; } else html = notFound();
    if (html === '') return; // redirected
    app.innerHTML = html;
    if (path !== lastPath) { app.classList.remove('page-enter'); void app.offsetWidth; app.classList.add('page-enter'); }
    document.dispatchEvent(new CustomEvent('bridget:render', { detail: { path } }));
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === nav));
    $('#nav').classList.remove('open');
    renderNavAuth();
    observeReveals();
    tickCountdowns();
    if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }
  }
  function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  function renderNavAuth() {
    const u = me();
    const unread = u ? db.notes().filter((n) => n.userId === u.id && !n.read).length : 0;
    $('#nav-auth').innerHTML = u
      ? `<a class="bell" href="#/dashboard" aria-label="Updates${unread ? `: ${unread} unread` : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/></svg>${unread ? `<span class="dot">${unread}</span>` : ''}</a><a class="btn ghost sm" href="#/dashboard">${esc(u.name.split(' ')[0])}’s dashboard</a>`
      : `<a href="#/login" class="muted">Log in</a><a class="btn primary sm" href="#/join">Join</a>`;
  }

  /* ---------- reveal on scroll ---------- */
  let io;
  function observeReveals() {
    const els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    io = io || new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el, i) => { el.style.transitionDelay = Math.min(i % 4, 3) * 80 + 'ms'; io.observe(el); });
  }

  /* ---------- countdown ---------- */
  function tickCountdowns() {
    $$('[data-countdown]').forEach((el) => {
      let diff = Math.max(0, new Date(el.dataset.countdown) - Date.now()) / 1000;
      const d = Math.floor(diff / 86400); diff -= d * 86400;
      const h = Math.floor(diff / 3600); diff -= h * 3600;
      const m = Math.floor(diff / 60); const s = Math.floor(diff - m * 60);
      const set = (u, v) => {
        const b = $(`[data-u="${u}"]`, el); const val = String(v).padStart(2, '0');
        if (!b || b.textContent === val) return;
        b.textContent = val; b.classList.remove('tick'); void b.offsetWidth; b.classList.add('tick');
      };
      set('d', d); set('h', h); set('m', m); set('s', s);
    });
  }
  setInterval(tickCountdowns, 1000);

  /* ======================================================================
     ACTIONS (event delegation)
     ====================================================================== */
  const actions = {
    'toggle-nav'(el) { const n = $('#nav'); n.classList.toggle('open'); el.setAttribute('aria-expanded', n.classList.contains('open')); },
    'close-modal': closeModal,
    logout() { store.set('session', null); toast('Logged out. The game goes on without you… for now.'); go(''); },
    secret(el) {
      const n = +el.dataset.n; const s = secrets();
      if (s.includes(n)) return;
      s.push(n); store.set('secrets', s); el.classList.add('found');
      $('.final-cta .eyebrow').textContent = `${s.length}/3 connections found`;
      if (s.length < 3) toast(`Connection ${s.length} of 3 found. Keep looking.`);
      else openModal(`<p class="eyebrow">Connection complete</p><h2 style="font-size:1.8rem">You see what others don’t.</h2><p class="muted">That’s exactly what we’re looking for. Mention the code below in your next application.</p><div class="pass"><span class="mono muted">YOUR CODE</span><div class="code">GOA-∞-${hash('bridget' + (me()?.id || 'guest')).slice(1, 6).toUpperCase()}</div></div><a class="btn primary block" style="margin-top:20px" href="#/experiences" data-action="close-modal">Find your first case</a>`);
    },
    sealed() { toast('Access denied. This file opens Monsoon 2027.'); },
    'notify-me'(el) {
      const u = me();
      if (!u) { go('join?next=' + encodeURIComponent('experience/' + el.dataset.id)); return; }
      notify(u.id, `We’ll tell you the moment applications open for ${getExp(el.dataset.id).title}.`);
      toast('You’re on the list. We’ll notify you first.'); renderNavAuth();
    },
    play(el) {
      const m = D.media.find((x) => x.id === el.dataset.id);
      if (m.youtubeId) openModal(`<div style="aspect-ratio:16/9"><iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtubeId)}?autoplay=1" title="${esc(m.title)}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`, true);
      else openModal(`<p class="eyebrow">${MEDIA_CATS[m.cat]}</p><h2 style="font-size:1.6rem">${esc(m.title)}</h2><p class="muted">Premieres ${m.date} on the BRIDGET YouTube channel. Join to get notified when it drops.</p><a class="btn primary block" href="#/${me() ? 'dashboard' : 'join'}" data-action="close-modal">${me() ? 'Got it' : 'Create an account'}</a>`);
    },
    'media-filter'(el) { mediaFilter = el.dataset.cat; rerender(); },
    withdraw(el) {
      if (!confirm('Withdraw this application?')) return;
      store.set('apps', db.apps().filter((a) => a.id !== el.dataset.id)); toast('Application withdrawn.'); rerender();
    },
    'pay-open'(el) { payModal(db.apps().find((a) => a.id === el.dataset.id)); },
    'pay-method'(el) { $$('.method').forEach((m) => m.classList.toggle('on', m === el)); },
    'pay-confirm'(el) {
      const a = db.apps().find((x) => x.id === el.dataset.id); const e = getExp(a.expId);
      $('#rzp').innerHTML = '<div class="spinner"></div><p class="center muted">Processing payment…</p>';
      setTimeout(() => {
        const passCode = `BRG-${e.code.slice(-2)}-${uid().slice(0, 4).toUpperCase()}`;
        updateApp(a.id, { status: 'confirmed', passCode, amount: e.price * a.teamSize, paidAt: Date.now() });
        notify(a.userId, `Payment received. Your seats for ${e.title} are confirmed. Pass ${passCode}.`, 'green');
        $('#rzp').innerHTML = `<div class="center"><p class="eyebrow" style="margin-top:10px">Payment successful</p><h2 style="font-size:1.7rem">You’re in.</h2><p class="muted">Your field pass is waiting in your dashboard.</p><a class="btn primary block" href="#/dashboard" data-action="close-modal">Open my field pass</a></div>`;
      }, 1600);
    },
    'set-status'(el) {
      const a = db.apps().find((x) => x.id === el.dataset.id); const st = el.dataset.status; const e = getExp(a.expId);
      const patch = { status: st }; if (st === 'selected') patch.selectedAt = Date.now();
      updateApp(a.id, patch);
      const msg = {
        review: `Your application for ${e.title} has been shortlisted.`,
        selected: `You’ve been selected for ${e.title}! Confirm your seat with payment within 48 hours.`,
        waitlisted: `You’re on the waitlist for ${e.title}. We’ll let you know if a seat opens.`,
        rejected: `Thank you for applying to ${e.title}. We couldn’t offer you a seat this time.`,
      }[st];
      notify(a.userId, msg, STATUS[st].tone);
      toast(`${STATUS[st].label}: player notified (email + WhatsApp in the live version).`);
      rerender();
    },
    seed() { seedApplicants(); toast('Sample applicants added.'); rerender(); },
    reset() { if (!confirm('Clear all demo accounts, applications and announcements in this browser?')) return; store.clear(); toast('Demo data cleared.'); go(''); },
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (el && actions[el.dataset.action] && el.tagName !== 'SELECT') {
      if (el.tagName === 'BUTTON') ev.preventDefault();
      actions[el.dataset.action](el, ev);
      if (el.tagName === 'A' && el.dataset.action === 'close-modal') closeModal();
      return;
    }
    if (ev.target.id === 'modal') closeModal();
  });
  document.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-action="console-filter"]')) go('console' + (ev.target.value === 'all' ? '' : '?exp=' + ev.target.value));
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  /* ---------- forms ---------- */
  const forms = {
    join(fd, form) {
      const email = fd.get('email').trim().toLowerCase();
      if (!fd.get('name').trim() || !/^\S+@\S+\.\S+$/.test(email) || !fd.get('phone').trim() || !fd.get('city').trim()) return 'Please fill in every field with valid details.';
      if (fd.get('password').length < 6) return 'Password needs at least 6 characters.';
      if (!fd.get('adult')) return 'You need to be 18+ and accept the terms.';
      if (db.users().some((u) => u.email === email)) return 'An account with that email already exists. Try logging in.';
      const u = { id: uid(), name: fd.get('name').trim(), email, phone: fd.get('phone').trim(), city: fd.get('city').trim(), pw: hash(fd.get('password')), at: Date.now() };
      store.set('users', [...db.users(), u]); store.set('session', u.id);
      notify(u.id, 'Welcome to BRIDGET. Your journey starts with a single application.', 'gold');
      toast(`Welcome, ${u.name.split(' ')[0]}.`); go(form.dataset.next);
    },
    login(fd, form) {
      const u = db.users().find((x) => x.email === fd.get('email').trim().toLowerCase());
      if (!u || u.pw !== hash(fd.get('password'))) return 'That email and password don’t match.';
      store.set('session', u.id); toast(`Welcome back, ${u.name.split(' ')[0]}.`); go(form.dataset.next);
    },
    apply(fd, form) {
      if (!fd.get('team').trim() || !fd.get('why').trim()) return 'Give your team a name and tell us why we should pick you.';
      if (!fd.get('agree')) return 'Please confirm you understand how selection works.';
      const u = me(); const e = getExp(form.dataset.exp);
      store.set('apps', [...db.apps(), { id: uid(), userId: u.id, expId: e.id, team: fd.get('team').trim(), teamSize: +fd.get('size'), persona: fd.get('persona'), xp: fd.get('xp'), why: fd.get('why').trim(), notes: fd.get('notes').trim(), status: 'submitted', at: Date.now() }]);
      notify(u.id, `Application received for ${e.title}. Results go out on Friday.`);
      toast('Application submitted.'); go('dashboard');
    },
    announce(fd, form) {
      if (!fd.get('title').trim() || !fd.get('body').trim()) return 'Add a title and a message.';
      store.set('anns', [{ id: uid(), date: new Date().toISOString().slice(0, 10), tag: fd.get('tag'), title: fd.get('title').trim(), body: fd.get('body').trim(), pinned: !!fd.get('pinned') }, ...store.get('anns', [])]);
      form.reset(); toast('Announcement published.'); go('announcements');
    },
  };
  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-form]'); if (!form) return;
    ev.preventDefault();
    const err = forms[form.dataset.form](new FormData(form), form);
    const out = $('.form-error', form); if (out) out.textContent = err || '';
  });

  /* ---------- demo seed ---------- */
  function seedApplicants() {
    const people = [
      ['Aarav Naik', 'Margao', 'Night Owls', 3, 'solver', 'We solved every puzzle hunt at college fest three years running.'],
      ['Riya Fernandes', 'Panaji', 'Fontainhas Five', 4, 'storyteller', 'Born and raised in the old quarter. We know every lane, or so we think.'],
      ['Kabir Desai', 'Mapusa', 'Low Tide', 4, 'explorer', 'Weekend trekkers who want something stranger than a trail.'],
      ['Sana D’Souza', 'Vasco', 'Cipher Sisters', 2, 'strategist', 'Two sisters, one shared brain, zero sense of direction.'],
      ['Neil Kamat', 'Ponda', 'Unconnected', 3, 'solver', 'I have been waiting for something like this to come to Goa.'],
      ['Tara Menezes', 'Calangute', 'Salt & Static', 5, 'explorer', 'We are a surf crew that loves riddles. The sea is our home turf.'],
    ];
    const users = db.users(); const apps = db.apps();
    const statuses = ['submitted', 'review', 'submitted', 'selected', 'review', 'submitted'];
    people.forEach(([name, city, team, size, persona, why], i) => {
      const u = { id: uid(), name, city, email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com', phone: '+91 9' + String(800000000 + i * 1234567).slice(0, 9), pw: hash(uid()), at: Date.now() - (i + 2) * 864e5 };
      users.push(u);
      const exp = i % 2 && size >= 3 ? 'tideline-protocol' : 'monsoon-cipher';
      const e = getExp(exp);
      apps.push({ id: uid(), userId: u.id, expId: exp, team, teamSize: Math.min(Math.max(size, e.teamMin), e.teamMax), persona, xp: 'A few escape rooms', why, notes: '', status: statuses[i], selectedAt: statuses[i] === 'selected' ? Date.now() : undefined, at: Date.now() - i * 3.6e6 * 7 });
    });
    store.set('users', users); store.set('apps', apps);
  }

  /* ======================================================================
     CONSTELLATION BACKGROUND
     ====================================================================== */
  (function sky() {
    const c = $('#sky'); const ctx = c.getContext('2d'); if (!ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, pts = [];
    const mouse = { x: -9999, y: -9999 };
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(95, (w * h) / 15000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22, r: Math.random() * 1.3 + 0.4 }));
      if (reduce) draw();
    }
    const signals = []; // gold pulses travelling along connections
    const waves = [];   // click shockwaves
    let t0 = 0;
    function draw(now = 0) {
      ctx.clearRect(0, 0, w, h);
      t0 = now;
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) { p.vx *= -1; p.x = Math.max(0, Math.min(w, p.x)); }
          if (p.y < 0 || p.y > h) { p.vy *= -1; p.y = Math.max(0, Math.min(h, p.y)); }
          if (Math.hypot(p.vx, p.vy) > 0.3) { p.vx *= 0.965; p.vy *= 0.965; } // settle after a shockwave
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d < 14400) {
            ctx.strokeStyle = `rgba(110,200,205,${(1 - d / 14400) * 0.16})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduce && signals.length < 12 && Math.random() < 0.00035) signals.push({ a: i, b: j, t: 0, s: 0.006 + Math.random() * 0.01 });
          }
        }
        const dm = (a.x - mouse.x) ** 2 + (a.y - mouse.y) ** 2;
        if (dm < 32400) { ctx.strokeStyle = `rgba(212,168,87,${(1 - dm / 32400) * 0.55})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      for (let k = signals.length - 1; k >= 0; k--) {
        const s = signals[k]; s.t += s.s;
        const a = pts[s.a], b = pts[s.b];
        if (!a || !b || s.t >= 1) { signals.splice(k, 1); continue; }
        const x = a.x + (b.x - a.x) * s.t, y = a.y + (b.y - a.y) * s.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, 'rgba(255,225,160,.95)'); g.addColorStop(0.3, 'rgba(212,168,87,.5)'); g.addColorStop(1, 'rgba(212,168,87,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
        // light the trail behind the pulse
        ctx.strokeStyle = 'rgba(212,168,87,.35)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
      }
      for (let k = waves.length - 1; k >= 0; k--) {
        const wv = waves[k]; wv.r += 7;
        const o = 1 - wv.r / 320;
        if (o <= 0) { waves.splice(k, 1); continue; }
        ctx.strokeStyle = `rgba(212,168,87,${o * 0.6})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(95,208,198,${o * 0.3})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r * 0.7, 0, Math.PI * 2); ctx.stroke();
      }
      for (const p of pts) {
        const tw = 0.45 + 0.35 * Math.sin(t0 / 700 + p.x); // twinkle
        ctx.fillStyle = `rgba(236,232,223,${reduce ? 0.65 : tw})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    }
    if (!reduce) {
      addEventListener('pointerdown', (e) => {
        if (e.target.closest('input, textarea, select')) return;
        waves.push({ x: e.clientX, y: e.clientY, r: 0 });
        for (const p of pts) {
          const dx = p.x - e.clientX, dy = p.y - e.clientY, d = Math.hypot(dx, dy);
          if (d > 0 && d < 240) { const f = ((240 - d) / 240) * 2.4; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
        }
      });
    }
    addEventListener('resize', size);
    addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (reduce) draw(); });
    addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    size(); if (!reduce) draw();
  })();

  addEventListener('hashchange', render);
  render();
})();
