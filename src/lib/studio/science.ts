import type { Anchor, Item, PathData, Vec } from '$lib/core/types';
import { makeGroupItem, makePathItem, makeTextItem } from '$lib/core/items';
import { defaultStyle, solid } from '$lib/core/style';
import { ellipsePath, rectPath } from '$lib/core/shapes';
import { seeded } from '$lib/character/model';
import { makeVisual } from './visuals';

// pictures for science videos, drawn in the comic style on the 1080 by 1920 stage. every picture is a
// function of a state: the same parts with the same ids at every state, so the timeline tweens one state
// into the next: hairs rise, a muscle shortens, signals run along a nerve, snow falls

const INK = '#1d1b19';
export const SC = {
  skin: '#d9b08c',
  skinDark: '#b98a68',
  pink: '#e0a29c',
  rose: '#b8605e',
  fat: '#e8d08c',
  hair: '#3b2c25',
  night: '#1b2733',
  teal: '#2b3a40',
  cream: '#ece8df',
  warm: '#e2733a',
  cold: '#6fa8d6',
  green: '#6fae7b',
  amber: '#f0a23a'
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => t * t * (3 - 2 * t);

function corner(x: number, y: number): Anchor {
  return { x, y, ix: 0, iy: 0, ox: 0, oy: 0, kind: 'corner' };
}
function smooth(x: number, y: number, hx: number, hy = 0): Anchor {
  return { x, y, ix: -hx, iy: -hy, ox: hx, oy: hy, kind: 'smooth' };
}
const poly = (pts: Vec[], closed = true): PathData => ({ closed, anchors: pts.map((p) => corner(p.x, p.y)) });
// a smooth line through points, the handles follow the neighbours
function curve(pts: Vec[], closed = false, k = 0.22): PathData {
  const n = pts.length;
  return {
    closed,
    anchors: pts.map((p, i) => {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      return smooth(p.x, p.y, (b.x - a.x) * k, (b.y - a.y) * k);
    })
  };
}

function shape(id: string, path: PathData, fill: string | null, line = 6, opacity = 1): Item {
  const it = makePathItem(id, path, defaultStyle(fill ? solid(fill) : null, line > 0 ? solid(INK) : null, line));
  it.id = id;
  it.opacity = opacity;
  return it;
}
function stroke(id: string, pts: Vec[] | PathData, color: string, width: number, opacity = 1, smoothLine = true): Item {
  const path = Array.isArray(pts) ? (smoothLine && pts.length > 2 ? curve(pts) : poly(pts, false)) : pts;
  const it = makePathItem(id, path, defaultStyle(null, solid(color), width));
  it.id = id;
  it.opacity = opacity;
  return it;
}
const rect = (id: string, x: number, y: number, w: number, h: number, fill: string | null, line = 6, r = 0, opacity = 1) => shape(id, rectPath(x, y, w, h, r), fill, line, opacity);
const ellipse = (id: string, x: number, y: number, rx: number, ry: number, fill: string | null, line = 6, opacity = 1) => shape(id, ellipsePath(x, y, rx, ry), fill, line, opacity);

function at(it: Item, x: number, y: number, rot = 0, sx = 1, sy = sx): Item {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  it.transform = [c * sx, s * sx, -s * sy, c * sy, x, y];
  return it;
}

function text(id: string, s: string, x: number, y: number, size: number, color: string, o: { weight?: number; width?: number; align?: 'left' | 'center' | 'right'; font?: string; opacity?: number } = {}): Item {
  const t = makeTextItem(s, o.font ?? 'Inter', size, defaultStyle(solid(color), null, 0), [1, 0, 0, 1, x, y], o.width ?? 900);
  t.id = id;
  t.weight = o.weight ?? 700;
  t.align = o.align ?? 'left';
  t.lineHeight = 1.15;
  t.opacity = o.opacity ?? 1;
  return t;
}

function group(id: string, children: Item[], opacity = 1): Item {
  const g = makeGroupItem(id, children);
  g.id = id;
  g.opacity = opacity;
  return g;
}

// the children of a group get ids from their parent so two copies of a picture never share an id
function named(it: Item, id: string): Item {
  it.id = id;
  if (it.type === 'group') it.children.forEach((c, i) => named(c, `${id}.${i}`));
  return it;
}

// a picture moved and scaled as a whole
export function place(id: string, items: Item[], x: number, y: number, scale = 1, opacity = 1): Item {
  const g = group(id, items, opacity);
  g.transform = [scale, 0, 0, scale, x, y];
  return g;
}

const backdrop = (fill: string) => rect('bg', -40, -40, 1160, 2000, fill, 0);

// a small label that says how sure a statement is
export type Sureness = 'sure' | 'model' | 'open';
const SURE: Record<Sureness, { label: string; color: string }> = {
  sure: { label: 'GESICHERT', color: SC.green },
  model: { label: 'ERKLÄRMODELL', color: SC.amber },
  open: { label: 'NOCH OFFEN', color: '#d06a6a' }
};
export function tag(kind: Sureness, x = 60, y = 140, opacity = 1): Item {
  const s = SURE[kind];
  const w = 38 * s.label.length * 0.64 + 76;
  return group('tag', [rect('tag.box', x, y, w, 84, '#14181d', 5, 42), ellipse('tag.dot', x + 42, y + 42, 14, 14, s.color, 0), text('tag.text', s.label, x + 72, y + 18, 38, '#e9e6df', { weight: 800, width: w })], opacity);
}

export function label(id: string, s: string, x: number, y: number, size = 56, color = SC.cream, opacity = 1, width = 900, align: 'left' | 'center' | 'right' = 'left', font?: string): Item {
  return text(id, s, x, y, size, color, { weight: 800, width, align, opacity, font });
}

// ------------------------------------------------------------------ skin and hairs, seen from the side

export interface ArmOptions {
  // how many hairs, how long they are (a multiple), how deep the skin is drawn
  n?: number;
  length?: number;
  // no background, for pictures that bring their own
  bare?: boolean;
  // the hairs stand on their own, thin and short
  fine?: boolean;
  seed?: number;
}

// the skin surface with hairs. s from 0 (hairs lie flat, smooth skin) to 1 (hairs stand, small bumps)
export function gooseArm(s: number, o: ArmOptions = {}): Item[] {
  const n = o.n ?? 11;
  const len = o.length ?? 1;
  const rnd = seeded(o.seed ?? 5);
  const e = ease(Math.max(0, Math.min(1, s)));
  const Y = 1300;
  const bump = 40 * e;
  const xs = Array.from({ length: n }, (_, i) => 70 + ((940 / Math.max(1, n - 1)) * i) + (rnd() - 0.5) * 24);
  const hairs: Item[] = [];
  const tops: Anchor[] = [smooth(-60, Y, 30)];
  const dots: Item[] = [];
  xs.forEach((x, i) => {
    const jit = rnd();
    const l = (o.fine ? 90 + jit * 50 : 230 + jit * 150) * len;
    const tilt = (jit - 0.5) * 16;
    const ang = lerp(74 + jit * 8, tilt, e) * (Math.PI / 180);
    const w = o.fine ? 7 : 17;
    const h = stroke(`hair.${i}`, [{ x: 0, y: 0 }, { x: 4, y: -l / 2 }, { x: 9 * (jit - 0.3), y: -l }], SC.hair, w);
    hairs.push(at(h, x, Y - bump * 0.55, ang));
    tops.push(smooth(x - 44, Y, 26), smooth(x, Y - bump, 22), smooth(x + 44, Y, 26));
    dots.push(ellipse(`pore.${i}`, x + 20, Y + 90 + (jit * 120), 6, 6, SC.skinDark, 0, 0.7));
  });
  tops.push(smooth(1140, Y, 30), corner(1140, 2000), corner(-60, 2000));
  const skin = shape('skin', { closed: true, anchors: tops }, SC.skin, 7);
  const items: Item[] = [];
  if (!o.bare) items.push(backdrop(SC.teal), ellipse('glow', 540, 700, 620, 520, '#34464e', 0, 0.8));
  items.push(skin, rect('skin.shade', -40, 1640, 1160, 400, SC.skinDark, 0, 0, 0.45), ...dots, ...hairs);
  return items;
}

// ------------------------------------------------------------------ a slice through the skin

export function skinSection(s: number, labels = 1): Item[] {
  const e = ease(Math.max(0, Math.min(1, s)));
  const R = { x: 470, y: 1330 };
  const L = 780;
  const ang = lerp(54, 5, e) * (Math.PI / 180);
  const dir = { x: Math.sin(ang), y: -Math.cos(ang) };
  const at40 = { x: R.x + dir.x * L * 0.38, y: R.y + dir.y * L * 0.38 };
  const A = { x: 250, y: 1010 };
  const w = lerp(26, 46, e);
  const lift = 30 * e;
  const items: Item[] = [
    backdrop('#c5d0cf'),
    shape('epidermis', { closed: true, anchors: [smooth(-60, 910, 20), smooth(300, 910, 40), smooth(560, 910 - lift, 60), smooth(820, 910, 40), smooth(1140, 910, 20), corner(1140, 1010), corner(-60, 1010)] }, SC.skin, 7),
    rect('dermis', -40, 1008, 1160, 520, SC.pink, 7),
    rect('fat', -40, 1526, 1160, 500, SC.fat, 7),
    ellipse('fat.cell.0', 200, 1700, 80, 60, '#f1de9d', 4, 0.9),
    ellipse('fat.cell.1', 520, 1780, 90, 66, '#f1de9d', 4, 0.9),
    ellipse('fat.cell.2', 860, 1690, 84, 62, '#f1de9d', 4, 0.9),
    stroke('sheath', [{ x: 0, y: 0 }, { x: 0, y: -400 }], '#c98b86', 56),
    ellipse('bulb', R.x, R.y + 10, 52, 46, '#cc8f8a', 6),
    stroke('muscle.ink', [A, { x: lerp(380, 440, e), y: lerp(1180, 1120, e) }, at40], INK, w + 12),
    stroke('muscle', [A, { x: lerp(380, 440, e), y: lerp(1180, 1120, e) }, at40], SC.rose, w),
    stroke('hair', [{ x: 0, y: 0 }, { x: 6, y: -L / 2 }, { x: 10, y: -L }], SC.hair, 17)
  ];
  // the sheath and the hair turn about the root
  for (const it of items) if (it.id === 'sheath' || it.id === 'hair') at(it, R.x, R.y, ang);
  items.push(
    group('labels', [
      stroke('l1', [{ x: 700, y: 560 }, { x: 600, y: 640 }], SC.cream, 6),
      label('t1', 'Haar', 710, 490, 62),
      stroke('l2', [{ x: 250, y: 1150 }, { x: 300, y: 1070 }], SC.cream, 6),
      label('t2', 'Haarbalgmuskel', 150, 1170, 60, SC.cream, 1, 700),
      label('t3', 'Haut', 700, 1220, 62, '#5a3a35')
    ], labels)
  );
  return items;
}

// ------------------------------------------------------------------ the nervous system

const NERVE: Vec[] = [{ x: 540, y: 760 }, { x: 400, y: 800 }, { x: 290, y: 1010 }, { x: 220, y: 1330 }];

function along(pts: Vec[], p: number): Vec {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, p)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const t = lens[i] ? Math.min(1, d / lens[i]) : 0;
      return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t) };
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

