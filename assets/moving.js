// The page's two moving pieces, run on the app's own code: the lamp (sits.js) and the bookshelf (bookshelf.js).
import { C, LAMP, STILL, lamp, seeded, clamp, ownBreath } from './sits.js';
import { BOARD, bandAt, breath, flowerAt, nameAt, nameTall, settle, shelf, sizes, still } from './bookshelf.js';

const calm = matchMedia('(prefers-reduced-motion: reduce)');

// Runs `step(seconds since the last frame)` only while `box` is on screen. A step that returns false rests until wake().
function clock(box, step) {
  let raf = 0, last = 0, seen = false;
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (step(dt) !== false && seen) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && seen) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; wake(); }, { rootMargin: '40px' }).observe(box);
  return wake;
}

// ---------- the lamp ----------
(async () => {
  const box = document.getElementById('sit');
  const art = await (await fetch(new URL('./lamp.json', import.meta.url))).json();
  const el = (t, a, p) => { const e = document.createElementNS('http://www.w3.org/2000/svg', t); for (const k in a) e.setAttribute(k, a[k]); p?.appendChild(e); return e; };
  const set = (e, a) => { for (const k in a) e.setAttribute(k, a[k]); };
  const n2 = (v) => v.toFixed(3);
  const PETAL = 'M0 0C-7 -5 -8 -15 0 -22C8 -15 7 -5 0 0Z';
  const s = el('svg', { viewBox: '0 0 390 800', preserveAspectRatio: 'xMidYMid slice', role: 'img', 'aria-label': 'A lamp flickering in the wind, then growing still' }, box);
  const bg = el('rect', { width: 390, height: 844 }, s);
  const rings = LAMP.rings.map(() => el('path', {}, s));
  const stars = el('g', {}, s);
  for (let i = 0; i < 30; i++) el('circle', { cx: n2(seeded(i, 9) * 390), cy: n2(30 + seeded(i, 10) * 270), r: n2(0.7 + seeded(i, 11) * 1.1), fill: [C.violet, C.lilac, C.malai][i % 3] }, stars);
  const gusts = Array.from({ length: 7 }, () => el('path', { fill: 'none', stroke: C.lilac, 'stroke-linecap': 'round' }, s));
  const petals = Array.from({ length: 14 }, (_, i) => el('path', { d: PETAL, fill: [C.rani, C.gulab, C.genda, C.haldi][i % 4] }, s));
  const body = el('g', { transform: 'translate(195 520) scale(3)' }, s);
  const piece = (name) => { const g = el('g', {}, body); g.innerHTML = art[name]; return g; };
  piece('lamp-inside');
  const outer = piece('lamp-flame'), inner = piece('lamp-flame-inner');
  piece('lamp-bowl');
  const LENGTH = 54;
  const draw = (m) => {
    const f = lamp(m);
    set(bg, { fill: f.sky });
    set(stars, { opacity: n2(f.stars) });
    f.rings.forEach((r, k) => set(rings[k], r));
    f.gusts.forEach((q, k) => set(gusts[k], { d: q.d, 'stroke-width': q.width, opacity: n2(q.opacity) }));
    f.petals.forEach((q, k) => set(petals[k], { transform: `translate(${n2(q.x)} ${n2(q.y)}) rotate(${n2(q.turn)}) scale(${n2(q.scale)})` }));
    [[outer, f.outer], [inner, f.inner]].forEach(([e, q]) => set(e, { transform: `translate(0 11) skewX(${n2(q.skew)}) scale(${n2(q.sx)} ${n2(q.sy)}) translate(0 -11)` }));
  };
  let t = 1.5;
  // Settles once and stays settled: nothing starts over.
  const show = () => calm.matches ? draw(STILL.lamp) : draw({ t, p: clamp((t / LENGTH) * 1.04), b: ownBreath(t), L: LENGTH });
  show();
  const wake = clock(box, (dt) => { if (calm.matches) return show(), false; t += dt; show(); });
  calm.addEventListener('change', wake);
})();

