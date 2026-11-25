// The eight meditations. Plain math, no drawing and no imports, so the app and the design page run the same code.
// Every frame function takes { t, p, b, L } and gives back numbers, colors or SVG paths for that instant:
//   t  seconds the picture has been showing (stops when paused or off screen)
//   p  how far through the sit, 0 (restless) to 1 (settled)
//   b  how full the breath is, 0 (out) to 1 (in)
//   L  the sit's length in seconds
// The stage is 390 x 844, y down. See ../references/meditation.md.
export const C = { raat: '#1E1554', deep: '#2A1C78', jamun: '#2E2178', mid: '#34248A', grape: '#43319E', violet: '#6A50CF', lilac: '#BBA6F5', haldi: '#FFC93C', genda: '#FF8420', rani: '#F0287C', gulab: '#FF8DB6', anaar: '#B5125C', malai: '#FFF3DC', kajal: '#170F45' };
export function clamp(x, a = 0, b = 1) { 'worklet'; return Math.max(a, Math.min(b, x)); }
/** flat at both ends */
export function ease(u) { 'worklet'; return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u))); }
export function lerp(a, b, u) { 'worklet'; return a + (b - a) * u; }
export function mix(a, b, u) { 'worklet'; const k = Math.max(0, Math.min(1, u)); let o = '#'; for (let i = 1; i < 7; i += 2) { const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16); const h = Math.round(x + (y - x) * k).toString(16); o += h.length < 2 ? '0' + h : h; } return o; }
/** a color partway along a list of colors */
export function ramp(list, u) { 'worklet'; const x = Math.max(0, Math.min(1, u)) * (list.length - 1), i = Math.min(list.length - 2, Math.floor(x)); return mix(list[i], list[i + 1], x - i); }
/** a smooth path through points */
export function path(P) { 'worklet'; const n = P.length; let d = `M${P[0][0].toFixed(2)} ${P[0][1].toFixed(2)}`; for (let i = 0; i < n - 1; i++) { const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], e = P[Math.min(n - 1, i + 2)]; d += `C${(b[0] + (c[0] - a[0]) / 6).toFixed(2)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(2)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(2)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(2)} ${c[0].toFixed(2)} ${c[1].toFixed(2)}`; } return d; }
/** a hand-cut circle. amp is how uneven, ph turns the unevenness (not the circle) */
export function ring(x, y, r, amp, ph, n = 34) { 'worklet'; const P = []; for (let i = 0; i <= n + 1; i++) { const a = (i / n) * 6.2832, q = r * (1 + amp * (0.5 * Math.sin(2 * a + ph) + 0.35 * Math.sin(3 * a - ph * 1.3 + 1) + 0.3 * Math.sin(5 * a + ph * 0.7 + 2))); P.push([x + q * Math.cos(a), y + q * Math.sin(a)]); } return path(P) + 'Z'; }
/** a hill, closed below the screen */
export function land(y, high, rate, ph) { 'worklet'; const P = []; for (let x = -20; x <= 410; x += 30) P.push([x, y + high * Math.sin(x * rate + ph) + high * 0.5 * Math.sin(x * rate * 2.3 + ph * 1.7)]); return path(P) + 'V860H-20Z'; }
/** repeatable scatter: the same n always lands in the same place */
export function seeded(n, k) { 'worklet'; const s = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }

// --- the breath ---
/** the picture's own breath when nothing is guiding it: 4.5 seconds in, 5.5 out */
export function ownBreath(t) { 'worklet'; const u = (t % 10) / 10; return u < 0.45 ? ease(u / 0.45) : 1 - ease((u - 0.45) / 0.55); }
/** a guided breath, from the session's pattern [in, hold, out, rest] in seconds, `into` seconds into the part */
export function guidedBreath(pattern, into) { 'worklet'; const c = pattern[0] + pattern[1] + pattern[2] + pattern[3]; if (c <= 0) return 0; let u = ((into % c) + c) % c; if (u < pattern[0]) return ease(u / pattern[0]); u -= pattern[0]; if (u < pattern[1]) return 1; u -= pattern[1]; if (u < pattern[2]) return 1 - ease(u / pattern[2]); return 0; }
/** move toward a target without jumping, whatever the frame rate. Use it when the guide changes from one breath to another */
export function follow(now, target, dt, rate = 2.5) { 'worklet'; return now + (target - now) * (1 - Math.exp(-dt * rate)); }