// signals run from the brain along the spine and a nerve to the arm. s runs from 0 to 1.6
export function nervous(s: number, cross = 0): Item[] {
  const brain = makeVisual('brain', { x: 540, y: 470 }, 0.95);
  const items: Item[] = [
    backdrop('#1d2530'),
    ellipse('aura', 540, 900, 420, 640, '#26323f', 0, 0.9),
    ellipse('head', 540, 500, 150, 175, '#d9b08c', 7),
    shape('torso', poly([{ x: 380, y: 700 }, { x: 700, y: 700 }, { x: 740, y: 1440 }, { x: 340, y: 1440 }]), '#4f5e73', 7),
    stroke('arm.l', [{ x: 400, y: 740 }, { x: 290, y: 1000 }, { x: 225, y: 1350 }], '#d9b08c', 92),
    stroke('arm.r', [{ x: 680, y: 740 }, { x: 790, y: 1000 }, { x: 850, y: 1350 }], '#d9b08c', 92),
    stroke('spine', [{ x: 540, y: 640 }, { x: 540, y: 1280 }], '#e8d9a0', 10, 0.9),
    stroke('nerve', NERVE, '#e8d9a0', 9, 0.95),
    stroke('nerve.r', [{ x: 540, y: 780 }, { x: 680, y: 800 }, { x: 790, y: 1010 }, { x: 850, y: 1330 }], '#e8d9a0', 9, 0.6)
  ];
  if (brain) items.push(named(brain, 'brain'));
  // pulses
  const path: Vec[] = [{ x: 540, y: 520 }, { x: 540, y: 760 }, ...NERVE.slice(1)];
  for (let k = 0; k < 3; k++) {
    const p = s - k * 0.3;
    const on = p > 0 && p < 1;
    const pos = along(path, Math.max(0, Math.min(1, p)));
    items.push(ellipse(`pulse.${k}`, pos.x, pos.y, 22, 22, SC.amber, 4, on ? 1 : 0));
  }
  const hit = Math.max(0, Math.min(1, (s - 0.95) * 4));
  const arm = NERVE[NERVE.length - 1];
  items.push(ellipse('flash', arm.x, arm.y + 10, 40 + 90 * hit, 40 + 90 * hit, null, 7, hit * (1 - Math.max(0, (s - 1.35) * 4))));
  const figure = items.splice(1);
  const out: Item[] = [items[0], place('figure', figure, 0, 150, 1)];
  // a switch nobody can reach
  out.push(
    group('switch', [rect('sw.box', 700, 1610, 230, 110, '#2c3846', 6, 55), ellipse('sw.knob', 760, 1665, 42, 42, SC.cream, 5), stroke('sw.x1', [{ x: 690, y: 1570 }, { x: 940, y: 1750 }], '#d06a6a', 14), stroke('sw.x2', [{ x: 940, y: 1570 }, { x: 690, y: 1750 }], '#d06a6a', 14)], cross),
    label('sw.text', 'nicht bewusst\nsteuerbar', 120, 1610, 54, SC.cream, cross, 520),
    label('ans', 'autonomes\nNervensystem', 130, 150, 62, SC.cream, 1, 520)
  );
  return out;
}

