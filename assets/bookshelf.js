// The Read bookshelf: where every book stands and how it moves. Plain math, no drawing, no imports. See ../SKILL.md.
// One number per book does everything: how far it's turned to face you, 0 (a spine) to 1 (its cover). They always add up to 1.

export const PAD = 12, GAP = 3, BOARD = 11, BETWEEN = 22, SHELVES = 3, EACH = 6;
/** which book leans on each shelf, and which way: 6 leans left, 10 leans left, 13 leans right */
export const LEANS = [{ at: 5, way: -1 }, { at: 3, way: -1 }, { at: 0, way: 1 }];
/** how far a leaning book tips, in degrees, when its shelf has no book facing out */
export const TIP = 9;

const clamp = (x) => { 'worklet'; return x < 0 ? 0 : x > 1 ? 1 : x; };
const smooth = (x) => { 'worklet'; const u = clamp(x); return u * u * (3 - 2 * u); };

/** the longest name (Understanding) is this wide when 188 tall */
export const LONGEST = 1183;
/** a name's height on the cover, at most */
export const NAME = 25;
/** narrower or shorter than this, or past 1.35 times text size, the shelf gives way to the list: names would go under 14 */
export function fits(width, room) { 'worklet'; return width >= 355 && room >= SHELVES * (112 + BOARD) + (SHELVES - 1) * BETWEEN; }
/** sizes for a page `width` wide with `room` points for all three shelves. It always fits: nothing scrolls, nothing is cut by the tab bar */
export function sizes(width, room) { 'worklet';
  const tall = Math.min(190, (room - SHELVES * BOARD - (SHELVES - 1) * BETWEEN) / SHELVES);
  const spine = Math.floor(Math.min(45, (width - 2 * PAD - 127) / (EACH - 1) - GAP));
  const cover = width - 2 * PAD - (EACH - 1) * (spine + GAP);
  return { width, tall, spine, cover, small: spine - 4, big: Math.min(100, tall - NAME - 34, cover - 16), step: tall + BOARD + BETWEEN };
}

/** where the six books of shelf `s` stand. `turn` is all eighteen numbers */
export function shelf(s, turn, z) { 'worklet';
  const w = [], x = [], { at, way } = LEANS[s];
  let out = 0;
  for (let k = 0; k < EACH; k++) { const o = turn[s * EACH + k]; out += o; w.push(z.spine + (z.cover - z.spine) * o); }
  const loose = smooth((1 - out - 0.68) / 0.32), top = z.tall * Math.sin((TIP * Math.PI) / 180);
  const foot = GAP + loose * (top - GAP); // how far its foot stands from its neighbor, so its corner just touches when it's settled
  const deg = way * TIP * loose; // only once every book here is nearly a spine again, so nothing wide ever tips
  if (way < 0) { // packed from the left up to the leaning one, the rest packed from the right
    let l = PAD, r = z.width - PAD;
    for (let k = 0; k <= at; k++) { if (k) l += k === at ? foot : GAP; x[k] = l; l += w[k]; }
    for (let k = EACH - 1; k > at; k--) { r -= w[k]; x[k] = r; r -= GAP; }
  } else { // packed from the right, the first one leaning on the second
    let r = z.width - PAD;
    for (let k = EACH - 1; k > at; k--) { r -= w[k]; x[k] = r; r -= k === at + 1 ? foot : GAP; }
    for (let k = at; k >= 0; k--) { r -= w[k]; x[k] = r; r -= GAP; }
  }
  return x.map((left, k) => ({ x: left, w: w[k], deg: k === at ? deg : 0 }));
}

/** the flower on a book `w` wide and `o` turned: its middle from the book's left and top, and its size */
export function flowerAt(o, w, z) { 'worklet'; const e = smooth(o), size = z.small + (z.big - z.small) * e; return { x: w / 2, y: (z.tall - 10 - z.small / 2) * (1 - e) + (12 + z.big / 2) * e, size }; }
/** a name's height: 25, or a little smaller so a long one fits its cover */
export function nameTall(wide, z) { 'worklet'; return Math.min(NAME, ((z.cover - 14) * 188) / wide); }
/** a name fades in only once its cover is wide enough to hold all of it, so a letter is never cut */
export function nameAt(o, wide, z) { 'worklet'; const from = Math.max(0.6, ((wide * nameTall(wide, z)) / 188 + 4 - z.spine) / (z.cover - z.spine)); return smooth((o - from) / (1 - from)); }
/** the band across the top of a spine leaves as the cover arrives */
export function bandAt(o) { 'worklet'; return 1 - smooth(o / 0.5); }
/** ease every book toward facing (or not), without overshoot, the same at any frame rate, and safe to interrupt */
export function settle(turn, speed, facing, dt, rate = 8.5) { 'worklet';
  const d = Math.exp(-rate * dt), T = [], V = [];
  for (let k = 0; k < turn.length; k++) { const goal = k === facing ? 1 : 0, a = turn[k] - goal, b = speed[k] + rate * a; T.push(goal + (a + b * dt) * d); V.push((speed[k] - rate * b * dt) * d); }
  return { turn: T, speed: V };
}
/** close enough to stop the clock */
export function still(turn, speed, facing) { 'worklet'; for (let k = 0; k < turn.length; k++) if (Math.abs(turn[k] - (k === facing ? 1 : 0)) > 0.0005 || Math.abs(speed[k]) > 0.005) return false; return true; }

/** a finger running along the shelf: how far book `k` rises when the finger is over book `at` (a fraction is between two) */
export function rise(k, at, held) { 'worklet'; return 10 * smooth(1 - Math.abs(k - at) / 1.7) * held; }
/** which book of a shelf a finger at `px` is over */
export function under(px, books) { 'worklet'; let best = 0, far = 1e9; for (let k = 0; k < books.length; k++) { const d = Math.abs(px - (books[k].x + books[k].w / 2)) - books[k].w / 2; if (d < far) { far = d; best = k; } } return best; }

/** the flower on the cover breathing, by 1.2 percent: scale across and down at `t` seconds */
export function breath(t, k, much = 0.012) { 'worklet'; return { x: 1 + much * Math.sin(t * 0.9 + k), y: 1 + much * Math.sin(t * 0.9 + k + 1.3) }; }
/** going in, at `p` from 0 to 1. Night fades in over everything but the cover, which is already night, so the book dissolves
    into the page. Only then does its flower float to the top middle, over nothing but night, and fade. */
export function goingIn(p, from, W, H, big) { 'worklet'; const e = smooth((p - 0.35) / 0.65), size = big * (1 + 0.5 * e);
  return { night: smooth(p / 0.45), name: 1 - smooth(p / 0.3), flower: 1 - smooth((p - 0.7) / 0.3), size,
    x: (from.x + from.w / 2) * (1 - e) + (W / 2) * e, y: (from.y + 12 + big / 2) * (1 - e) + H * 0.2 * e }; }