// --- 1. the lamp, 6.19: the wind drops ---
export const LAMP = { rings: [330, 268, 212, 160, 112], from: ['#231862', '#291C70', '#2E2078', '#362688', '#402E9A'], to: ['#2A1C78', '#34248A', '#43319E', '#5A3FB0', '#7A4FC0'], gusts: 7, petals: 14, at: [195, 540], scale: 3 };
/** how hard the wind blows: 1 at the start, nothing after 72% */
export function wind(p) { 'worklet'; return Math.pow(1 - ease(clamp(p / 0.72)), 1.3); }
/** how far the wind has blown by p, as a share of the whole sit (wind added up) */
export function blown(p) { 'worklet'; const n = 24, h = clamp(p) / n; let s = 0; for (let i = 0; i < n; i++) s += wind(h * (i + 0.5)); return s * h; }
export function lamp({ t, p, b, L }) { 'worklet';
  const w = wind(p), n = (k) => { 'worklet'; return Math.sin(t * 3.4 + k) * 0.5 + Math.sin(t * 6.1 + k * 2) * 0.28 + Math.sin(t * 1.9 + k) * 0.42; }, rings = [], gusts = [], petals = [], far = blown(p) * L;
  // the rings' own turning follows how far the wind has blown, so it slows with the wind instead of jumping
  for (let k = 0; k < 5; k++) { const r = LAMP.rings[k] * (1 + 0.035 * b * (1 - w) + 0.05 * w * n(k)) * (0.82 + 0.18 * ease(p * 1.3)); rings.push({ d: ring(195 + w * n(k + 1) * 20, 470 + w * n(k + 3) * 12, r, 0.03 + 0.11 * w, t * 0.25 + far * 1.6 + k), fill: mix(LAMP.from[k], LAMP.to[k], p) }); }
  for (let k = 0; k < 7; k++) { const x = ((far * (90 + k * 22) + k * 140) % 700) - 200, y = 150 + k * 74; gusts.push({ d: `M${x.toFixed(2)} ${y}q28 -16 56 0t56 0t44 -6`, width: 3 + (k % 3) * 2, opacity: w * 0.85 }); }
  for (let i = 0; i < 14; i++) { const v = 0.6 + seeded(i, 1), y0 = seeded(i, 2), ph = seeded(i, 3) * 6, x = ((seeded(i, 4) + far * (0.09 * v + 0.11)) % 1.2) * 470 - 40, fall = ease((p - 0.45 - y0 * 0.25) / 0.25); petals.push({ x, y: lerp(120 + y0 * 460 + Math.sin(t * 2 + ph) * 24 * w, 706 + y0 * 46, fall), turn: ph * 57 + far * 70 * v, scale: 0.7 + 0.4 * v }); }
  return { sky: mix(C.raat, '#231862', p), stars: 0.25 + 0.75 * p, rings, gusts, petals, outer: { skew: n(0) * 19 * w, sx: 1 - 0.06 * w * n(2), sy: 0.94 + 0.1 * p + 0.05 * b + 0.14 * w * n(1) }, inner: { skew: n(0.6) * 23 * w, sx: 1, sy: 0.94 + 0.1 * p + 0.06 * b + 0.17 * w * n(2.2) } }; }