// ------------------------------------------------------------------ an ancestor in the cold

export function ancestor(s: number, t: number): Item[] {
  const e = ease(Math.max(0, Math.min(1, s)));
  const rnd = seeded(9);
  const cx = 700;
  const cy = 1160;
  const rx = 160;
  const ry = 270;
  const items: Item[] = [
    backdrop('#17212c'),
    rect('dusk', -40, 700, 1160, 700, '#223446', 0),
    shape('mount.far', poly([{ x: -40, y: 1330 }, { x: 160, y: 900 }, { x: 300, y: 1100 }, { x: 520, y: 760 }, { x: 760, y: 1120 }, { x: 900, y: 940 }, { x: 1120, y: 1330 }]), '#2d4152', 6),
    shape('cap', poly([{ x: 440, y: 880 }, { x: 520, y: 760 }, { x: 600, y: 880 }, { x: 540, y: 860 }, { x: 500, y: 900 }]), '#dfe6ea', 0),
    shape('snow', poly([{ x: -40, y: 1330 }, { x: 1120, y: 1330 }, { x: 1120, y: 2000 }, { x: -40, y: 2000 }]), '#d7dfe4', 6),
    shape('snow.shade', poly([{ x: -40, y: 1700 }, { x: 1120, y: 1640 }, { x: 1120, y: 2000 }, { x: -40, y: 2000 }]), '#b9c4cc', 0)
  ];
  const sway = Math.sin(t * 40) * 5 * (1 - e * 0.5);
  const body: Item[] = [
    shape('leg.l', rectPath(cx - 110, 1380, 80, 230, 30), '#5a4230', 6),
    shape('leg.r', rectPath(cx + 30, 1380, 80, 230, 30), '#5a4230', 6),
    ellipse('torso', cx, cy, rx, ry, '#6b4e37', 7),
    ellipse('arm.l', cx - rx - 10, cy + 40, 60, 190, '#6b4e37', 7),
    ellipse('arm.r', cx + rx + 10, cy + 40, 60, 190, '#6b4e37', 7),
    ellipse('head', cx - 20, cy - ry - 70, 82, 92, '#c79a78', 7),
    shape('brow', curve([{ x: cx - 90, y: cy - ry - 90 }, { x: cx - 50, y: cy - ry - 112 }, { x: cx - 5, y: cy - ry - 92 }]), null, 12),
    ellipse('eye.l', cx - 40, cy - ry - 62, 8, 10, INK, 0),
    ellipse('eye.r', cx + 0, cy - ry - 62, 8, 10, INK, 0)
  ];
  // the fur: hairs all around the body, lying down at first, standing in the cold
  const fur: Item[] = [];
  for (let i = 0; i < 30; i++) {
    const phi = (i / 30) * Math.PI * 2;
    const nx = Math.cos(phi);
    const ny = Math.sin(phi);
    const root = { x: cx + rx * nx, y: cy + ry * ny };
    const angN = Math.atan2(nx / (rx * rx), -ny / (ry * ry));
    const lay = angN + (nx >= 0 ? 1 : -1) * 1.15;
    const jitter = (rnd() - 0.5) * 0.2;
    const l = 90 + rnd() * 50;
    const h = stroke(`fur.${i}`, [{ x: 0, y: 0 }, { x: 3, y: -l / 2 }, { x: 5, y: -l }], '#a98259', 13);
    fur.push(at(h, root.x, root.y, lerp(lay, angN + jitter, e)));
  }
  items.push(place('body', [...body, ...fur], sway + cx * -0.3, 1610 * -0.3, 1.3));
  // breath and snow
  items.push(ellipse('breath', cx - 160 + t * 40, cy - ry - 120 - t * 30, 46 + 26 * t, 30 + 18 * t, '#e9eef2', 0, 0.55 * (1 - t)));
  for (let i = 0; i < 28; i++) {
    const x0 = (i * 211) % 1100;
    const y0 = -700 + ((i * 337) % 2300);
    items.push(ellipse(`flake.${i}`, x0 + Math.sin(i + t * 6) * 30, y0 + t * 520, 8 + (i % 3) * 3, 8 + (i % 3) * 3, '#f4f8fa', 0, 0.9));
  }
  return items;
}