// ---------- the bookshelf ----------
(() => {
  // each chapter's title, and how wide its cut name is when 188 tall (mobile/src/cut/shelf-art.ts)
  const BOOKS = [["Arjuna's Despair", 630], ['The Way of Understanding', 1183], ['The Way of Action', 534], ['Knowledge and Letting Go of Action', 889], ['Letting Go While Still Acting', 799], ['The Steady Mind', 981], ['Knowing and Seeing', 532], ['The Imperishable', 1060], ['The Royal Secret', 976], ['Divine Glories', 579], ['The Cosmic Vision', 506], ['The Way of Devotion', 723], ['The Field and Its Knower', 704], ['The Three Qualities', 718], ['The Supreme Person', 886], ['Two Kinds of Nature', 990], ['Three Kinds of Faith', 424], ['Freedom Through Letting Go', 707]];
  const BANDS = [C.genda, C.gulab, C.haldi], SPINES = [C.jamun, C.raat, C.deep];
  const box = document.getElementById('shelves');
  box.innerHTML = [0, 1, 2].map((s) => `<div class="row-of"><i class="board"></i>${BOOKS.slice(s * 6, s * 6 + 6).map(([title], i) => { const k = s * 6 + i; return `<button type="button" class="bk" aria-label="Chapter ${k + 1}, ${title}" style="background:${SPINES[k % 3]};transform-origin:${k === 12 ? '100%' : '0'} 100%"><i class="fr"></i><i class="bd" style="background:${BANDS[s]}"></i><img src="assets/shelf/flower-${k + 1}.webp" alt=""><img class="nm" src="assets/shelf/name-${k + 1}.webp" alt=""></button>`; }).join('')}</div>`).join('');
  const rows = [...box.children], books = [...box.querySelectorAll('.bk')];
  let facing = 4, turn = BOOKS.map((_, k) => +(k === facing)), speed = turn.map(() => 0), z, t = 0;
  const draw = () => books.forEach((b, k) => {
    const s = Math.floor(k / 6), at = shelf(s, turn, z)[k % 6], o = turn[k], f = flowerAt(o, at.w, z), [front, band, flower, name] = b.children;
    const a = k === facing && !calm.matches ? breath(t, k) : { x: 1, y: 1 };
    b.style.left = at.x.toFixed(2) + 'px'; b.style.width = at.w.toFixed(2) + 'px'; b.style.transform = `rotate(${at.deg.toFixed(3)}deg)`;
    front.style.opacity = o; band.style.opacity = bandAt(o);
    flower.style.cssText = `left:${f.x - f.size / 2}px;top:${f.y - f.size / 2}px;width:${f.size}px;height:${f.size}px;transform:scale(${a.x},${a.y})`;
    name.style.opacity = nameAt(o, BOOKS[k][1], z);
    b.setAttribute('aria-pressed', k === facing);
  });
  const fit = () => {
    const across = innerWidth >= 1000 ? 3 : 1, width = across === 3 ? Math.min(390, Math.floor((document.documentElement.clientWidth - 20) / 3)) : Math.min(430, document.documentElement.clientWidth);
    z = sizes(width, 620);
    box.style.gridTemplateColumns = `repeat(${across}, ${width}px)`;
    rows.forEach((r) => { r.style.height = z.tall + BOARD + 'px'; r.firstChild.style.top = z.tall + 'px'; });
    books.forEach((b, k) => { b.style.height = z.tall + 'px'; b.lastChild.style.height = nameTall(BOOKS[k][1], z) + 'px'; });
    draw();
  };
  const wake = clock(box, (dt) => {
    t += dt;
    if (calm.matches) { turn = turn.map((_, k) => +(k === facing)); speed = turn.map(() => 0); draw(); return false; }
    if (!still(turn, speed, facing)) ({ turn, speed } = settle(turn, speed, facing, dt));
    draw();
  });
  books.forEach((b, k) => b.addEventListener('click', () => { facing = k; wake(); }));
  fit();
  addEventListener('resize', fit);
  calm.addEventListener('change', wake);
})();