// --- 2. bring it back, 6.26: it goes after things and comes home ---
export const WANDER = { things: [['phone', 78, 170, 0.82], ['mango', 300, 246, 0.8], ['kite', 206, 96, 0.9], ['chai', 74, 352, 0.72]], perch: [196, 594], blossoms: [[104, 546], [352, 538], [338, 652], [58, 612], [268, 604], [128, 604], [382, 580], [92, 580], [318, 626]], branch: [[-20, 628], [60, 612], [150, 606], [250, 610], [330, 596], [410, 572]] };
/** where the bird is in its trips: which one, how far away (0 perched, 1 at the thing), and when it last got home */
export function trip(t) { 'worklet'; let from = 0, k = 0; for (;;) { const m = Math.min(k, 6), rest = 2.6 + m * 1.1, out = 5.5 + m, stay = 1.9, back = 2.4, len = rest + out + stay + back, u = t - from; if (u < len || k > 400) { const gone = u - rest; let away = 0, heading = 'rest'; if (gone >= 0 && gone < out) { away = gone / out; heading = 'out'; } else if (gone >= out && gone < out + stay) { away = 1; heading = 'there'; } else if (gone >= out + stay) { away = 1 - (gone - out - stay) / back; heading = 'home'; } return { k, away: clamp(away), heading, sinceHome: u }; } from += len; k++; } }
export function wander({ t }) { 'worklet';
  const q = trip(t), thing = (q.k + 1) % 4, z = WANDER.things[thing], u = ease(q.away), calm = Math.min(1, q.k / 6), left = z[1] < 196;
  const x = lerp(196, z[1] + 46, u) + Math.sin(u * Math.PI) * 46 * (thing % 2 ? 1 : -1), y = lerp(594, z[2] + 42, u) - Math.sin(u * Math.PI) * 34 + (q.away ? 0 : Math.sin(t * 1.4) * 1.2), s = lerp(2.1, 1.05, u);
  const out = q.heading === 'out' || q.heading === 'there', home = q.heading === 'home', face = out ? (left ? -1 : 1) : home ? (left ? 1 : -1) : 1;
  return { bird: { x, y, sx: s * face, sy: s }, wing: q.away > 0 ? 1 + 0.62 * Math.sin(t * 11) : 1, things: WANDER.things.map((a, i) => ({ x: a[1] + Math.sin(t * 0.5 + i * 2) * 9, y: a[2] + Math.cos(t * 0.43 + i) * 8, turn: Math.sin(t * 0.4 + i) * 5, scale: a[3] * (i === thing && out ? 1 + 0.1 * u : 1) * (1 - 0.12 * calm), opacity: lerp(1, 0.35, calm) })),
    // a blossom opens each time it gets home
    blossoms: WANDER.blossoms.map((_, i) => { const n = i < q.k - 1 ? 1 : i === q.k - 1 ? ease(q.sinceHome / 1.6) : 0; return { open: n, turn: i * 33 + (1 - n) * -60 + Math.sin(t * 0.8 + WANDER.blossoms[i][0]) * 3 }; }), word: out && q.away > 0.3 ? 'It wandered off' : home ? 'Back it comes' : 'Here' }; }