// ------------------------------------------------------------------ a cat bristling

function zig(cx: number, cy: number, rx: number, ry: number, n: number, amp: number, rot = 0): PathData {
  const pts: Vec[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 1 + amp : 1;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push({ x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) });
  }
  return poly(pts);
}

export function catBristle(s: number): Item[] {
  const e = ease(Math.max(0, Math.min(1, s)));
  const amp = 0.02 + 0.34 * e;
  const O = '#c98b4e';
  const D = '#9c6636';
  return [
    shape('tail', zig(850, 640, 70 + 40 * e, 260, 14, amp, 0.35), O, 7),
    shape('leg.b1', rectPath(640, 900, 60, 230, 24), D, 6),
    shape('leg.f1', rectPath(360, 900, 60, 230, 24), D, 6),
    shape('leg.b2', rectPath(560, 900, 60, 230, 24), O, 6),
    shape('leg.f2', rectPath(440, 900, 60, 230, 24), O, 6),
    shape('body', zig(540, 800, 250, 140 + 30 * e, 16, amp), O, 7),
    shape('stripe.0', poly([{ x: 480, y: 660 - 20 * e }, { x: 520, y: 760 }, { x: 440, y: 770 }]), D, 0),
    shape('stripe.1', poly([{ x: 600, y: 650 - 20 * e }, { x: 640, y: 760 }, { x: 560, y: 765 }]), D, 0),
    shape('stripe.2', poly([{ x: 720, y: 670 - 20 * e }, { x: 750, y: 770 }, { x: 680, y: 770 }]), D, 0),
    shape('head', zig(300, 770, 100, 88, 9, amp * 0.5), O, 7),
    shape('ear.0', poly([{ x: 230, y: 710 }, { x: 240, y: 610 }, { x: 305, y: 685 }]), O, 6),
    shape('ear.1', poly([{ x: 310, y: 690 }, { x: 370, y: 610 }, { x: 380, y: 720 }]), O, 6),
    ellipse('eye.0', 270, 770, 20, lerp(14, 26, e), '#f0e07a', 5),
    ellipse('eye.1', 340, 770, 20, lerp(14, 26, e), '#f0e07a', 5),
    shape('pupil.0', rectPath(266, 770 - lerp(24, 36, e) / 2, 9, lerp(24, 36, e), 4), INK, 0),
    shape('pupil.1', rectPath(336, 770 - lerp(24, 36, e) / 2, 9, lerp(24, 36, e), 4), INK, 0),
    shape('nose', poly([{ x: 290, y: 805 }, { x: 320, y: 805 }, { x: 305, y: 825 }]), '#c0676b', 4)
  ];
}

