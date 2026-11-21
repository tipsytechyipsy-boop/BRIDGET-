/*
 * BRIDGET visual effects layer.
 * Intro sequence, custom cursor, text decode, card tilt/spotlight, magnetic buttons,
 * count-ups, parallax, hero cipher rings and the radar graphic.
 * Listens for the `bridget:render` event fired by app.js after every page render.
 * Everything degrades to static when the user prefers reduced motion.
 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const esc = (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c);

  /* ---------- intro sequence (once per browser session) ---------- */
  let introDone = Promise.resolve();
  (function intro() {
    let seen = false;
    try { seen = sessionStorage.getItem('bridget.intro') === '1'; sessionStorage.setItem('bridget.intro', '1'); } catch (e) { /* ignore */ }
    if (reduce || seen) return;
    root.classList.add('intro-active');
    const el = document.createElement('div');
    el.className = 'intro';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <svg viewBox="0 0 120 104" class="intro-mark">
        <path class="intro-path" d="M12 88 L60 14 L108 88 Z"/>
        <circle cx="12" cy="88" r="4"/><circle cx="60" cy="14" r="4"/><circle cx="108" cy="88" r="4"/>
      </svg>
      <div class="intro-word">BRIDGET</div>
      <div class="intro-text">ESTABLISHING CONNECTION <b>00</b>%</div>`;
    document.body.appendChild(el);
    const num = $('b', el);
    const start = performance.now();
    const dur = 1500;
    introDone = new Promise((res) => {
      const finish = () => {
        if (el.classList.contains('done')) return;
        el.classList.add('done');
        root.classList.remove('intro-active');
        setTimeout(() => el.remove(), 900);
        res();
      };
      el.addEventListener('click', finish);
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        num.textContent = String(Math.round(p * 100)).padStart(2, '0');
        if (p < 1 && !el.classList.contains('done')) requestAnimationFrame(step);
        else setTimeout(finish, 250);
      };
      requestAnimationFrame(step);
    });
  })();

  /* ---------- scroll progress ---------- */
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  /* ---------- custom cursor ---------- */
  if (fine && !reduce) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cur-dot'; ring.className = 'cur-ring';
    document.body.append(dot, ring);
    root.classList.add('has-cursor');
    let x = -100, y = -100, rx = -100, ry = -100;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; root.classList.remove('cur-out'); });
    (function loop() { rx += (x - rx) * 0.2; ry += (y - ry) * 0.2; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      ring.classList.toggle('hover', !!t.closest('a, button, select, label, [data-action]'));
      ring.classList.toggle('text', !!t.closest('input, textarea'));
    });
    document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) root.classList.add('cur-out'); });
    addEventListener('pointerdown', () => ring.classList.add('down'));
    addEventListener('pointerup', () => ring.classList.remove('down'));
  }

  /* ---------- text decode ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/=?';
  function scramble(el) {
    if (el.dataset.scrambled) return;
    el.dataset.scrambled = '1';
    const text = el.textContent;
    if (!text.trim()) return;
    const sched = [...text].map((c, i) => ({ c, end: 6 + Math.floor(i * 1.1) + Math.floor(Math.random() * 10) }));
    let f = 0;
    const tick = () => {
      let out = '', done = 0;
      for (const s of sched) {
        if (f >= s.end || s.c === ' ') { out += esc(s.c); done++; }
        else out += `<span class="gl">${GLYPHS[(Math.random() * GLYPHS.length) | 0]}</span>`;
      }
      el.innerHTML = out;
      f++;
      if (done < sched.length && el.isConnected) requestAnimationFrame(tick);
      else el.textContent = text;
    };
    tick();
  }

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    const m = /^(\D*)([\d,]+)(.*)$/.exec(el.textContent.trim());
    if (!m) return;
    const target = +m[2].replace(/,/g, '');
    if (!target) return;
    const start = performance.now(), dur = 1200;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + Math.round(target * e).toLocaleString('en-IN') + m[3];
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- one observer for scroll-triggered effects ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const t = en.target;
      io.unobserve(t);
      if (t.hasAttribute('data-fx-scramble')) introDone.then(() => setTimeout(() => scramble(t), 120));
      if (t.hasAttribute('data-fx-draw')) t.classList.add('drawn');
      if (t.hasAttribute('data-fx-count')) countUp(t);
    });
  }, { threshold: 0.25 }) : null;

  /* ---------- hero cipher rings (SVG) ---------- */
  function rings() {
    const C = 300, ticks = [];
    for (let i = 0; i < 120; i++) {
      const a = (i * Math.PI) / 60, r2 = i % 10 === 0 ? 266 : 280;
      ticks.push(`<line x1="${(C + 290 * Math.sin(a)).toFixed(1)}" y1="${(C - 290 * Math.cos(a)).toFixed(1)}" x2="${(C + r2 * Math.sin(a)).toFixed(1)}" y2="${(C - r2 * Math.cos(a)).toFixed(1)}"/>`);
    }
    const tri = [0, 120, 240].map((d) => { const a = (d * Math.PI) / 180; return [(C + 200 * Math.sin(a)).toFixed(1), (C - 200 * Math.cos(a)).toFixed(1)]; });
    const inner = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      inner.push(`<circle cx="${(C + 150 * Math.sin(a)).toFixed(1)}" cy="${(C - 150 * Math.cos(a)).toFixed(1)}" r="${i % 3 === 0 ? 3 : 1.5}"/>`);
    }
    return `<svg viewBox="0 0 600 600" fill="none">
      <g class="ring r1" stroke="rgba(212,168,87,.4)"><circle cx="300" cy="300" r="290"/>${ticks.join('')}</g>
      <g class="ring r2">
        <path id="ring-text-path" d="M300,300 m-240,0 a240,240 0 1,1 480,0 a240,240 0 1,1 -480,0"/>
        <text class="ring-text"><textPath href="#ring-text-path" textLength="1500" lengthAdjust="spacing">CONNECTING THE UNCONNECTED ✦ EVERYTHING IS CONNECTED ✦ CAN YOU FIND THE CONNECTION ✦</textPath></text>
      </g>
      <g class="ring r3">
        <circle cx="300" cy="300" r="200" stroke="rgba(95,208,198,.35)" stroke-dasharray="2 8"/>
        <path d="M${tri.map((p) => p.join(',')).join(' L')} Z" stroke="rgba(212,168,87,.3)"/>
        ${tri.map(([x, y], i) => `<circle class="ring-node" style="animation-delay:${i * 0.6}s" cx="${x}" cy="${y}" r="5" fill="#d4a857"/>`).join('')}
      </g>
      <g class="ring r4" fill="rgba(255,255,255,.25)"><circle cx="300" cy="300" r="150" stroke="rgba(255,255,255,.08)" fill="none"/>${inner.join('')}</g>
    </svg>`;
  }

  /* ---------- radar ---------- */
  function radar(el) {
    const period = 4;
    const blips = [
      { x: 36, y: 62, live: true, label: 'GOA' },
      { x: 33, y: 46 }, { x: 50, y: 74 }, { x: 47, y: 22 }, { x: 66, y: 40 }, { x: 72, y: 60 }, { x: 58, y: 32 },
    ];
    el.innerHTML = `
      <svg viewBox="0 0 100 100" class="radar-grid" fill="none" stroke="rgba(95,208,198,.22)" stroke-width=".3">
        <circle cx="50" cy="50" r="49"/><circle cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="23"/><circle cx="50" cy="50" r="10"/>
        <path d="M50 1 V99 M1 50 H99" stroke-dasharray="1 1.5"/>
      </svg>
      <div class="sweep"></div>
      ${blips.map((b) => {
        const ang = (Math.atan2(b.x - 50, -(b.y - 50)) * 180 / Math.PI + 360) % 360;
        return `<span class="blip ${b.live ? 'live' : ''}" style="left:${b.x}%;top:${b.y}%;animation-delay:${((ang / 360) * period - period).toFixed(2)}s">${b.label ? `<em>${b.label}</em>` : ''}</span>`;
      }).join('')}
      <span class="radar-label">SCANNING · INDIA</span>`;
  }

  /* ---------- per-render hook ---------- */
  document.addEventListener('bridget:render', () => {
    if (!reduce) {
      $$('.eyebrow, .hero-tag, .section-head h2, .page-head h1').forEach((el) => {
        if (el.children.length) return;
        el.setAttribute('data-fx-scramble', '');
        io ? io.observe(el) : 0;
      });
      $$('.stat b').forEach((el) => { el.setAttribute('data-fx-count', ''); io ? io.observe(el) : 0; });
    }
    $$('.steps').forEach((el) => {
      $$('.step', el).forEach((s, i) => s.style.setProperty('--i', i));
      el.setAttribute('data-fx-draw', '');
      if (io && !reduce) io.observe(el); else el.classList.add('drawn');
    });
    $$('.exp-card, .pillar, .app-card, .ann, .stat, .card, .paper').forEach((el) => el.classList.add('spot'));
    if (fine && !reduce) {
      $$('.exp-card, .pass').forEach((el) => el.classList.add('tilt'));
      $$('.btn.primary').forEach((el) => el.classList.add('magnetic'));
    }
    $$('[data-rings]').forEach((el) => { el.innerHTML = rings(); });
    $$('[data-radar]').forEach(radar);
    onScroll();
  });

  /* ---------- pointer effects: spotlight, tilt, magnetic, hero parallax ---------- */
  let tiltEl = null, magEl = null;
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest ? e.target : null;
    if (!t) return;
    const spot = t.closest('.spot');
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
      spot.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    if (reduce || !fine) return;
    const tilt = t.closest('.tilt');
    if (tiltEl && tiltEl !== tilt) tiltEl.style.transform = '';
    tiltEl = tilt;
    if (tilt) {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
    }
    const mag = t.closest('.magnetic');
    if (magEl && magEl !== mag) magEl.style.transform = '';
    magEl = mag;
    if (mag) {
      const r = mag.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      mag.style.transform = `translate(${(px * 12).toFixed(1)}px, ${(py * 10).toFixed(1)}px)`;
    }
    const hr = $('.hero-rings');
    if (hr) {
      hr.style.setProperty('--px', `${((e.clientX / innerWidth - 0.5) * -24).toFixed(1)}px`);
      hr.style.setProperty('--py', `${((e.clientY / innerHeight - 0.5) * -24).toFixed(1)}px`);
    }
  });
  document.addEventListener('pointerleave', () => {
    if (tiltEl) tiltEl.style.transform = '';
    if (magEl) magEl.style.transform = '';
    tiltEl = magEl = null;
  });

  /* ---------- scroll: progress bar + parallax ghost words ---------- */
  let ticking = false;
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (reduce) return;
    const vh = innerHeight;
    $$('[data-parallax]').forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = `translate3d(${off.toFixed(1)}px,0,0)`;
    });
  }
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });
  addEventListener('resize', onScroll);
})();