// --- 3. the ocean, 2.70: let it all pour in ---
export const OCEAN = { sky: [C.raat, C.raat, C.deep, '#7A3A9E', '#F0679C', '#FFB070'], far: [C.grape, C.grape, C.violet, '#8F5FC8', C.gulab], near: [C.mid, C.mid, C.grape, '#6A3FB0', '#D267B4'], farHill: [[-20, 360], [40, 300], [104, 232], [160, 290], [214, 250], [270, 196], [330, 268], [372, 236], [410, 262]], nearHill: [[-20, 400], [60, 372], [140, 396], [220, 352], [300, 390], [410, 346]], rivers: [[40, 304, 70, C.rani, 17], [104, 236, 128, C.genda, 22], [214, 252, 192, C.gulab, 18], [270, 200, 262, C.lilac, 24], [372, 240, 336, C.haldi, 19]], sea: ['#8F74EE', C.violet, '#5A44C4', C.grape, '#34248A', C.deep] };
export function ocean({ t, p, b }) { 'worklet';
  const top = (x) => { 'worklet'; return 470 - b * 34 + Math.sin(x * 0.02 + t * 0.5) * 8; };
  const rivers = OCEAN.rivers.map((a, i) => { const A = [], B = [], M = []; for (let k = 0; k <= 12; k++) { const u = k / 12, x = lerp(a[0], a[2], u) + Math.sin(u * 9 - t * 1.1 + i * 1.4) * (2 + 12 * u * (1.15 - u)), y = lerp(a[1], top(a[2]) + 40, u), w = 1.5 + a[4] * Math.pow(u, 1.2) * (1 + 0.1 * Math.sin(u * 14 - t * 3)); A.push([x - w, y]); B.unshift([x + w, y]); if (k > 2) M.push([x, y]); } return { d: path(A) + 'L' + path(B).slice(1) + 'Z', light: path(M), dash: -t * 62 }; });
  const sea = OCEAN.sea.map((_, k) => { const P = []; for (let x = -20; x <= 410; x += 22) P.push([x, 470 + k * 62 - b * (34 - k * 5) + Math.sin(x * 0.02 + t * (0.5 - k * 0.06) + k * 1.7) * (9 + k) + Math.sin(x * 0.047 - t * 0.4 + k) * 4]); return path(P) + 'V860H-20Z'; });
  const glints = [0, 1, 2, 3, 4, 5, 6].map((k) => { const w = (16 + k * 13) * (0.8 + 0.3 * Math.sin(t * 1.1 + k)), y = 510 + k * 34 - b * (30 - k * 4), x = 195 + Math.sin(t * 0.7 + k * 1.9) * 10; return { d: `M${(x - w).toFixed(2)} ${y.toFixed(2)}Q${x.toFixed(2)} ${(y + 7).toFixed(2)} ${(x + w).toFixed(2)} ${y.toFixed(2)}`, opacity: clamp((p - 0.45) * 3) * 0.95 }; });
  return { sky: ramp(OCEAN.sky, p), stars: clamp(1 - p * 1.5), moon: { x: 290 - p * 60, y: 128 + p * 240, opacity: 1 - clamp((p - 0.45) * 4) }, sunY: 500 - ease((p - 0.45) / 0.55) * 250, far: ramp(OCEAN.far, p), near: ramp(OCEAN.near, p), rivers, sea, glints }; }

// --- 4. one bead, one breath, 7.7 ---
export const MALA = { beads: 18, gap: 0.55, big: 62, small: 34, holds: ['sun', 'moon', 'ocean', 'leaf', 'elephant', 'lotus', 'mango', 'parrot', 'tortoise'], colors: [C.rani, C.genda, C.haldi, C.violet, C.gulab], sky: [C.deep, C.jamun, '#3E1F7A', '#5A1F7A', C.jamun] };
export function thread(u) { 'worklet'; return [195 + Math.sin(u * 2.5 + 0.4) * 86, 422 + u * 300]; }
/** `count` is how many breaths are done, with the fraction sliding during the out-breath (see beadCount) */
export function mala({ t, b, count }) { 'worklet';
  const beads = []; for (let i = 0; i < MALA.beads; i++) { const k = ((((i - count * 2 + MALA.beads / 2) % MALA.beads) + MALA.beads) % MALA.beads) - MALA.beads / 2, v = -k * MALA.gap * 0.51 * 1.0, at = thread(v), near = Math.max(0, 1 - Math.abs(k) / 2.2), big = i % 2 === 0; beads.push({ x: at[0], y: at[1], turn: Math.sin(t * 0.6 + i) * 4, scale: (big ? 0.92 : 0.95) + (big ? 0.42 : 0.1) * ease(near) + 0.03 * b * near, hidden: Math.abs(v) > 1.9, big }); }
  return { sky: ramp(MALA.sky, (t / 90) % 1), beads }; }
/** breaths done, from the picture's own ten-second breath */
export function beadCount(t) { 'worklet'; const c = t / 10, n = Math.floor(c); return n + ease((c - n - 0.45) / 0.5); }