// the cat above, the human arm below: the same reaction
export function catHuman(s: number): Item[] {
  const arm = gooseArm(s, { bare: true, n: 9, length: 1, seed: 8 });
  return [
    backdrop('#25312f'),
    rect('floor', -40, 1010, 1160, 1000, '#1c2523', 0),
    place('cat', catBristle(s), 60, 40, 0.92),
    place('human', arm, 216, 700, 0.6),
    label('l.cat', 'Katze\nbei Gefahr', 130, 190, 76, SC.cream, 1, 520),
    label('l.human', 'Mensch: Gänsehaut', 130, 1010, 62, SC.cream, 1, 860)
  ];
}

// ------------------------------------------------------------------ air that keeps the warmth

export function airLayer(s: number): Item[] {
  const e = ease(Math.max(0, Math.min(1, s)));
  const items: Item[] = [backdrop('#1b2631')];
  const arm = gooseArm(s, { n: 7, length: 1.35, bare: true, seed: 3 });
  items.push(...arm);
  items.push(
    ellipse('air', 540, 1020, 470, 170, '#f2e29a', 0, 0.38 * e),
    ...Array.from({ length: 9 }, (_, i) => ellipse(`air.${i}`, 150 + i * 105, 1060 + ((i * 47) % 70) - 30, 11, 11, '#fff6c8', 3, 0.9 * e)),
    ...Array.from({ length: 4 }, (_, i) => stroke(`warm.${i}`, [{ x: 220 + i * 210, y: 1160 }, { x: 240 + i * 210, y: 1100 }, { x: 205 + i * 210, y: 1040 }, { x: 235 + i * 210, y: 980 }], SC.warm, 10, e)),
    ...Array.from({ length: 4 }, (_, i) => {
      const x = 170 + i * 240;
      const y = lerp(1150, 760, e);
      return group(`cold.${i}`, [stroke(`cold.${i}.l`, [{ x, y: y - 260 }, { x, y }], SC.cold, 14), shape(`cold.${i}.h`, poly([{ x: x - 34, y: y - 28 }, { x: x + 34, y: y - 28 }, { x, y: y + 22 }]), SC.cold, 5)]);
    }),
    label('cold.t', 'Kälte', 130, 190, 80, SC.cold, 1, 520),
    label('air.t', 'Luftschicht', 130, 1340, 78, '#f6e9a8', e),
    label('warm.t', 'hält die Wärme', 130, 1440, 58, SC.cream, e)
  );
  return items;
}

