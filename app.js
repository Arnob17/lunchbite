/* ==========================================================
   LUNCH BITE — landing page behaviour
   1. Photo lunchbox (PhotoBox: open/close) + SVG food layer
   2. Hero assembly timeline
   3. Top-down plate thumbnails for the weekly menu
   4. Reusable menu-card component + selector
   5. Page interactions (nav, reveal, parallax, tilt, toast)
   ========================================================== */
(() => {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
let UID = 0;

function rng(seed) { // deterministic PRNG so food looks identical each render
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function blobPath(r, cx, cy, rx, ry, n = 9, j = .16) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (r() - .5) * 2 * j; p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = 'M' + mid(p[n - 1], p[0]);
  for (let i = 0; i < n; i++) d += 'Q' + p[i] + ' ' + mid(p[i], p[(i + 1) % n]);
  return d + 'Z';
}

/* ----------------------------------------------------------
   1. LUNCHBOX RENDERER
   viewBox 800x640. P(u,v) maps compartment space to the
   perspective floor of the box.
   ---------------------------------------------------------- */
const FT = { tl: [185, 242], tr: [615, 242], bl: [112, 432], br: [688, 432] };
const P = (u, v) => {
  const lx = lerp(FT.tl[0], FT.bl[0], v), rx = lerp(FT.tr[0], FT.br[0], v);
  return [lerp(lx, rx, u), lerp(FT.tl[1], FT.bl[1], v)];
};
const poly = pts => pts.map(p => p.join(',')).join(' ');
const rectUV = (u0, v0, u1, v1) => poly([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]);

function place(g, x, y, rot = 0, sc = 1) {
  g._p = { x, y, rot, sc };
  g.style.transform = `translate(${x}px,${y}px) rotate(${rot}deg) scale(${sc})`;
}
function part(parent, x, y, rot, sc) { const g = el('g', {}, parent); place(g, x, y, rot, sc); return g; }

/* Food layer: drawn in the open-box photo's pixel space (732x724) */
const SPOTS = { rice: { x: 196, y: 505, s: .95 }, chicken: { x: 500, y: 432, s: .95 }, veg: { x: 422, y: 556, s: .62 }, fruit: { x: 598, y: 556, s: .62 } };
function makeFoods(svg, seed = 3) {
  const id = 'f' + (++UID), R = rng(seed);
  svg.setAttribute('viewBox', '0 0 732 724'); svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  const rgrad = (name, stops, cx = .4, cy = .35, r = .75) => { const g = el('radialGradient', { id: `${id}-${name}`, cx, cy, r }, defs); stops.forEach(([o2, c]) => el('stop', { offset: o2, 'stop-color': c }, g)); };
  rgrad('chk', [[0, '#F2B556'], [.6, '#D58A2E'], [1, '#A9601C']]);
  rgrad('brc', [[0, '#5DB14B'], [1, '#2C7A2D']], .35, .3);
  rgrad('mound', [[0, '#F2C85C'], [1, '#C9902A']], .5, .3, .7);
  rgrad('wm', [[0, '#FF7A7A'], [1, '#D93A3A']]);
  const handles = { rice: [], chicken: [], veg: [], fruit: [], shadows: [] };
  const PAR = {}; for (const k in SPOTS) { const s = SPOTS[k]; PAR[k] = el('g', { transform: `translate(${s.x} ${s.y}) scale(${s.s})` }, svg); }
  {
    const shadow = (cx, cy, rx, ry, key) => { const s = el('ellipse', { cx, cy, rx, ry, fill: 'rgba(70,35,0,.28)' }, PAR[key]); handles.shadows.push(s); s._k = key; return s; };
    const C1 = [0, 0], C2 = [0, 0], C3 = [0, 0], C4 = [0, 0];
    // --- Rice
    shadow(C1[0], C1[1] + 20, 122, 34, 'rice');
    const rg = el('g', {}, PAR.rice);
    const mound = el('ellipse', { cx: C1[0], cy: C1[1] + 16, rx: 112, ry: 34, fill: `url(#${id}-mound)` }, rg); handles.rice.push(mound); mound._mound = 1;
    const cols = ['#F7D97F', '#F0C550', '#FAE6A6', '#E9B53F', '#FFF0C2', '#F3CE63'];
    const bits = [];
    for (let i = 0; i < 190; i++) {
      const t = Math.sqrt(R()), a = R() * Math.PI * 2, x = Math.cos(a) * t * 104, yb = Math.sin(a) * t * 30, lift = (1 - t * t) * 34;
      bits.push({ x: C1[0] + x, y: C1[1] + 12 + yb - lift, sort: yb, rot: (R() - .5) * 90, k: R() });
    }
    bits.sort((a, b) => a.sort - b.sort).forEach(b => {
      const g = part(rg, b.x, b.y, b.rot, 1);
      if (b.k < .075) { el('rect', { x: -5, y: -3.2, width: 10, height: 6.5, rx: 2, fill: '#FFD633', stroke: '#D9A400', 'stroke-width': .5 }, g); }
      else if (b.k < .125) { el('rect', { x: -3.500, y: -3.500, width: 7, height: 7, rx: 1.500, fill: '#F28B24' }, g); }
      else if (b.k < .17) { el('circle', { r: 3, fill: '#63B04C' }, g); el('circle', { r: 1, cx: -1, cy: -1, fill: '#A5DB86' }, g); }
      else if (b.k < .22) { el('ellipse', { rx: 5, ry: 2, fill: 'none', stroke: '#8CCB4F', 'stroke-width': 1.800 }, g); }
      else { const e = el('ellipse', { rx: 5.800, ry: 2.400, fill: cols[(b.k * 97 | 0) % cols.length], stroke: 'rgba(150,100,10,.28)', 'stroke-width': .5 }, g); el('ellipse', { rx: 2.600, ry: .8, cx: -1.400, cy: -.8, fill: 'rgba(255,255,255,.7)' }, g); }
      handles.rice.push(g);
    });
    // --- Chicken
    shadow(C2[0], C2[1] + 22, 84, 26, 'chicken');
    const cg = el('g', {}, PAR.chicken);
    [[-46, 6, -18], [4, -14, 12], [48, 6, 24], [-18, 18, 6], [28, 20, -12]].forEach(([dx, dy, rot], i) => {
      const g = part(cg, C2[0] + dx, C2[1] + 8 + dy, rot, 1);
      const rx = 31 + R() * 4, ry = 21 + R() * 3;
      el('path', { d: blobPath(R, 0, 4, rx, ry, 10, .13), fill: 'rgba(80,35,0,.35)' }, g);
      el('path', { d: blobPath(R, 0, 0, rx, ry, 10, .13), fill: `url(#${id}-chk)`, stroke: '#9B5513', 'stroke-width': 1 }, g);
      for (let s = 0; s < 14; s++) { const a = R() * 6.283, t = Math.sqrt(R()) * .8; el('circle', { cx: Math.cos(a) * rx * t, cy: Math.sin(a) * ry * t, r: .8 + R() * 1.800, fill: R() < .5 ? '#F8D487' : '#8C4A12', opacity: .75 }, g); }
      el('ellipse', { cx: -8, cy: -9, rx: 12, ry: 4.500, fill: 'rgba(255,255,255,.4)', transform: 'rotate(-14)' }, g);
      handles.chicken.push(g);
    });
    // --- Chinese vegetables
    shadow(C3[0], C3[1] + 16, 104, 26, 'veg');
    const vg = el('g', {}, PAR.veg);
    const broc = (x, y, s, rot) => { const g = part(vg, x, y, rot, s);
      el('rect', { x: -4.500, y: 2, width: 9, height: 17, rx: 3.500, fill: '#A9D18A' }, g);
      [[-9, -4, 10], [9, -4, 10], [0, -10, 11], [-4, 2, 9], [6, 3, 9]].forEach(([cx, cy, r]) => el('circle', { cx, cy, r, fill: `url(#${id}-brc)` }, g));
      [[-9, -8], [3, -14], [10, -6], [-2, 0]].forEach(([cx, cy]) => el('circle', { cx, cy, r: 1.800, fill: '#8DD07A', opacity: .8 }, g));
      handles.veg.push(g); };
    const carrot = (x, y, rot) => { const g = part(vg, x, y, rot, 1);
      el('ellipse', { cx: 0, cy: 3, rx: 13, ry: 8, fill: '#B8600F' }, g); el('ellipse', { rx: 13, ry: 8, fill: '#F58A1F' }, g);
      el('ellipse', { rx: 8, ry: 4.800, fill: '#FFB259' }, g); el('ellipse', { rx: 3, ry: 1.800, fill: '#FFD7A0' }, g); handles.veg.push(g); };
    const corn = (x, y, rot) => { const g = part(vg, x, y, rot, 1);
      el('rect', { x: -15, y: -5.500, width: 30, height: 11, rx: 5.500, fill: '#F6DE86', stroke: '#D9B94A', 'stroke-width': 1 }, g);
      [-8, -2, 4, 10].forEach(lx => el('line', { x1: lx, y1: -5, x2: lx, y2: 5, stroke: '#D9B94A', 'stroke-width': 1 }, g)); handles.veg.push(g); };
    const pepper = (x, y, rot) => { const g = part(vg, x, y, rot, 1);
      el('path', { d: 'M-16 4Q0 -14 16 4', fill: 'none', stroke: '#9E2018', 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M-16 4Q0 -14 16 4', fill: 'none', stroke: '#E0372B', 'stroke-width': 5.500, 'stroke-linecap': 'round' }, g);
      el('path', { d: 'M-9 -2Q0 -8 8 -2', fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': 1.500, 'stroke-linecap': 'round' }, g); handles.veg.push(g); };
    const mush = (x, y, rot) => { const g = part(vg, x, y, rot, 1);
      el('rect', { x: -4, y: 0, width: 8, height: 11, rx: 3, fill: '#E9D9BD' }, g);
      el('path', { d: 'M-15 2Q-14 -13 0 -13 14 -13 15 2Z', fill: '#C9A777' }, g); el('path', { d: 'M-9 -3Q0 -10 9 -3', fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': 2, 'stroke-linecap': 'round' }, g); handles.veg.push(g); };
    corn(C3[0] - 82, C3[1] + 14, -24); broc(C3[0] - 52, C3[1] - 2, .95, -8); mush(C3[0] - 8, C3[1] - 6, 6);
    broc(C3[0] + 34, C3[1] - 4, 1.05, 10); pepper(C3[0] + 80, C3[1] + 8, 8);
    carrot(C3[0] - 28, C3[1] + 18, 8); carrot(C3[0] + 14, C3[1] + 18, -6); carrot(C3[0] + 58, C3[1] + 20, 14); corn(C3[0] + 10, C3[1] + 6, 18);
    // --- Fruit
    shadow(C4[0], C4[1] + 16, 104, 26, 'fruit');
    const fg = el('g', {}, PAR.fruit);
    const orange = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      el('path', { d: 'M-17 4A17 17 0 0 1 17 4Z', fill: '#E57F08' }, g); el('path', { d: 'M-14 2A14 14 0 0 1 14 2Z', fill: '#FFAE2E' }, g);
      [-8, 0, 8].forEach(a => el('line', { x1: 0, y1: 2, x2: a * 1.4, y2: -11 + Math.abs(a) * .5, stroke: '#FFD27A', 'stroke-width': 1.200 }, g));
      el('path', { d: 'M-17 4h34', stroke: '#E57F08', 'stroke-width': 2, 'stroke-linecap': 'round' }, g); handles.fruit.push(g); };
    const melon = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      el('rect', { x: -12, y: -10, width: 24, height: 22, rx: 5, fill: '#A8D18A' }, g); el('rect', { x: -12, y: -10, width: 24, height: 19, rx: 5, fill: `url(#${id}-wm)` }, g);
      [[-5, -3], [4, -1], [-1, 5]].forEach(([cx, cy]) => el('ellipse', { cx, cy, rx: 1, ry: 1.800, fill: '#3B1A14' }, g));
      el('rect', { x: -9, y: -8, width: 10, height: 4, rx: 2, fill: 'rgba(255,255,255,.38)' }, g); handles.fruit.push(g); };
    const kiwi = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      el('circle', { r: 14, fill: '#6E9B2C' }, g); el('circle', { r: 12, fill: '#A8D04F' }, g); el('circle', { r: 4.500, fill: '#F1F6C4' }, g);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; el('ellipse', { cx: Math.cos(a) * 8, cy: Math.sin(a) * 8, rx: .9, ry: 1.600, fill: '#2B2B14', transform: `rotate(${i * 30 + 90} ${Math.cos(a) * 8} ${Math.sin(a) * 8})` }, g); } handles.fruit.push(g); };
    const pine = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      el('rect', { x: -11, y: -10, width: 22, height: 21, rx: 5, fill: '#D6A81E' }, g); el('rect', { x: -11, y: -10, width: 22, height: 18, rx: 5, fill: '#FBDB4C' }, g);
      el('path', { d: 'M-7 -5l14 8M-7 2l14 8', stroke: '#E8B62A', 'stroke-width': 1.200 }, g); handles.fruit.push(g); };
    const grapes = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      [[-8, -5], [3, -7], [-1, 1], [10, 0], [-9, 6], [3, 8]].forEach(([cx, cy], i) => { el('circle', { cx, cy, r: 6.500, fill: i % 2 ? '#6B3E8C' : '#7E4AA3' }, g); el('circle', { cx: cx - 2, cy: cy - 2, r: 1.800, fill: 'rgba(255,255,255,.55)' }, g); }); handles.fruit.push(g); };
    const berry = (x, y, rot) => { const g = part(fg, x, y, rot, 1);
      el('path', { d: 'M0 14C-14 6-14 -8-6 -10c3-1 5 0 6 1 1-1 3-2 6-1 8 2 8 16-6 24Z', fill: '#E0283B' }, g);
      [[-5, -2], [3, -4], [0, 4], [6, 3], [-6, 5]].forEach(([cx, cy]) => el('circle', { cx, cy, r: .9, fill: '#FFE4A0' }, g));
      el('path', { d: 'M-5 -10l5 -4 5 4', stroke: '#2F8F46', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g); handles.fruit.push(g); };
    melon(C4[0] - 74, C4[1] + 4, -10); pine(C4[0] - 40, C4[1] - 4, 8); orange(C4[0] - 4, C4[1] - 6, -8); kiwi(C4[0] + 38, C4[1] - 2, 0);
    grapes(C4[0] + 78, C4[1] + 6, 6); berry(C4[0] - 52, C4[1] + 18, 0); orange(C4[0] + 24, C4[1] + 18, 170); melon(C4[0] + 62, C4[1] + 22, 14);
  }
  return handles;
}

/* ----------------------------------------------------------
   PHOTO LUNCHBOX — real box photo, openable.
   Layers: lid (top part of open photo) · base (bottom part) · food · closed photo
   ---------------------------------------------------------- */
const HINGE = 47.6; // % of open photo height where the lid meets the box
class PhotoBox {
  constructor(root, { state = 'open', food = false, seed = 3, label = 'lunchbox' } = {}) {
    this.root = root; this.state = state; this.busy = false; this.label = label;
    root.classList.add('pbox'); root.setAttribute('role', 'button'); root.tabIndex = 0;
    root.innerHTML = `<div class="pb-stage">
      <div class="pb-base"><img src="assets/box-open.png" alt="" draggable="false"></div>
      <svg class="pb-food" aria-hidden="true"></svg>
      <div class="pb-lid"><img src="assets/box-open.png" alt="" draggable="false"></div>
      <img class="pb-closed" src="assets/box-closed.png" alt="Sealed Lunch Bite kraft lunchbox" draggable="false">
    </div><span class="pb-hint"></span>`;
    this.stage = $('.pb-stage', root); this.lid = $('.pb-lid', root); this.base = $('.pb-base', root);
    this.foodEl = $('.pb-food', root); this.closed = $('.pb-closed', root); this.hint = $('.pb-hint', root);
    this.handles = food ? makeFoods(this.foodEl, seed) : null; if (!food) this.foodEl.style.display = 'none';
    this.set(state);
    const tog = () => this.toggle();
    root.addEventListener('click', tog);
    root.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
  }
  _paint() {
    const open = this.state === 'open';
    this.root.dataset.state = this.state;
    this.root.setAttribute('aria-label', `${this.label}: ${open ? 'open' : 'closed'}. Press to ${open ? 'close' : 'open'}`);
    this.hint.textContent = open ? 'Tap to close' : 'Tap to open';
  }
  set(state) {
    this.state = state; const open = state === 'open';
    this.root.getAnimations({ subtree: true }).filter(a => a._pb).forEach(a => a.cancel());
    this.stage.style.transform = open ? '' : 'translateY(19%)';
    this.lid.style.opacity = this.base.style.opacity = this.foodEl.style.opacity = open ? 1 : 0;
    this.lid.style.transform = ''; this.closed.style.opacity = open ? 0 : 1; this._paint();
  }
  _a(node, kf, opt, after) {
    const a = node.animate(kf, { fill: 'both', ...opt }); a._pb = true;
    a.finished.then(() => { if (after) { after(); } a.cancel(); }).catch(() => {}); return a;
  }
  toggle() { return this.state === 'open' ? this.close() : this.open(); }
  close(dur = 1000) {
    if (this.busy || this.state === 'closed') return Promise.resolve(); this.busy = true; this.state = 'closed';
    const e = 'cubic-bezier(.5,0,.2,1)';
    this._a(this.lid, [{ transform: 'perspective(900px) rotateX(0deg)', filter: 'brightness(1)' }, { transform: 'perspective(900px) rotateX(78deg) scaleY(.9)', filter: 'brightness(.72)' }], { duration: dur * .7, easing: e }, () => { this.lid.style.opacity = 0; });
    this._a(this.closed, [{ opacity: 0, transform: 'translateY(-16px)' }, { opacity: 1, transform: 'none' }], { duration: dur * .32, delay: dur * .62, easing: 'ease-out' }, () => { this.closed.style.opacity = 1; });
    this._a(this.stage, [{ transform: 'none' }, { transform: 'translateY(19%)' }], { duration: dur * .45, delay: dur * .55, easing: e }, () => { this.stage.style.transform = 'translateY(19%)'; });
    return new Promise(res => setTimeout(() => { this.base.style.opacity = this.foodEl.style.opacity = 0; this.busy = false; this._paint(); res(); }, dur + 40));
  }
  open(dur = 1000) {
    if (this.busy || this.state === 'open') return Promise.resolve(); this.busy = true; this.state = 'open';
    const e = 'cubic-bezier(.3,.7,.2,1)';
    this.base.style.opacity = this.foodEl.style.opacity = 1;
    this._a(this.stage, [{ transform: 'translateY(19%)' }, { transform: 'none' }], { duration: dur * .45, easing: e }, () => { this.stage.style.transform = ''; });
    this._a(this.closed, [{ opacity: 1 }, { opacity: 0 }], { duration: dur * .25, delay: dur * .3, easing: 'linear' }, () => { this.closed.style.opacity = 0; });
    this.lid.style.opacity = 1;
    this._a(this.lid, [{ transform: 'perspective(900px) rotateX(78deg) scaleY(.9)', filter: 'brightness(.72)', offset: 0 }, { transform: 'perspective(900px) rotateX(-6deg)', filter: 'brightness(1.04)', offset: .78 }, { transform: 'perspective(900px) rotateX(0deg)', filter: 'brightness(1)', offset: 1 }], { duration: dur * .8, delay: dur * .25, easing: e });
    return new Promise(res => setTimeout(() => { this.busy = false; this._paint(); res(); }, dur * 1.1));
  }
}

/* drop / slide animation helpers ---------------------------------------- */
function T(p, dx, dy, dr, s) { return `translate(${p.x + dx}px,${p.y + dy}px) rotate(${p.rot + dr}deg) scale(${s ?? p.sc})`; }
function dropIn(g, delay, { H = 340, dur = 900, spin = 26, from = 'top' } = {}) {
  const p = g._p, out = [];
  if (from === 'top') {
    out.push(g.animate([
      { transform: T(p, 0, -H, spin), easing: 'cubic-bezier(.5,0,.9,.65)', offset: 0 },
      { transform: T(p, 0, 0, spin * .12, p.sc), easing: 'cubic-bezier(.2,.7,.4,1)', offset: .62 },
      { transform: T(p, 0, -7, -spin * .06), easing: 'cubic-bezier(.5,0,.9,.7)', offset: .8 },
      { transform: T(p, 0, 0, 0), offset: 1 }], { duration: dur, delay, fill: 'both' }));
  } else {
    const dx = from === 'right' ? 380 : -380;
    out.push(g.animate([
      { transform: T(p, dx, -40, spin * 2), easing: 'cubic-bezier(.2,.8,.25,1)', offset: 0 },
      { transform: T(p, -9 * Math.sign(dx), 0, -spin * .2), easing: 'ease-out', offset: .78 },
      { transform: T(p, 0, 0, 0), offset: 1 }], { duration: dur, delay, fill: 'both' }));
  }
  out.push(g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay, fill: 'both', easing: 'linear' }));
  return out;
}
function fadeIn(node, delay, dur = 400) { return node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, fill: 'both', easing: 'ease-out' }); }

/* ----------------------------------------------------------
   2. HERO ASSEMBLY TIMELINE
   ---------------------------------------------------------- */
const stage = $('#stage');
let heroBox = null, heroAnims = [], heroTimers = [];
const chips = $$('.chip', stage);

function heroReset() {
  heroAnims.forEach(a => { try { a.cancel(); } catch (e) {} }); heroAnims = [];
  heroTimers.forEach(clearTimeout); heroTimers = [];
  chips.forEach(c => c.classList.remove('on'));
  stage.classList.remove('sealed');
  heroBox.busy = false; heroBox.set('open');
}
function heroPlay() {
  heroReset();
  const h = heroBox.handles, A = [];
  const T0 = { rice: 1100, chicken: 2300, veg: 3400, fruit: 4500, lid: 6000 };
  heroBox.root.classList.add('playing');
  A.push(heroBox.stage.animate([{ opacity: 0, transform: 'translateY(46px) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }));
  A.push(...h.shadows.map(s => s.animate([{ opacity: 0 }, { opacity: 1 }], { delay: T0[s._k] + 500, duration: 500, fill: 'both' })));
  h.rice.forEach(g => {
    if (g._mound) { A.push(fadeIn(g, T0.rice + 500, 700)); return; }
    A.push(...dropIn(g, T0.rice + 60 + Math.random() * 700, { H: 320 + Math.random() * 200, dur: 760, spin: 40 }));
  });
  h.chicken.forEach((g, i) => A.push(...dropIn(g, T0.chicken + i * 170, { H: 460, dur: 980, spin: 38 })));
  h.veg.forEach((g, i) => A.push(...dropIn(g, T0.veg + i * 95, { from: 'right', dur: 820, spin: 30 })));
  h.fruit.forEach((g, i) => A.push(...dropIn(g, T0.fruit + i * 120, { H: 480, dur: 1150, spin: 70 })));
  heroAnims = A;
  [T0.rice, T0.chicken, T0.veg, T0.fruit].forEach((t, i) => heroTimers.push(setTimeout(() => chips[i].classList.add('on'), t + 250)));
  heroTimers.push(setTimeout(() => { heroAnims.forEach(a => a.commitStyles && 0); heroBox.close(1100).then(() => { stage.classList.add('sealed'); heroBox.closed.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.14) saturate(1.1)', offset: .4 }, { filter: 'brightness(1)' }], { duration: 1200 }); }); }, T0.lid));
}
function initHero() {
  heroBox = new PhotoBox($('#heroBox'), { state: 'open', food: true, seed: 5, label: 'Lunch Bite lunchbox' });
  if (reduce) { chips.forEach(c => c.classList.add('on')); stage.classList.add('sealed'); return; }
  heroPlay();
  $('#replay').addEventListener('click', heroPlay);
}

/* ----------------------------------------------------------
   3. TOP-DOWN PLATE THUMBNAILS (weekly menu)
   ---------------------------------------------------------- */
function plate(svg, kind) {
  const id = 'p' + (++UID), R = rng(kind.length * 977 + kind.charCodeAt(0) * 31);
  svg.setAttribute('viewBox', '0 0 220 190'); svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  const bg = el('radialGradient', { id: id + 'b', cx: .4, cy: .3, r: .9 }, defs);
  [[0, '#FFFFFF'], [1, '#EADFCF']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, bg));
  const bl = el('filter', { id: id + 'f', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs); el('feGaussianBlur', { stdDeviation: 5 }, bl);
  el('ellipse', { cx: 112, cy: 168, rx: 84, ry: 10, fill: 'rgba(70,35,0,.3)', filter: `url(#${id}f)` }, svg);
  el('ellipse', { cx: 110, cy: 104, rx: 92, ry: 78, fill: '#D8CBB6' }, svg);
  el('ellipse', { cx: 110, cy: 100, rx: 92, ry: 78, fill: `url(#${id}b)` }, svg);
  el('ellipse', { cx: 110, cy: 100, rx: 74, ry: 61, fill: '#FFFDF8', stroke: 'rgba(120,90,50,.18)', 'stroke-width': 1.500 }, svg);
  const g = el('g', {}, svg);
  const grains = (cx, cy, rx, ry, n, cols, lift = 10) => {
    const arr = []; for (let i = 0; i < n; i++) { const t = Math.sqrt(R()), a = R() * 6.283; arr.push([cx + Math.cos(a) * t * rx, cy + Math.sin(a) * t * ry - (1 - t * t) * lift, R() * 180, cols[(R() * cols.length) | 0], Math.sin(a) * t]); }
    el('ellipse', { cx, cy: cy + 3, rx: rx + 4, ry: ry + 3, fill: 'rgba(120,80,20,.22)' }, g);
    arr.sort((a, b) => a[4] - b[4]).forEach(([x, y, r, c]) => el('ellipse', { cx: x, cy: y, rx: 4.200, ry: 1.700, fill: c, transform: `rotate(${r} ${x} ${y})`, stroke: 'rgba(120,80,10,.22)', 'stroke-width': .4 }, g));
  };
  const chunk = (x, y, rx, ry, fill, edge, rot = 0) => { const gg = el('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, g);
    el('path', { d: blobPath(R, 0, 2, rx, ry, 9, .12), fill: 'rgba(60,25,0,.3)' }, gg); el('path', { d: blobPath(R, 0, 0, rx, ry, 9, .12), fill, stroke: edge, 'stroke-width': 1 }, gg);
    el('ellipse', { cx: -rx * .25, cy: -ry * .35, rx: rx * .45, ry: ry * .22, fill: 'rgba(255,255,255,.38)' }, gg); return gg; };
  const dots = (cx, cy, rx, ry, n, fill, r = 2, op = 1) => { for (let i = 0; i < n; i++) { const t = Math.sqrt(R()), a = R() * 6.283; el('circle', { cx: cx + Math.cos(a) * t * rx, cy: cy + Math.sin(a) * t * ry, r: r * (.6 + R() * .8), fill, opacity: op }, g); } };
  const broc = (x, y, s = 1) => { const gg = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, g);
    el('rect', { x: -3, y: 2, width: 6, height: 9, rx: 2.500, fill: '#A9D18A' }, gg); [[-6, -2, 6.500], [6, -2, 6.500], [0, -6, 7], [0, 1, 6]].forEach(([cx, cy, r]) => el('circle', { cx, cy, r, fill: '#3E9A3A' }, gg)); el('circle', { cx: -2, cy: -7, r: 2, fill: '#7FCB6B' }, gg); };
  const slice = (x, y, r, o, i, ci) => { el('circle', { cx: x, cy: y, r, fill: o }, g); el('circle', { cx: x, cy: y, r: r - 2.500, fill: i }, g); el('circle', { cx: x, cy: y, r: r * .4, fill: ci || i, opacity: .7 }, g); };
  const egg = (x, y, rot = 0) => { const gg = el('g', { transform: `translate(${x} ${y}) rotate(${rot})` }, g);
    el('ellipse', { cx: 0, cy: 2, rx: 14, ry: 10, fill: 'rgba(60,25,0,.25)' }, gg); el('ellipse', { rx: 14, ry: 10, fill: '#FFFFFF', stroke: '#E4D9C6', 'stroke-width': 1 }, gg); el('circle', { r: 5.500, fill: '#FFB41F' }, gg); el('circle', { cx: -1.500, cy: -1.500, r: 1.800, fill: '#FFE08A' }, gg); };
  const goldRice = ['#F7D97F', '#F0C550', '#FAE6A6', '#E9B53F', '#FFF0C2'];
  const whiteRice = ['#FFFFFF', '#F6F1E6', '#EFE7D6', '#FFFDF7'];
  switch (kind) {
    case 'fried':
      grains(84, 104, 40, 30, 110, goldRice); dots(84, 100, 36, 24, 12, '#63B04C', 2); dots(84, 100, 36, 24, 8, '#FFD633', 2.400); dots(84, 100, 36, 24, 6, '#F28B24', 2.200);
      chunk(146, 82, 22, 15, '#E3A044', '#9B5513', -15); chunk(156, 112, 21, 14, '#DE9A3C', '#9B5513', 20); chunk(126, 124, 20, 13, '#E3A044', '#9B5513', 4);
      broc(142, 52, .9); broc(66, 142, .85); break;
    case 'pulao':
      grains(110, 104, 56, 40, 150, ['#F6E8BE', '#EBD08C', '#FFF4D6', '#E9D3A0', '#FFFFFF'], 12);
      chunk(110, 92, 26, 18, '#C98337', '#7C4310', -10); chunk(80, 114, 20, 13, '#C98337', '#7C4310', 20); chunk(140, 116, 20, 13, '#C98337', '#7C4310', -30);
      dots(110, 100, 50, 34, 16, '#7A4A12', 2.200, .85); el('path', { d: 'M150 70q10 6 18 22', stroke: '#3FA652', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g); el('path', { d: 'M62 74q-8 6-12 20', stroke: '#3FA652', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g); break;
    case 'curry':
      grains(80, 108, 34, 34, 90, whiteRice, 12);
      el('ellipse', { cx: 146, cy: 98, rx: 38, ry: 36, fill: '#8E3510' }, g); el('ellipse', { cx: 146, cy: 96, rx: 35, ry: 33, fill: '#C9541C' }, g); el('ellipse', { cx: 142, cy: 88, rx: 20, ry: 9, fill: 'rgba(255,200,120,.35)' }, g);
      chunk(134, 92, 14, 10, '#E79A4A', '#8A4710', 10); chunk(158, 104, 13, 10, '#E79A4A', '#8A4710', -20); chunk(138, 116, 12, 9, '#E79A4A', '#8A4710', 30);
      [[100, 138], [114, 144], [128, 144]].forEach(([x, y]) => el('path', { d: `M${x} ${y}q8 -8 18 -2`, stroke: '#4CA84A', 'stroke-width': 4.500, fill: 'none', 'stroke-linecap': 'round' }, g));
      slice(70, 52, 7, '#F58A1F', '#FFB259'); slice(86, 48, 7, '#F58A1F', '#FFB259'); break;
    case 'biryani':
      grains(110, 104, 58, 42, 170, ['#FFFFFF', '#F6EFDC', '#F1A33B', '#F6C25A', '#FFF4D8', '#E8902A'], 14);
      chunk(120, 86, 30, 20, '#A8501C', '#5E2808', -12); el('rect', { x: 150, y: 74, width: 7, height: 18, rx: 3, fill: '#F2E6D2', transform: 'rotate(40 150 74)' }, g);
      chunk(78, 120, 16, 13, '#F0DDA8', '#B89A50', 0); egg(144, 128, 10);
      dots(110, 100, 52, 36, 20, '#7A3A14', 2.200, .85); el('path', { d: 'M60 78q10-8 20-4', stroke: '#3FA652', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g); break;
    case 'thai':
      grains(82, 104, 38, 34, 100, whiteRice, 14);
      [0, 1, 2, 3].forEach(i => chunk(130 + i * 9, 76 + i * 12, 22, 9, '#CE8E4A', '#7C4310', 18)); [0, 1, 2].forEach(i => el('ellipse', { cx: 132 + i * 9, cy: 76 + i * 12 + 1, rx: 15, ry: 3, fill: 'rgba(255,255,255,.35)', transform: 'rotate(18 140 90)' }, g));
      slice(130, 138, 10, '#5BA53F', '#C4E6A2', '#E8F5CC'); slice(152, 132, 10, '#5BA53F', '#C4E6A2', '#E8F5CC'); slice(98, 142, 8, '#E0372B', '#FF7266', '#FF9C8E');
      el('circle', { cx: 168, cy: 70, r: 11, fill: '#fff', stroke: '#D8CBB6', 'stroke-width': 1.500 }, g); el('circle', { cx: 168, cy: 70, r: 8, fill: '#D7352A' }, g); break;
    case 'khichuri':
      grains(100, 106, 52, 40, 170, ['#E8C04E', '#F1D56F', '#D9A93A', '#F7E190', '#CFA02E'], 16);
      dots(100, 104, 46, 34, 22, '#8C5A18', 1.800, .8); el('ellipse', { cx: 96, cy: 86, rx: 24, ry: 8, fill: 'rgba(255,255,255,.35)' }, g);
      egg(152, 116, -15); egg(160, 84, 20); el('path', { d: 'M60 150q10 -10 24 -6', stroke: '#D7352A', 'stroke-width': 4.500, fill: 'none', 'stroke-linecap': 'round' }, g); el('path', { d: 'M62 60q12 -8 24 -6', stroke: '#3FA652', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g); break;
  }
}

/* ----------------------------------------------------------
   4. REUSABLE MENU CARD + DATA (shared with future day pages)
   ---------------------------------------------------------- */
const MENU = [
  { day: 'Saturday', slug: 'saturday', title: 'Chinese Fried Rice & Crispy Chicken', price: 99, kind: 'fried', tint: '#FFE3CC', items: ['Chinese Fried Rice', 'Crispy Chicken', 'Chinese Vegetables', 'Seasonal Fruits'] },
  { day: 'Sunday', slug: 'sunday', title: 'Chicken Pulao', price: 89, kind: 'pulao', tint: '#E6F2DA', items: ['Aromatic Chicken Pulao', 'Borhani', 'Fresh Salad', 'Seasonal Fruits'] },
  { day: 'Monday', slug: 'monday', title: 'Rice, Chicken Curry & Vegetables', price: 95, kind: 'curry', tint: '#FFEFC7', items: ['Steamed Rice', 'Home-style Chicken Curry', 'Mixed Vegetables', 'Seasonal Fruits'] },
  { day: 'Tuesday', slug: 'tuesday', title: 'Chicken Biryani', price: 99, kind: 'biryani', tint: '#FBD9CF', items: ['Kacchi-style Chicken Biryani', 'Egg & Potato', 'Salad & Borhani', 'Seasonal Fruits'] },
  { day: 'Wednesday', slug: 'wednesday', title: 'Thai Chicken Rice', price: 99, kind: 'thai', tint: '#DCEFE8', items: ['Jasmine Rice', 'Glazed Thai Chicken', 'Cucumber & Tomato', 'Sweet Chili Dip'] },
  { day: 'Thursday', slug: 'thursday', title: 'Special Khichuri & Egg', price: 89, kind: 'khichuri', tint: '#F5E6D3', items: ['Special Khichuri', 'Boiled Egg', 'Fried Chili & Ghee', 'Seasonal Fruits'] }
];
// Date helpers: today's day in Dhaka, Friday → next up is Saturday
function dhakaDayName() { try { return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Dhaka' }).format(new Date()); } catch (e) { return 'Saturday'; } }

function MenuCard(m, isToday) { // reusable component: <article class="mcard">
  const a = document.createElement('article');
  a.className = 'mcard'; a.dataset.day = m.slug; a.style.setProperty('--tint', m.tint);
  a.innerHTML = `
    <div class="thumb"><span class="day">${m.day}</span>${isToday ? '<span class="today">Today</span>' : ''}<svg role="img" aria-label="${m.title}"></svg></div>
    <div class="body"><h3>${m.title}</h3><div class="from">From <b>৳${m.price}</b></div>
      <div class="view"><a href="menu/${m.slug}.html" data-menu-link="${m.slug}">View Menu <svg viewBox="0 0 24 24"><use href="#arrow"/></svg></a></div></div>`;
  plate($('svg', a), m.kind);
  return a;
}

function initMenu() {
  const track = $('#menuTrack'), days = $('#days'), detail = $('#detail');
  const today = dhakaDayName(); let active = MENU.find(m => m.day === today)?.slug || 'saturday';
  MENU.forEach(m => {
    track.appendChild(MenuCard(m, m.day === today));
    const b = document.createElement('button'); b.role = 'tab'; b.textContent = m.day.slice(0, 3) + (window.innerWidth > 1180 ? m.day.slice(3) : ''); b.dataset.day = m.slug; b.setAttribute('aria-label', m.day);
    days.appendChild(b);
  });
  const set = (slug, scroll) => {
    active = slug; const m = MENU.find(x => x.slug === slug);
    $$('.mcard', track).forEach(c => c.classList.toggle('is-active', c.dataset.day === slug));
    $$('button', days).forEach(b => b.setAttribute('aria-selected', b.dataset.day === slug));
    detail.classList.remove('swap'); void detail.offsetWidth; detail.classList.add('swap');
    detail.innerHTML = `<div><div class="dd">${m.day}</div><h3>${m.title}</h3></div><ul>${m.items.map(i => `<li>${i}</li>`).join('')}</ul><div class="dp"><small>Starting at</small>৳${m.price}</div>`;
    if (scroll) { const c = $(`.mcard[data-day="${slug}"]`, track); if (track.scrollWidth > track.clientWidth + 4) track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' }); }
  };
  days.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.day, true); });
  track.addEventListener('click', e => {
    const c = e.target.closest('.mcard'); if (!c) return;
    const link = e.target.closest('[data-menu-link]');
    set(c.dataset.day, false);
    if (link) { e.preventDefault(); toast(`${MENU.find(m => m.slug === c.dataset.day).day}'s full menu page arrives in the next stage.`); }
  });
  set(active, false);
  // footer menu links (same route scheme)
  $('#footMenu').innerHTML = MENU.map(m => `<li><a href="menu/${m.slug}.html" data-menu-link="${m.slug}">${m.day}</a></li>`).join('');
  $('#footMenu').addEventListener('click', e => { const a = e.target.closest('[data-menu-link]'); if (a) { e.preventDefault(); toast('Daily menu pages arrive in the next stage.'); } });
}

/* ----------------------------------------------------------
   5. PAGE INTERACTIONS
   ---------------------------------------------------------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

function initNav() {
  const nav = $('#nav'), burger = $('#burger');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 12); onScroll(); addEventListener('scroll', onScroll, { passive: true });
  burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  $$('#drawer a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));
  $$('a[href="#login"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast('Login arrives with the ordering experience.'); }));
  // active link highlighting
  const links = $$('.nav-links a'), map = { home: 'home', how: 'how', menu: 'menu', rewards: 'rewards', about: 'about' };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(k => { const s = document.getElementById(k); s && io.observe(s); });
}

function initReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .14, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal,.reveal-scale,#steps,#lcard').forEach(n => io.observe(n));
  // loyalty counter
  const num = $('[data-count]'), card = $('#lcard');
  new IntersectionObserver((es, o) => es.forEach(e => { if (!e.isIntersecting) return; o.disconnect();
    const to = +num.dataset.count, t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1800); num.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); k < 1 && requestAnimationFrame(step); };
    reduce ? num.textContent = to : requestAnimationFrame(step); }), { threshold: .4 }).observe(card);
}

function initParallax() {
  if (reduce) return;
  const floats = $$('.float'), inner = $('#stageInner'); let mx = 0, my = 0, tx = 0, ty = 0;
  stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; });
  stage.addEventListener('pointerleave', () => { mx = my = 0; });
  const sections = $$('[data-parallax]');
  (function loop() {
    tx = lerp(tx, mx, .08); ty = lerp(ty, my, .08);
    inner.style.transform = `rotateY(${tx * 9}deg) rotateX(${-ty * 7}deg)`;
    const sy = scrollY; floats.forEach(f => { const d = +f.dataset.depth; f.style.transform = `translate(${tx * d}px,${ty * d + sy * d * .006}px)`; });
    requestAnimationFrame(loop);
  })();
}

function tilt(sel, inner, amt = 8) {
  if (reduce) return; const box = $(sel), t = $(inner, box); if (!box || !t) return;
  box.addEventListener('pointermove', e => { const r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; t.style.transform = `rotateY(${x * amt * 2}deg) rotateX(${-y * amt}deg)`; });
  box.addEventListener('pointerleave', () => { t.style.transform = ''; });
}

function initStatics() {
  // ribbon
  const words = ['Under ৳100', 'Saturday – Thursday', 'Freshly prepared', 'Office delivery', 'Premium packaging', 'Lunch rewards'];
  const one = words.map(w => `<span>${w}<i></i></span>`).join(''); $('#ribbon').innerHTML = one.repeat(4);
  // static boxes
  new PhotoBox($('#specialBox'), { state: 'open', food: true, seed: 3, label: "Today's special lunchbox" });
  new PhotoBox($('#vipBox'), { state: 'closed', food: true, seed: 9, label: 'VIP lunchbox' });
  new PhotoBox($('#packMain'), { state: 'closed', food: true, seed: 4, label: 'Sealed lunchbox' });
  new PhotoBox($('#packOpen'), { state: 'open', food: false, label: 'Empty lunchbox' });
  new PhotoBox($('#packFull'), { state: 'open', food: true, seed: 8, label: 'Filled lunchbox' });
  new PhotoBox($('#finL'), { state: 'closed', food: true, seed: 12, label: 'Sealed lunchbox' });
  new PhotoBox($('#finR'), { state: 'open', food: true, seed: 14, label: 'Open lunchbox' });
  // stamps
  const s = $('#stamps'); for (let i = 0; i < 10; i++) { const d = document.createElement('i'); d.style.setProperty('--k', i); d.textContent = i < 7 ? '✓' : ''; if (i < 7) d.className = 'f'; s.appendChild(d); }
  $('#yr').textContent = new Date().getFullYear();
}

function initAnchors() {
  $$('a[href="#contact"]').forEach(a => { /* office CTA: scrolls to contact footer */ });
}

document.addEventListener('DOMContentLoaded', () => {
  initStatics(); initMenu(); initNav(); initReveal(); initHero(); initParallax(); initAnchors();
  tilt('#specialVisual', '.tilt', 7); tilt('#rwVisual', '.lcard', 8);
});
})();