// --- 5. the tortoise, 2.58: calling the senses home ---
export const TORTOISE = { at: [195, 560], scale: 3, senses: [['phone', 64, 180, 'What you hear'], ['mango', 316, 212, 'What you taste'], ['kite', 196, 110, 'What you see'], ['marigold', 86, 330, 'What you smell'], ['feather', 318, 352, 'What you touch']], plates: [[0, -9, 12.5], [-23, 5, 9.6], [23, 5, 9.6], [-11, 19, 7.6], [11, 19, 7.6]], plateOf: [1, 2, 0, 3, 4], lit: [C.haldi, C.genda, C.gulab, C.haldi, C.genda], sky: ['#F0679C', '#B04A9E', '#5A2E9C', C.deep, C.raat], hills: [['#F9A0C4', '#C45FA8', '#5A44C4', '#34248A'], ['#FF8DB6', '#B04A9E', '#43319E', '#2A1C78']] };
export function tortoise({ t, p, b }) { 'worklet';
  const k = (j) => { 'worklet'; return ease((p - 0.06 - j * 0.135) / 0.13); }, night = ease((p - 0.2) / 0.7), limb = (j) => { 'worklet'; return ease((k(j) - 0.4) / 0.6); }, step = Math.floor((p - 0.06) / 0.135), on = step >= 0 && step < 5;
  const senses = TORTOISE.senses.map((a, i) => { const u = k(i), pl = TORTOISE.plates[TORTOISE.plateOf[i]]; return { x: lerp(a[1] + Math.sin(t * 0.9 + i * 2) * 12, 195 + pl[0] * 3, u), y: lerp(a[2] + Math.cos(t * 0.8 + i) * 10, 560 + pl[1] * 3, u) - Math.sin(u * Math.PI) * 40, turn: Math.sin(t * 1.1 + i) * 8 * (1 - u), scale: lerp(0.78, 0.12, u), opacity: 1 - ease((u - 0.9) / 0.1) }; });
  const plates = TORTOISE.plates.map((_, j) => { const i = TORTOISE.plateOf.indexOf(j); return mix(C.anaar, TORTOISE.lit[j], ease((k(i) - 0.85) / 0.15)); });
  const q0 = limb(0), q1 = limb(1), h = ease((p - 0.5) / 0.14);
  return { sky: ramp(TORTOISE.sky, night), stars: night * night, hills: TORTOISE.hills.map((c) => ramp(c, night)), moon: { x: 300, y: 420 - ease((p - 0.6) / 0.35) * 280, opacity: ease((p - 0.6) / 0.2) }, senses, plates, legBack: [6 * q0, -21 * q0], legFront: [-6 * q1, -21 * q1], head: [-30 * h, 4 * h], shell: [1 + 0.014 * b, 1 + 0.035 * b], word: on ? TORTOISE.senses[step][3] : p > 0.76 && p < 0.9 ? 'All of you, home' : '', wordOpacity: on ? clamp(Math.sin(Math.PI * (((p - 0.06) / 0.135) % 1)) * 1.6) : p > 0.76 && p < 0.9 ? clamp(Math.sin(Math.PI * ((p - 0.76) / 0.14)) * 2) : 0, wordColor: night < 0.35 ? C.kajal : C.malai }; }