// ------------------------------------------------------------------ strong feelings

export function note(id: string, x: number, y: number, size: number, color: string, opacity = 1): Item {
  const g = group(id, [ellipse(`${id}.h`, 0, 0, 30, 22, color, 5), stroke(`${id}.s`, [{ x: 26, y: -4 }, { x: 26, y: -120 }], color, 9), stroke(`${id}.f`, [{ x: 26, y: -120 }, { x: 70, y: -92 }, { x: 60, y: -62 }], color, 9)], opacity);
  return at(g, x, y, 0, size);
}

function crowd(rows: number, color: string, raised: boolean, t: number): Item[] {
  const out: Item[] = [];
  for (let r = 0; r < rows; r++) {
    const y = 1330 + r * 190;
    const sc = 0.9 + r * 0.25;
    for (let i = 0; i < 6 - (r % 2); i++) {
      const x = 90 + i * 190 + (r % 2) * 95 + Math.sin(t * 9 + i + r) * 8;
      out.push(ellipse(`h.${r}.${i}`, x, y, 52 * sc, 60 * sc, color, 0));
      out.push(rect(`s.${r}.${i}`, x - 85 * sc, y + 70 * sc, 170 * sc, 300, color, 0, 60));
      if (raised && (i + r) % 2 === 0) out.push(stroke(`a.${r}.${i}`, [{ x: x + 50 * sc, y: y + 100 * sc }, { x: x + 80 * sc, y: y - 90 * sc - Math.sin(t * 12 + i) * 16 }], color, 34 * sc));
    }
  }
  return out;
}

