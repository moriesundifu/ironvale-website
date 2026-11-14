(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const OPEN = 5; const CLOSE = 22;
  const fmt = (h, m = 0) => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

  /* ---------- Nav ---------- */
  const toggle = $('.nav-toggle'); const links = $('.nav-links');
  toggle.addEventListener('click', () => { const o = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(o)); links.classList.toggle('open', o); });
  links.addEventListener('click', (e) => { if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); links.classList.remove('open'); } });
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => $(b.dataset.scroll).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })));

  /* ---------- Reveal & count ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll('[data-count]').forEach((el) => {
      const t = Number(el.dataset.count); if (reduced) return;
      const t0 = performance.now(); const tick = (n) => { const p = Math.min(1, (n - t0) / 1200); el.textContent = Math.round(t * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    });
    io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => { const s = [...el.parentElement.children].filter((c) => c.classList.contains('reveal')); el.style.transitionDelay = `${Math.min(s.indexOf(el), 4) * 80}ms`; io.observe(el); });

  /* ---------- Live open status ---------- */
  const now = new Date(); const open = now.getHours() >= OPEN && now.getHours() < CLOSE;
  const row = $('#hours-row'); row.innerHTML = `05:00 AM – 10:00 PM · <span class="${open ? 'open' : ''}">${open ? 'Open now' : 'Closed now'}</span>`;
  const st = $('#open-state'); st.textContent = open ? `● Open now · until ${fmt(CLOSE)}` : `Closed · opens ${fmt(OPEN)}`; if (open) st.classList.add('open');

  /* ---------- Billing toggle ---------- */
  let yearly = false;
  const renderPrices = () => {
    $$('[data-price]').forEach((b) => { const m = Number(b.dataset.price); const v = yearly ? Math.round(m * 12 * 0.85) : m; b.textContent = '₵' + v.toLocaleString('en-US'); });
    $$('[data-per]').forEach((s) => { s.textContent = yearly ? '/ year' : '/ month'; });
  };
  $$('[data-bill]').forEach((b) => b.addEventListener('click', () => { yearly = b.dataset.bill === 'year'; $$('[data-bill]').forEach((x) => x.classList.toggle('is-active', x === b)); renderPrices(); }));

  /* ---------- Modal ---------- */
  const overlay = $('#overlay'); const body = $('#m-body'); let lastFocus; let filmTimer;
  const openModal = (html) => { if (overlay.hidden) lastFocus = document.activeElement; body.innerHTML = html; overlay.hidden = false; document.body.style.overflow = 'hidden'; (body.querySelector('input, button') || $('.m-close')).focus(); };
  const closeModal = () => { overlay.hidden = true; document.body.style.overflow = ''; clearInterval(filmTimer); lastFocus?.focus?.(); };
  $('.m-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  const toastEl = $('#toast'); let tT;
  const toast = (m) => { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2600); };

  const days = () => Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i + (new Date().getHours() >= CLOSE - 1 ? 1 : 0)); return d; });
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); const diff = Math.round((d - t) / 86400000); return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${DN[d.getDay()]} ${d.getDate()}`; };

  const form = ({ title, lead, kind, extra = '' }) => {
    const ds = days();
    openModal(`<p class="label mono">${kind}</p><h3 id="m-title">${title}</h3><p class="lead">${lead}</p>${extra}
      <p class="mono" style="margin-bottom:8px">Preferred day</p><div class="chips" id="c-day">${ds.map((d, i) => `<button data-i="${i}" class="${i === 0 ? 'is-active' : ''}">${dayName(d)}</button>`).join('')}</div>
      <p class="mono" style="margin-bottom:8px">Time</p><div class="chips" id="c-time">${['Morning', 'Afternoon', 'Evening'].map((t, i) => `<button class="${i === 0 ? 'is-active' : ''}">${t}</button>`).join('')}</div>
      <div class="two"><label class="field mono">Full name<input id="f-name" autocomplete="name" /></label><label class="field mono">Phone<input id="f-phone" type="tel" autocomplete="tel" placeholder="+233…" /></label></div>
      <label class="field mono">Email<input id="f-email" type="email" autocomplete="email" /></label>
      <p class="err mono" id="f-err"></p><button class="red-btn full" id="f-go">Confirm <i></i></button>`);
    const pick = (sel) => $(sel).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$(sel + ' button').forEach((x) => x.classList.toggle('is-active', x === b)); });
    pick('#c-day'); pick('#c-time'); if ($('#c-plan')) pick('#c-plan'); if ($('#c-coach')) pick('#c-coach');
    $('#f-go').addEventListener('click', () => {
      const n = $('#f-name'); const p = $('#f-phone'); const em = $('#f-email');
      const bad = [[n, n.value.trim().length < 2], [p, p.value.replace(/\D/g, '').length < 9], [em, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())]];
      bad.forEach(([el, b]) => el.classList.toggle('bad', b));
      if (bad.some(([, b]) => b)) { $('#f-err').textContent = 'Please enter your name, a valid phone number and email.'; return; }
      const day = $('#c-day .is-active').textContent; const time = $('#c-time .is-active').textContent;
      const plan = $('#c-plan .is-active')?.textContent; const coach = $('#c-coach .is-active')?.textContent;
      const ref = 'IV-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      openModal(`<div class="ok"><div class="tick">✓</div><h3 style="padding:0">You’re in, ${esc(n.value.trim().split(' ')[0])}.</h3><p class="lead">We’ll confirm by text to ${esc(p.value.trim())}.</p>
        <div class="summary mono"><span><b>Request:</b> ${kind}</span>${plan ? `<span><b>Plan:</b> ${esc(plan)}${yearly ? ' (yearly)' : ''}</span>` : ''}${coach ? `<span><b>Coach:</b> ${esc(coach)}</span>` : ''}<span><b>When:</b> ${day} · ${time}</span><span><b>Reference:</b> ${ref}</span></div>
        <button class="red-btn full" id="ok">Done <i></i></button></div>`);
      $('#ok').addEventListener('click', () => { closeModal(); toast('See you at Ironvale'); });
    });
  };
  const COACHES = ['Any coach', 'Kwabena Asare', 'Adwoa Nyarko', 'Selorm Agbeko', 'Emmanuel Boateng'];
  const PLANS = ['Open Gym', 'Performance', 'Coached 1:1'];
  const openJoin = (plan = 'Performance') => form({ kind: 'Membership', title: 'Join Ironvale', lead: 'Pick a plan and a time to start. Your first session includes an intro with a coach.', extra: `<p class="mono" style="margin-bottom:8px">Plan</p><div class="chips" id="c-plan">${PLANS.map((p) => `<button class="${p === plan ? 'is-active' : ''}">${p}</button>`).join('')}</div>` });
  const openConsult = (coach = 'Any coach') => form({ kind: 'Free consultation', title: 'Consult with our team', lead: 'A 30-minute session to assess your goals and build your plan. Free, no commitment.', extra: `<p class="mono" style="margin-bottom:8px">Coach</p><div class="chips" id="c-coach">${COACHES.map((c) => `<button class="${c === coach ? 'is-active' : ''}">${c}</button>`).join('')}</div>` });
  const openTrial = () => form({ kind: 'Free trial', title: 'Book a free trial', lead: 'Train with us for a day: full gym access, a class and a chat with a coach.' });

  document.addEventListener('click', (e) => {
    const j = e.target.closest('[data-join]'); if (j) { e.preventDefault(); openJoin(j.dataset.plan); return; }
    const c = e.target.closest('[data-consult]'); if (c) { e.preventDefault(); openConsult(c.dataset.coach); return; }
    if (e.target.closest('[data-trial]')) openTrial();
  });

  /* ---------- Film ---------- */
  $('#play').addEventListener('click', () => {
    openModal(`<p class="label mono">Inside Ironvale</p><h3 id="m-title">Built for strength</h3><div class="film"><img src="assets/img/sled.webp" alt="" /><div class="ftxt mono" id="ftxt">Strength</div><span class="bar" id="bar"></span></div><p class="lead" style="margin-top:14px">Preview of our brand film. The full version is coming soon.</p>`);
    const words = ['Strength', 'Discipline', 'Conditioning', 'Community', 'Progress', 'Ironvale'];
    let t = 0; clearInterval(filmTimer);
    filmTimer = setInterval(() => { t += 1; const b = $('#bar'); if (!b) { clearInterval(filmTimer); return; } b.style.width = Math.min(100, (t / 24) * 100) + '%'; $('#ftxt').textContent = words[Math.min(words.length - 1, Math.floor(t / 4))]; if (t >= 24) clearInterval(filmTimer); }, 250);
  });

  /* ---------- Trainers carousel ---------- */
  const track = $('#t-track'); const cards = $$('.trainer', track); const dotsWrap = $('#t-dots');
  dotsWrap.innerHTML = cards.map((_, i) => `<button aria-label="Trainer ${i + 1}"></button>`).join('');
  const dots = $$('button', dotsWrap);
  const step = () => cards[0].getBoundingClientRect().width + 12;
  const cur = () => Math.round(track.scrollLeft / step());
  const update = () => { const c = Math.min(cards.length - 1, cur()); dots.forEach((d, i) => d.classList.toggle('is-active', i === c)); };
  dots.forEach((d, i) => d.addEventListener('click', () => track.scrollTo({ left: i * step(), behavior: reduced ? 'auto' : 'smooth' })));
  $('#t-prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
  $('#t-next').addEventListener('click', () => { const max = track.scrollWidth - track.clientWidth - 4; track.scrollTo({ left: track.scrollLeft >= max ? 0 : track.scrollLeft + step(), behavior: reduced ? 'auto' : 'smooth' }); });
  track.addEventListener('scroll', update, { passive: true }); update();

  /* ---------- Gallery lightbox ---------- */
  const lb = $('#lightbox'); const gal = $$('.g'); let gi = 0;
  const showG = (i) => { gi = (i + gal.length) % gal.length; const g = gal[gi]; $('#lb-img').src = g.querySelector('img').src; $('#lb-img').alt = g.querySelector('img').alt; $('#lb-cap').textContent = g.querySelector('figcaption').textContent; };
  gal.forEach((g, i) => { g.tabIndex = 0; g.setAttribute('role', 'button'); g.addEventListener('click', () => { showG(i); lb.hidden = false; $('.lb-close').focus(); }); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') g.click(); }); });
  $('.lb-close').addEventListener('click', () => { lb.hidden = true; });
  $('.lb-nav.prev').addEventListener('click', () => showG(gi - 1));
  $('.lb-nav.next').addEventListener('click', () => showG(gi + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.hidden = true; });

  /* ---------- FAQ: one open ---------- */
  const dets = $$('#acc details');
  dets.forEach((d) => d.addEventListener('toggle', () => { if (d.open) dets.forEach((o) => { if (o !== d) o.open = false; }); }));

  /* ---------- Newsletter ---------- */
  $('#news').addEventListener('submit', (e) => { e.preventDefault(); const i = e.target.querySelector('input'); toast(`Subscribed: ${i.value}`); i.value = ''; });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!overlay.hidden) closeModal(); if (!lb.hidden) lb.hidden = true; }
    if (!lb.hidden && e.key === 'ArrowRight') showG(gi + 1);
    if (!lb.hidden && e.key === 'ArrowLeft') showG(gi - 1);
  });
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