// --- 6. the lotus, 5.27 and 5.10: even in, even out ---
export const LOTUS = { at: [195, 606], scale: 2.1, petals: [[-74, 62, 20, '#8E0E4C'], [74, 62, 20, '#8E0E4C'], [-54, 74, 23, C.anaar], [54, 74, 23, C.anaar], [-32, 86, 25, C.rani], [32, 86, 25, C.rani], [-14, 92, 25, '#FF5C9C'], [14, 92, 25, '#FF5C9C'], [0, 94, 26, C.gulab]], sky: [C.raat, C.deep, '#4A2488', '#7A2E92'], sun: ['#2E2178', '#5A2E9C', '#B04A9E', C.genda] };
export function lotusPetal(h, w) { 'worklet'; return `M0 0C${-w} ${-h * 0.22} ${-w * 1.05} ${-h * 0.7} 0 ${-h}C${w * 1.05} ${-h * 0.7} ${w} ${-h * 0.22} 0 0Z`; }
export function lotus({ t, p, b }) { 'worklet';
  const ripples = [0, 1, 2, 3].map((i) => { const u = (t / 10 + i * 0.25) % 1; return { rx: 110 + u * 170, ry: 20 + u * 34, opacity: (1 - u) * 0.7 * clamp(u * 8) }; });
  const drops = [0, 1, 2, 3, 4].map((i) => { const u = (t * 0.13 + i * 0.2) % 1, side = i % 2 ? 1 : -1, roll = clamp(u / 0.55), fall = clamp((u - 0.55) / 0.3); return { x: 195 + side * (30 + i * 14) + side * roll * 58, y: lerp(606 - 70 + i * 9, 612, roll) + fall * fall * 60, scale: 0.9 * clamp(u * 8), opacity: 1 - ease((u - 0.8) / 0.1) }; });
  return { sky: ramp(LOTUS.sky, p), stars: 1 - p, sun: { y: 470 - p * 60, scale: 0.5 + 0.3 * p + 0.2 * b, fill: ramp(LOTUS.sun, p) }, petals: LOTUS.petals.map((z, i) => ({ turn: z[0] * (0.2 + 0.9 * b), sx: 0.8 + 0.2 * b, sy: 0.9 + 0.1 * b + 0.015 * Math.sin(t * 0.7 + i) })), ripples, drops }; }

// --- 7. it passes, 2.14: a whole day goes over ---
export const SKY = { sky: [C.raat, '#7A3A9E', '#FF8DB6', '#FFB070', '#FFC36A', '#FFA0A8', '#B58AE0', '#8F74EE', '#F0679C', '#5A2E9C', C.raat], hills: [['#34248A', '#5A44C4', '#8F74EE', '#6A50CF', '#34248A'], ['#2E2078', '#43319E', '#6A50CF', '#5A44C4', '#2E2078'], ['#241766', '#34248A', '#43319E', '#43319E', '#241766']], words: ['that meeting', 'dinner', 'what they said', 'the train', 'nothing much', 'tomorrow'], cloudFill: [C.malai, '#E0D3FF', C.gulab], gita: [195, 628, 1.15] };
export function sky({ t, p, b }) { 'worklet';
  const arc = (u) => { 'worklet'; return [195 + 230 * Math.cos(Math.PI * (1 - clamp(u))), 560 - 430 * Math.sin(Math.PI * clamp(u)) + Math.max(0, -u, u - 1) * 2600]; }, su = (p - 0.06) / 0.6, mu = (p - 0.78) / 0.34, s = arc(su), m = arc(mu), rain = clamp(Math.min((p - 0.5) * 14, (0.7 - p) * 14));
  const drops = []; for (let i = 0; i < 46; i++) { const y = ((seeded(i, 7) + t * (0.63 + 0.54 * seeded(i, 8))) % 1) * 640 - 40; drops.push([seeded(i, 9) * 420 - y * 0.06, y]); }
  return { sky: ramp(SKY.sky, p), stars: Math.max(0, 1 - p * 9, (p - 0.86) * 8), sun: { x: s[0], y: s[1], turn: Math.sin(t * 0.3) * 5 }, moon: { x: m[0], y: m[1] - 10 }, rain, drops, kite: { x: 90 + Math.sin(t * 0.6) * 26, y: 230 + Math.cos(t * 0.5) * 18, turn: Math.sin(t * 0.7) * 12, opacity: clamp(Math.min((p - 0.22) * 9, (0.47 - p) * 9)) }, clouds: [0, 1, 2, 3, 4, 5].map((i) => ({ x: ((t * 19 + i * 178) % 1070) - 150, y: 130 + (i % 3) * 96 + Math.sin(t * 0.5 + i) * 6, scale: 0.86 + 0.13 * (i % 2), fill: mix(SKY.cloudFill[i % 3], C.lilac, rain * 0.8) })), hills: SKY.hills.map((c) => ramp(c, p)), gita: 1.15 + 0.015 * b }; }