export function feelings(kind: 'music' | 'film' | 'moment', t: number): Item[] {
  if (kind === 'music') {
    return [
      backdrop('#1f1830'),
      shape('beam.1', poly([{ x: 200, y: -40 }, { x: 330, y: -40 }, { x: 640, y: 1400 }, { x: 80, y: 1400 }]), '#7c4a9a', 0, 0.35),
      shape('beam.2', poly([{ x: 740, y: -40 }, { x: 880, y: -40 }, { x: 1100, y: 1400 }, { x: 520, y: 1400 }]), '#d0708a', 0, 0.3),
      ...[0, 1, 2, 3].map((i) => note(`n${i}`, 160 + i * 250, 1000 - i * 90 - t * 520 + ((i % 2) * 120), 1.5, ['#f0a23a', '#f2c4d0', '#9ad0f0', '#f0a23a'][i], Math.max(0, 1 - t * 0.6))),
      ...crowd(3, '#120d1f', true, t),
      label('f.t', 'bewegende\nMusik', 130, 190, 72, SC.cream, 1, 520, 'left')
    ];
  }
  if (kind === 'film') {
    return [
      backdrop('#12151b'),
      rect('screen', 140, 300, 800, 500, '#4c6a8c', 8, 14),
      ellipse('sun', 540, lerp(640, 520, t), 100, 100, '#f0c77a', 0),
      shape('hill', poly([{ x: 140, y: 800 }, { x: 140, y: 650 }, { x: 420, y: 560 }, { x: 700, y: 680 }, { x: 940, y: 600 }, { x: 940, y: 800 }]), '#2a3a4a', 0),
      shape('beam', poly([{ x: 490, y: 1900 }, { x: 590, y: 1900 }, { x: 940, y: 300 }, { x: 140, y: 300 }]), '#9db8d6', 0, 0.12),
      ...crowd(2, '#0a0c10', false, t),
      ellipse('tear', 700, lerp(1420, 1500, t), 12, 18, '#9ad0f0', 3, t),
      label('f.t', 'ein emotionaler\nFilm', 130, 190, 66, SC.cream, 1, 520)
    ];
  }
  return [
    backdrop('#e4a86a'),
    rect('sky.2', -40, 600, 1160, 500, '#c8744f', 0),
    rect('sky.3', -40, 1000, 1160, 500, '#8a4a5a', 0),
    ellipse('sun', 540, lerp(1250, 820, t), 230, 230, '#fbe3a0', 0),
    shape('range', poly([{ x: -40, y: 1500 }, { x: 160, y: 1180 }, { x: 330, y: 1380 }, { x: 560, y: 1060 }, { x: 800, y: 1360 }, { x: 960, y: 1200 }, { x: 1120, y: 1500 }, { x: 1120, y: 2000 }, { x: -40, y: 2000 }]), '#2f2a3d', 6),
    ellipse('p.head', 560, 1008, 22, 24, '#120d1f', 0),
    rect('p.body', 540, 1032, 40, 70, '#120d1f', 0, 14),
    stroke('p.arm.l', [{ x: 542, y: 1044 }, { x: 500, y: 984 }], '#120d1f', 14),
    stroke('p.arm.r', [{ x: 578, y: 1044 }, { x: 622, y: 984 }], '#120d1f', 14),
    label('f.t', 'ein\nüberwältigender\nMoment', 130, 190, 62, '#2b1b2b', 1, 520)
  ];
}

// ------------------------------------------------------------------ what we do not know yet

export function brainQuestion(t: number): Item[] {
  const brain = makeVisual('brain', { x: 540, y: 820 }, 2.4);
  const items: Item[] = [backdrop('#1c2430'), ellipse('halo', 540, 820, 480, 360, '#27334a', 0, 0.9)];
  if (brain) items.push(named(brain, 'brain'));
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.2 + i / 3) % 1;
    items.push(ellipse(`ring.${i}`, 540, 820, 250 + p * 420, 190 + p * 330, null, 6, 0.75 * (1 - p)));
  }
  [[200, 460, 160], [860, 420, 190], [260, 1180, 150], [820, 1160, 170]].forEach(([x, y, size], i) => items.push(text(`q.${i}`, '?', x, y - t * 70 - i * 6, size, SC.amber, { weight: 800, width: 200, align: 'center', opacity: 0.9 })));
  items.push(label('b.t', 'Was genau macht\ndas Gehirn dabei?', 130, 1420, 76, SC.cream, 1, 860));
  return items;
}

// headphones over a head: a band over the top and a cup on each ear, r is the radius of the head
export function headphones(x: number, y: number, r: number, opacity = 1): Item[] {
  const arc = [{ x: x - r * 1.0, y: y + r * 0.05 }, { x: x - r * 0.95, y: y - r * 0.8 }, { x, y: y - r * 1.2 }, { x: x + r * 0.95, y: y - r * 0.8 }, { x: x + r * 1.0, y: y + r * 0.05 }];
  const cup = (id: string, cx: number) => group(id, [ellipse(`${id}.o`, cx, y + r * 0.1, r * 0.3, r * 0.45, '#2a2d33', 6), ellipse(`${id}.i`, cx, y + r * 0.1, r * 0.17, r * 0.3, '#f0a23a', 0)], opacity);
  return [stroke('hp.band', curve(arc), '#14161a', r * 0.22, opacity), stroke('hp.rim', curve(arc), '#f0a23a', r * 0.09, opacity), cup('hp.l', x - r * 1.0), cup('hp.r', x + r * 1.0)];
}

// a dark rounded plate behind a line of text so it reads on any picture
export function plate(id: string, x: number, y: number, w: number, h: number, opacity = 0.6, color = '#14181d'): Item {
  return rect(id, x, y, w, h, color, 0, h / 2, opacity);
}