// --- 8. the taste in water, 7.8: falling in ---
export const DROPS = { colors: [C.lilac, C.violet, C.rani, C.genda, C.haldi, C.grape], size: [1, 0.85, 0.71, 0.58, 0.46, 0.35], blur: 17, cut: [26, -11], count: 7 };
export function tear(x, y, r, k) { 'worklet'; const q = (n) => { 'worklet'; return n.toFixed(2); }; return `M${q(x)} ${q(y - r * (1 + 0.75 * k))}C${q(x + r * 0.42)} ${q(y - r * (0.75 + 0.2 * k))} ${q(x + r)} ${q(y - r * 0.42)} ${q(x + r)} ${q(y + r * 0.12)}C${q(x + r)} ${q(y + r * 0.66)} ${q(x + r * 0.56)} ${q(y + r)} ${q(x)} ${q(y + r)}C${q(x - r * 0.56)} ${q(y + r)} ${q(x - r)} ${q(y + r * 0.66)} ${q(x - r)} ${q(y + r * 0.12)}C${q(x - r)} ${q(y - r * 0.42)} ${q(x - r * 0.42)} ${q(y - r * (0.75 + 0.2 * k))} ${q(x)} ${q(y - r * (1 + 0.75 * k))}Z`; }
export function drops({ t, b }) { 'worklet';
  const at = []; for (let i = 0; i < 7; i++) at.push(i === 0 ? [195 + Math.sin(t * 0.21) * 14, 420 + Math.sin(t * 0.17) * 16, 168 + 10 * b] : [195 + Math.sin(t * (0.16 + i * 0.023) + i * 2.1) * 150, ((i * 163 + t * (16 + i * 3)) % 1300) - 200, 64 + ((i * 37) % 42) + 4 * Math.sin(t * 0.7 + i)]);
  return { sky: ramp([C.raat, '#2A1258', C.raat], (t / 60) % 1), layers: DROPS.size.map((s, k) => at.map((a, i) => tear(a[0] + Math.sin(t * 0.5 + k) * 2, a[1] + k * (i ? 2 : 5), a[2] * s, i ? 0.8 : 0.55 + 0.1 * Math.sin(t * 0.4)))), moon: { x: at[0][0] - 6 + Math.sin(t * 0.4) * 3, y: at[0][1] + 30, turn: Math.sin(t * 0.23) * 9 }, sun: { x: at[0][0] + 13, y: at[0][1] + 36 + Math.sin(t * 0.9) * 2, scale: 0.95 + 0.05 * b } }; }

/** the one frame each shows when nothing should move */
export const STILL = { lamp: { t: 8, p: 0.95, b: 0.5, L: 420 }, wander: { t: 46, p: 1, b: 0.5, L: 120 }, ocean: { t: 5, p: 0.85, b: 0.6, L: 300 }, mala: { t: 3, p: 0.5, b: 0.5, L: 270, count: 2 }, tortoise: { t: 4, p: 1, b: 0.4, L: 240 }, lotus: { t: 4, p: 0.5, b: 0.8, L: 60 }, sky: { t: 20, p: 0.3, b: 0.5, L: 240 }, drops: { t: 12, p: 0.5, b: 0.5, L: 180 } };
/** which picture goes behind a session on this verse. Proposed, not decided */
export const SIT_FOR_VERSE = { '2.14': 'sky', '2.58': 'tortoise', '2.70': 'ocean', '5.10': 'lotus', '5.27': 'lotus', '6.19': 'lamp', '6.26': 'wander', '6.34': 'wander', '7.7': 'mala', '7.8': 'drops', '10.25': 'mala' };
export function sitFor(verse) { return SIT_FOR_VERSE[verse] ?? 'lamp'; }
