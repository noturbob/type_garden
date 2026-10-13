import {
  Point,
  Palette,
  BotanicalSpecies,
  BotanicalElement,
  StemElement,
  WeaveSegment,
  Butterfly,
  RenderBackend,
  LetterItem,
  AtmosphericParticle,
} from '../types';
import {
  createRNG,
  springEase,
  easeOutCubic,
  pointAndTangentAt,
  bezierPoints,
} from './math';

export class BotanyEngine {
  /**
   * Generates a procedural vine curve
   */
  static generateVine(
    base: Point,
    dir: number,
    len: number,
    amp: number,
    waves: number,
    ph: number,
    bend: number,
    steps = 40
  ): Point[] {
    const pts: Point[] = [[base[0], base[1]]];
    const stepSize = len / steps;
    let x = base[0];
    let y = base[1];

    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const angle =
        dir +
        bend * u +
        amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
      x += Math.cos(angle) * stepSize;
      y += Math.sin(angle) * stepSize;
      pts.push([x, y]);
    }
    return pts;
  }

  /**
   * Adds an organic spiral curl to the tip of a vine
   */
  static curl(pts: Point[], sign: number, radius: number): Point[] {
    const n = pts.length;
    if (n < 2) return pts;
    const end = pts[n - 1];
    const prev = pts[n - 2];
    const tangent = Math.atan2(end[1] - prev[1], end[0] - prev[0]);

    const center: Point = [
      end[0] - Math.sin(tangent) * sign * radius,
      end[1] + Math.cos(tangent) * sign * radius,
    ];
    const a0 = Math.atan2(end[1] - center[1], end[0] - center[0]);

    for (let i = 1; i <= 14; i++) {
      const u = i / 14;
      const theta = a0 + sign * u * Math.PI * 1.6;
      const r = radius * (1 - 0.5 * u);
      pts.push([center[0] + Math.cos(theta) * r, center[1] + Math.sin(theta) * r]);
    }
    return pts;
  }

  /**
   * Weave cuts alternating between layer 0 (behind text) and layer 1 (in front of text)
   */
  static weave(rng: () => number, startLayer: number): WeaveSegment[] {
    const cuts: number[] = [];
    const numCuts = 1 + Math.floor(rng() * 2.8);
    for (let i = 0; i < numCuts; i++) cuts.push(0.18 + rng() * 0.65);
    cuts.sort((a, b) => a - b);

    const segs: WeaveSegment[] = [];
    let u0 = 0;
    let layer = startLayer;

    for (const c of cuts) {
      if (c <= u0) continue;
      segs.push({ u0, u1: c, layer });
      u0 = c;
      layer = 1 - layer;
    }
    segs.push({ u0, u1: 1, layer });
    return segs;
  }

  static getLayerAt(segs: WeaveSegment[], u: number): number {
    for (const s of segs) {
      if (u >= s.u0 && u <= s.u1) return s.layer;
    }
    return segs[segs.length - 1]?.layer ?? 0;
  }

  /**
   * Clamps flower positions to the outer edges so letters remain 100% visible
   */
  static clampToLetterEdges(pos: Point, letterWidth: number): Point {
    const [x, y] = pos;
    const halfW = letterWidth * 0.5;

    // Reading zone of serif letter
    if (Math.abs(x) < halfW && y > -0.72 && y < 0.08) {
      if (y < -0.35) {
        return [x, -0.8 - Math.random() * 0.22];
      } else if (y > -0.1) {
        return [x, 0.16 + Math.random() * 0.2];
      } else {
        const side = x >= 0 ? 1 : -1;
        return [side * (halfW + 0.16 + Math.random() * 0.15), y];
      }
    }
    return [x, y];
  }

  /**
   * Word parameters for organic streaming continuity
   */
  static wordParams(ws: number) {
    const rng = createRNG(ws * 7 + 13);
    return {
      roseP: 0.35 + rng() * 0.3,
      leafy: 0.8 + rng() * 0.6,
      curvy: 0.85 + rng() * 0.5,
      bridgeP: 0.75,
      big: 0.85 + rng() * 0.35,
      w: 0.55,
    };
  }

  /**
   * Core procedural branch generator
   */
  static grow(
    rng: () => number,
    elements: BotanicalElement[],
    nextId: () => number,
    params: { roseP: number; leafy: number; curvy: number; bridgeP: number; big: number; w: number },
    options: {
      base?: Point;
      dir?: number;
      len?: number;
      pts?: Point[];
      d0: number;
      tip?: 'rose' | 'leaf' | 'curl' | 'fan' | null;
      depth?: number;
      layer0?: number;
    }
  ): Point[] {
    const isBranch = (options.depth || 0) > 0;
    const tip =
      options.tip ||
      (rng() < params.roseP ? 'rose' : rng() < 0.45 ? 'fan' : rng() < 0.6 ? 'leaf' : 'curl');

    let P =
      options.pts ||
      this.generateVine(
        options.base || [0, 0],
        options.dir || -Math.PI / 2,
        options.len || 0.65,
        (0.3 + rng() * 0.35) * params.curvy,
        1.1 + rng() * 1.5,
        rng() * 6.28,
        (rng() - 0.5) * 1.1,
        38
      );

    if (tip === 'curl') {
      P = this.curl(P, rng() < 0.5 ? -1 : 1, 0.06 + rng() * 0.05);
    }

    const segs = this.weave(rng, options.layer0 != null ? options.layer0 : rng() < 0.5 ? 0 : 1);
    const dur = Math.max(300, (options.len || 0.7) * 580);

    const thorns: { u: number; s: number }[] = [];
    const numThorns = Math.floor(rng() * 2.5);
    for (let i = 0; i < numThorns; i++) {
      thorns.push({ u: 0.2 + rng() * 0.6, s: rng() < 0.5 ? -1 : 1 });
    }

    elements.push({
      t: 'stem',
      id: nextId(),
      pts: P,
      segs,
      d0: options.d0,
      dur,
      w: isBranch ? 0.82 : 1,
      thorns,
    });

    // Leaves along vine
    const numLeaves = Math.floor(rng() * 2.5 * params.leafy);
    let side = rng() < 0.5 ? -1 : 1;
    for (let i = 0; i < numLeaves; i++) {
      const u = 0.22 + rng() * 0.6;
      const [q, a] = pointAndTangentAt(P, u);
      side = -side;
      elements.push({
        t: 'leaf',
        id: nextId(),
        x: q[0],
        y: q[1],
        a: a + side * (0.6 + rng() * 0.45),
        L: (0.15 + rng() * 0.18) * (isBranch ? 0.8 : 1),
        bend: (rng() - 0.5) * 1.1,
        layer: this.getLayerAt(segs, u),
        d0: options.d0 + dur * u,
      });
    }

    // Tip blooming flower - Placed on the EDGES
    const [rawTip, ta] = pointAndTangentAt(P, 1);
    const td = options.d0 + dur * 0.85;

    if (tip === 'rose') {
      const clamped = this.clampToLetterEdges(rawTip, params.w);
      const R = (0.14 + rng() * 0.12) * params.big * (isBranch ? 0.75 : 1);

      elements.push({
        t: 'rose',
        id: nextId(),
        x: clamped[0],
        y: clamped[1],
        R,
        rot: (rng() - 0.5) * 1.1,
        ph1: rng() * 6.28,
        ph2: rng() * 6.28,
        turns: 1.6 + rng() * 1.0,
        layer: 0, // Always behind letter text!
        d0: td,
      });

      if (rng() < 0.25) {
        const angleOffset = ta + (rng() < 0.5 ? 1 : -1) * 1.3;
        elements.push({
          t: 'rose',
          id: nextId(),
          x: clamped[0] + Math.cos(angleOffset) * R * 1.35,
          y: clamped[1] + Math.sin(angleOffset) * R * 1.35,
          R: R * 0.65,
          rot: (rng() - 0.5) * 1.2,
          ph1: rng() * 6.28,
          ph2: rng() * 6.28,
          turns: 1.5,
          layer: 0,
          d0: td + 110,
        });
      }
    } else if (tip === 'fan') {
      const spread = 0.6 + rng() * 0.3;
      for (let j = 0; j < 2; j++) {
        elements.push({
          t: 'leaf',
          id: nextId(),
          x: rawTip[0],
          y: rawTip[1],
          a: ta + (j - 0.5) * spread,
          L: 0.18 + rng() * 0.18,
          bend: (j - 0.5) * 0.8,
          layer: this.getLayerAt(segs, 1),
          d0: td + j * 50,
        });
      }
    } else if (tip === 'leaf') {
      elements.push({
        t: 'leaf',
        id: nextId(),
        x: rawTip[0],
        y: rawTip[1],
        a: ta + (rng() - 0.5) * 0.3,
        L: 0.16 + rng() * 0.16,
        bend: rng() - 0.5,
        layer: this.getLayerAt(segs, 1),
        d0: td,
      });
    }

    if (!isBranch && rng() < 0.32) {
      const u = 0.35 + rng() * 0.35;
      const [q, a] = pointAndTangentAt(P, u);
      this.grow(rng, elements, nextId, params, {
        base: q,
        dir: a + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.4),
        len: (options.len || 0.7) * (0.35 + rng() * 0.2),
        d0: options.d0 + dur * u,
        depth: 1,
        layer0: this.getLayerAt(segs, u),
      });
    }

    return P;
  }

  /**
   * Generates continuous streaming vines for a letter item
   */
  static generateLetterStreaming(letter: LetterItem, charWidth: number) {
    const rng = createRNG(letter.ws ^ Math.imul(letter.wi + 1, 2654435761));
    const params = this.wordParams(letter.ws);
    params.w = charWidth;

    const elements: BotanicalElement[] = [];
    let elemSeq = 0;
    const nextId = () => letter.id * 100 + elemSeq++;

    const inX = () => (rng() - 0.5) * charWidth * 0.65;
    const numUp = 1 + (rng() < 0.45 ? 1 : 0);

    for (let i = 0; i < numUp; i++) {
      this.grow(rng, elements, nextId, params, {
        base: [inX(), -rng() * 0.3],
        dir: -Math.PI / 2 + (rng() - 0.5) * 0.7,
        len: 0.65 + rng() * 0.45,
        d0: 40 + i * 120,
        tip: letter.wi === 0 && i === 0 ? 'rose' : null,
      });
    }

    if (rng() < 0.42) {
      this.grow(rng, elements, nextId, params, {
        base: [inX(), -0.1 - rng() * 0.35],
        dir: Math.PI / 2 + (rng() - 0.5) * 0.75,
        len: 0.36 + rng() * 0.35,
        d0: 150,
      });
    }

    // Bridging vine between adjacent characters on the same line
    if (letter.prev && (letter.prev.line == null || letter.prev.line === letter.line) && rng() < params.bridgeP) {
      const prevW = letter.prev.tw ? letter.prev.tw / 75 : 0.55;
      const px = -(prevW + charWidth) * 0.5;
      const a: Point = [inX(), -0.05 - rng() * 0.5];
      const b: Point = [px + (rng() - 0.5) * 0.22, -0.05 - rng() * 0.5];

      const bulge = (rng() < 0.55 ? -1 : 1) * (0.35 + rng() * 0.35);
      const dx = b[0] - a[0];
      let bridgePts = bezierPoints(
        a,
        [a[0] + dx * 0.15, a[1] + bulge],
        [b[0] - dx * 0.15, b[1] + bulge * 0.9],
        b,
        36
      );

      if (rng() < 0.4) {
        bridgePts = bridgePts.slice(0, Math.floor(bridgePts.length * (0.7 + rng() * 0.2)));
      }

      this.grow(rng, elements, nextId, params, {
        pts: bridgePts,
        len: Math.abs(dx) + Math.abs(bulge),
        d0: 80,
        tip: rng() < 0.5 ? 'curl' : rng() < 0.5 ? 'leaf' : 'rose',
      });
    }

    if (letter.wi === 0) {
      this.grow(rng, elements, nextId, params, {
        base: [-charWidth * 0.32, -0.15 - rng() * 0.35],
        dir: Math.PI + (rng() - 0.5) * 1.1,
        len: 0.45 + rng() * 0.28,
        d0: 100,
        tip: 'curl',
      });
    }

    letter.els = elements;
    letter.endEls = null;

    const tendrilElements: BotanicalElement[] = [];
    const trRng = createRNG(letter.id * 977 + 41);
    this.grow(trRng, tendrilElements, () => letter.id * 100 + 90 + tendrilElements.length, params, {
      base: [charWidth * 0.28, -0.1 - trRng() * 0.4],
      dir: (trRng() - 0.5) * 1.3,
      len: 0.42 + trRng() * 0.25,
      d0: 0,
      tip: 'curl',
      depth: 1,
    });
    letter.tend = tendrilElements.filter((e): e is StemElement => e.t === 'stem').slice(0, 1);
  }

  /**
   * Generates terminal flourished blooms when spacebar cuts a word
   */
  static generateWordEndBlooms(letter: LetterItem, relDelay: number) {
    const rng = createRNG(letter.ws + letter.wi * 31 + 83);
    const params = this.wordParams(letter.ws);
    const elements: BotanicalElement[] = [];
    let k0 = 50;
    const nextId = () => letter.id * 100 + k0++;

    const w = 0.55;
    const n = 1 + Math.floor(rng() * 2.4);
    params.w = w;

    for (let i = 0; i < n; i++) {
      const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.85 + (rng() - 0.5) * 0.35;
      this.grow(rng, elements, nextId, params, {
        base: [(rng() - 0.2) * w * 0.55, -rng() * 0.45],
        dir,
        len: 0.42 + rng() * 0.4,
        d0: relDelay + 40 + i * 85,
        depth: 1,
        tip: i === 0 || rng() < 0.5 ? 'rose' : 'fan',
      });
    }
    letter.endEls = elements;
  }

  /**
   * Draws flower blooms according to the selected Botanical Species:
   * - 'wild-rose': Classical multi-layer petal rose
   * - 'sakura': 5-petal notched Japanese cherry blossom
   * - 'bioluminescent': Radiating glowing spore filaments and starburst
   * - 'golden-ginkgo': Fan-shaped golden petals
   * - 'emerald-lotus': Elegant pointed water lily petals
   */
  static drawFlower(
    backend: RenderBackend,
    palette: Palette,
    species: BotanicalSpecies,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    turns: number,
    phase1: number,
    phase2: number,
    growth: number,
    tilt: [number, number] = [0, 0]
  ): void {
    if (radius <= 2 || growth <= 0.01) return;

    if (species === 'sakura') {
      this.drawSakuraBloom(backend, palette, cx, cy, radius, rot, growth, tilt);
    } else if (species === 'bioluminescent') {
      this.drawBioluminescentSpore(backend, palette, cx, cy, radius, rot, growth, tilt);
    } else if (species === 'golden-ginkgo') {
      this.drawGinkgoBloom(backend, palette, cx, cy, radius, rot, growth, tilt);
    } else if (species === 'emerald-lotus') {
      this.drawLotusBloom(backend, palette, cx, cy, radius, rot, growth, tilt);
    } else {
      // Default: Classical Wild Rose
      this.drawWildRose(backend, palette, cx, cy, radius, rot, turns, phase1, phase2, growth, tilt);
    }
  }

  /**
   * Classical Wild Rose renderer
   */
  private static drawWildRose(
    backend: RenderBackend,
    palette: Palette,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    turns: number,
    phase1: number,
    phase2: number,
    growth: number,
    tilt: [number, number]
  ): void {
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const tiltMag = Math.hypot(tilt[0], tilt[1]);
    const ux = tiltMag ? tilt[0] / tiltMag : 0;
    const uy = tiltMag ? tilt[1] / tiltMag : 0;
    const squash = -0.22 * tiltMag;

    const transform = (x: number, y: number, z = 0): Point => {
      let dx = x * cr - y * sr;
      let dy = x * sr + y * cr;
      if (tiltMag > 0.001) {
        const k = (dx * ux + dy * uy) * squash;
        dx += k * ux + tilt[0] * radius * z;
        dy += k * uy + tilt[1] * radius * z;
      }
      return [cx + dx, cy + dy];
    };

    const petals = [
      [0, -0.36, 0.56, 0.54, 0, 0, 0],
      [-0.5, -0.08, 0.6, 0.6, -0.35, 0, 0],
      [0.52, -0.08, 0.6, 0.6, 0.35, 0, 0],
      [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
      [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
      [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0],
    ];

    const lineWidth = Math.max(0.8, radius * 0.045);

    petals.forEach((p, idx) => {
      const petalDelay = idx * 0.11;
      const petalT = Math.max(0, (growth - petalDelay) / (1 - petalDelay));
      const s = springEase(petalT * 1.3, 7, 14);
      if (s <= 0.01) return;

      const openAngle = (1 - Math.min(1, s)) * (p[0] < 0 ? 0.5 : -0.5);
      const angle = p[4] + openAngle;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);

      const petalPoint = (theta: number): Point => {
        const harmonic =
          1 +
          0.08 * Math.sin(3 * theta + phase1 + idx) +
          0.04 * Math.sin(5 * theta + phase2);
        const lx = Math.cos(theta) * p[2] * harmonic;
        const ly = Math.sin(theta) * p[3] * harmonic;
        const px = p[0] + lx * ca - ly * sa;
        const py = p[1] + lx * sa + ly * ca;
        return transform((px * s) * radius, (py * s) * radius, p[5]);
      };

      const pts: Point[] = [];
      const steps = 22;
      for (let k = 0; k < steps; k++) {
        pts.push(petalPoint((k / steps) * Math.PI * 2));
      }

      backend.fill(pts, palette.flower);

      if (p[6] && radius >= 12 && s > 0.4) {
        const edgePts: Point[] = [];
        for (let k = 0; k <= 14; k++) {
          edgePts.push(petalPoint(Math.PI * (1.18 + (0.64 * k) / 14)));
        }
        backend.stroke(edgePts, palette.line, lineWidth * 0.85);
      }
    });

    const centerEase = easeOutCubic(Math.max(0, (growth - 0.45) / 0.55));
    if (centerEase > 0.01 && radius > 4) {
      const spiralPts: Point[] = [];
      const totalSteps = 50;
      const effectiveTurns = radius < 22 ? Math.min(turns, 1.3) : turns;

      for (let i = 0; i <= totalSteps; i++) {
        const u = (i / totalSteps) * centerEase;
        const theta = phase1 + u * effectiveTurns * Math.PI * 2;
        const r = radius * (0.08 + 0.55 * u);
        spiralPts.push(
          transform(
            Math.cos(theta) * r * 1.05,
            Math.sin(theta) * r * 0.72 - 0.12 * radius,
            0.3 - 0.2 * u
          )
        );
      }
      backend.stroke(spiralPts, palette.line, lineWidth);
    }
  }

  /**
   * Japanese Sakura (Cherry Blossom) with 5 notched heart-shaped petals
   */
  private static drawSakuraBloom(
    backend: RenderBackend,
    palette: Palette,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    growth: number,
    tilt: [number, number]
  ): void {
    const s = springEase(growth * 1.25, 7, 14);
    if (s <= 0.01) return;
    const r = radius * s;

    // 5 petals
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * Math.PI * 2 + tilt[0] * 0.2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = -sa;
      const py = ca;

      const pts: Point[] = [];
      const petalLen = r * 0.95;
      const petalW = r * 0.46;

      pts.push([cx, cy]);
      pts.push([cx + ca * petalLen * 0.5 + px * petalW * 0.8, cy + sa * petalLen * 0.5 + py * petalW * 0.8]);
      // Notched tip
      pts.push([cx + ca * petalLen * 0.95 + px * petalW * 0.4, cy + sa * petalLen * 0.95 + py * petalW * 0.4]);
      pts.push([cx + ca * petalLen * 0.82, cy + sa * petalLen * 0.82]); // Indentation
      pts.push([cx + ca * petalLen * 0.95 - px * petalW * 0.4, cy + sa * petalLen * 0.95 - py * petalW * 0.4]);
      pts.push([cx + ca * petalLen * 0.5 - px * petalW * 0.8, cy + sa * petalLen * 0.5 - py * petalW * 0.8]);

      backend.fill(pts, palette.flower);
      backend.stroke(pts, palette.line, Math.max(0.7, r * 0.04));
    }

    // Center stamen pistils
    if (r > 6) {
      for (let j = 0; j < 8; j++) {
        const sa = rot + (j / 8) * Math.PI * 2;
        const sl = r * 0.32;
        backend.stroke(
          [
            [cx, cy],
            [cx + Math.cos(sa) * sl, cy + Math.sin(sa) * sl],
          ],
          palette.line,
          Math.max(0.6, r * 0.03)
        );
      }
    }
  }

  /**
   * Bioluminescent Spore Flower with glowing filaments
   */
  private static drawBioluminescentSpore(
    backend: RenderBackend,
    palette: Palette,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    growth: number,
    tilt: [number, number]
  ): void {
    const s = springEase(growth * 1.3, 8, 16);
    if (s <= 0.01) return;
    const r = radius * s;

    // Glowing core
    const corePts: Point[] = [];
    for (let k = 0; k < 16; k++) {
      const th = (k / 16) * Math.PI * 2;
      corePts.push([cx + Math.cos(th) * r * 0.35, cy + Math.sin(th) * r * 0.35]);
    }
    backend.fill(corePts, palette.flower);

    // Radiating filament tendrils
    const filaments = 10;
    for (let i = 0; i < filaments; i++) {
      const a = rot + (i / filaments) * Math.PI * 2 + tilt[0] * 0.15;
      const fl = r * (0.7 + 0.3 * Math.sin(i * 2 + rot));
      const endPt: Point = [cx + Math.cos(a) * fl, cy + Math.sin(a) * fl];

      backend.stroke([[cx, cy], endPt], palette.line, Math.max(0.8, r * 0.04));

      // Spore orb at end of each filament
      const orbPts: Point[] = [];
      const orbR = r * 0.12;
      for (let k = 0; k < 10; k++) {
        const th = (k / 10) * Math.PI * 2;
        orbPts.push([endPt[0] + Math.cos(th) * orbR, endPt[1] + Math.sin(th) * orbR]);
      }
      backend.fill(orbPts, palette.flower);
    }
  }

  /**
   * Imperial Ginkgo Bloom
   */
  private static drawGinkgoBloom(
    backend: RenderBackend,
    palette: Palette,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    growth: number,
    tilt: [number, number]
  ): void {
    const s = springEase(growth * 1.2, 7, 14);
    if (s <= 0.01) return;
    const r = radius * s;

    // Fan shaped overlapping petals
    for (let i = 0; i < 4; i++) {
      const a = rot + (i / 4) * Math.PI * 2 + tilt[0] * 0.2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const px = -sa;
      const py = ca;

      const pts: Point[] = [];
      const fl = r * 0.9;
      const fw = r * 0.55;

      pts.push([cx, cy]);
      pts.push([cx + ca * fl * 0.4 + px * fw * 0.4, cy + sa * fl * 0.4 + py * fw * 0.4]);
      pts.push([cx + ca * fl + px * fw, cy + sa * fl + py * fw]);
      pts.push([cx + ca * fl * 0.95, cy + sa * fl * 0.95]); // Central cleft
      pts.push([cx + ca * fl - px * fw, cy + sa * fl - py * fw]);
      pts.push([cx + ca * fl * 0.4 - px * fw * 0.4, cy + sa * fl * 0.4 - py * fw * 0.4]);

      backend.fill(pts, palette.flower);
      backend.stroke(pts, palette.line, Math.max(0.7, r * 0.04));
    }
  }

  /**
   * Zen Lotus Blossom
   */
  private static drawLotusBloom(
    backend: RenderBackend,
    palette: Palette,
    cx: number,
    cy: number,
    radius: number,
    rot: number,
    growth: number,
    tilt: [number, number]
  ): void {
    const s = springEase(growth * 1.2, 7, 14);
    if (s <= 0.01) return;
    const r = radius * s;

    const layers = [
      { count: 8, len: r * 0.95, w: r * 0.32, offset: 0 },
      { count: 6, len: r * 0.65, w: r * 0.28, offset: 0.3 },
    ];

    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const a = rot + layer.offset + (i / layer.count) * Math.PI * 2 + tilt[0] * 0.2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const px = -sa;
        const py = ca;

        const pts: Point[] = [
          [cx, cy],
          [cx + ca * layer.len * 0.5 + px * layer.w, cy + sa * layer.len * 0.5 + py * layer.w],
          [cx + ca * layer.len, cy + sa * layer.len], // Sharp lotus tip
          [cx + ca * layer.len * 0.5 - px * layer.w, cy + sa * layer.len * 0.5 - py * layer.w],
        ];

        backend.fill(pts, palette.flower);
        backend.stroke(pts, palette.line, Math.max(0.7, r * 0.035));
      }
    });
  }

  /**
   * Draws a botanical leaf with curved outline and center vein
   */
  static drawLeaf(
    backend: RenderBackend,
    palette: Palette,
    species: BotanicalSpecies,
    bx: number,
    by: number,
    angle: number,
    length: number,
    bend: number,
    scale: number
  ): void {
    const L = length * scale;
    if (L < 1) return;

    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const px = -sa;
    const py = ca;

    if (species === 'golden-ginkgo') {
      // Fan shaped ginkgo leaf
      const fl = L * 0.9;
      const fw = L * 0.65;
      const pts: Point[] = [
        [bx, by],
        [bx + ca * fl * 0.3 + px * fw * 0.3, by + sa * fl * 0.3 + py * fw * 0.3],
        [bx + ca * fl + px * fw, by + sa * fl + py * fw],
        [bx + ca * fl * 0.92, by + sa * fl * 0.92],
        [bx + ca * fl - px * fw, by + sa * fl - py * fw],
        [bx + ca * fl * 0.3 - px * fw * 0.3, by + sa * fl * 0.3 - py * fw * 0.3],
      ];
      backend.fill(pts, palette.stem);
      backend.stroke([[bx, by], [bx + ca * fl * 0.92, by + sa * fl * 0.92]], palette.vein, Math.max(0.7, L * 0.035));
      return;
    }

    const spine = (u: number): Point => {
      const b = Math.sin(Math.PI * u) * bend * 0.15 * L;
      return [bx + ca * u * L + px * b, by + sa * u * L + py * b];
    };

    const halfWidth = (u: number): number =>
      L * 0.19 * Math.sin(Math.PI * Math.pow(u, 0.8));

    const steps = 10;
    const side1: Point[] = [];
    const side2: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const c = spine(u);
      const w = halfWidth(u);
      side1.push([c[0] + px * w, c[1] + py * w]);
      side2.push([c[0] - px * w, c[1] - py * w]);
    }

    const base = spine(0);
    const tip = spine(1);
    const outline: Point[] = [
      base,
      ...side1.slice(1, steps),
      tip,
      ...side2.slice(1, steps).reverse(),
      base,
    ];

    backend.fill(outline, palette.stem);

    if (L > 6) {
      const veinPts: Point[] = [];
      for (let i = 0; i <= 6; i++) {
        veinPts.push(spine(0.08 + (0.74 * i) / 6));
      }
      backend.stroke(veinPts, palette.vein, Math.max(0.7, L * 0.035));
    }
  }

  /**
   * Initializes atmospheric particles (falling petals, spores)
   */
  static createAtmosphericParticles(count = 24, w: number, h: number): AtmosphericParticle[] {
    const list: AtmosphericParticle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0.2 + Math.random() * 0.5,
        vy: 0.3 + Math.random() * 0.7,
        size: 3 + Math.random() * 5,
        alpha: 0.25 + Math.random() * 0.5,
        rot: Math.random() * 6.28,
        vRot: (Math.random() - 0.5) * 0.04,
        seed: Math.random() * 100,
      });
    }
    return list;
  }

  /**
   * Updates atmospheric drift particles
   */
  static updateAtmosphericParticles(
    particles: AtmosphericParticle[],
    w: number,
    h: number,
    wind: number
  ) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx + wind * 20;
      p.y += p.vy;
      p.rot += p.vRot;

      if (p.x > w + 20) p.x = -20;
      if (p.x < -20) p.x = w + 20;
      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }
    }
  }

  /**
   * Draws atmospheric particles based on species
   */
  static drawAtmosphericParticles(
    ctx: CanvasRenderingContext2D,
    particles: AtmosphericParticle[],
    palette: Palette,
    species: BotanicalSpecies
  ) {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;

      if (species === 'sakura') {
        // Delicate curved sakura petal
        ctx.fillStyle = palette.flower;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (species === 'bioluminescent') {
        // Glowing spore orb with halo
        ctx.fillStyle = palette.flower;
        ctx.shadowColor = palette.flower;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Soft golden pollen / floating leaf speck
        ctx.fillStyle = palette.flower;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Updates autonomous butterflies
   */
  static updateButterflies(
    butterflies: Butterfly[],
    perchPoints: { id: number; x: number; y: number; r: number }[],
    dt: number,
    now: number,
    width: number,
    height: number
  ): Butterfly[] {
    const perchesById = new Map(perchPoints.map((p) => [p.id, p]));

    return butterflies.filter((f) => {
      const t = (now - f.born) / 1000;
      let tx = f.targetX;
      let ty = f.targetY;

      if (f.state === 'perch' || f.state === 'fly') {
        const p = f.perchFlowerId ? perchesById.get(f.perchFlowerId) : null;
        if (!p) {
          f.state = 'wander';
          f.targetX = width / 2 + (Math.random() - 0.5) * 200;
          f.targetY = height / 2 + (Math.random() - 0.5) * 150;
        } else {
          tx = p.x;
          ty = p.y - p.r * 0.4;
        }
      } else if (f.state === 'wander') {
        tx = f.targetX + Math.sin(t * 1.3 + f.seed) * 80;
        ty = f.targetY + Math.sin(t * 2.1 + f.seed) * 50;
        if (t > 7 && Math.random() < 0.01) {
          f.state = 'leave';
          f.targetX = f.x < width / 2 ? -60 : width + 60;
          f.targetY = f.y - 100;
        }
      }

      if (f.state === 'perch') {
        f.x += (tx - f.x) * 0.25;
        f.y += (ty - f.y) * 0.25;
        f.angle *= 0.85;
        f.phase += dt * 0.003;
        f.wingOpen = 0.28 + 0.18 * Math.sin(f.phase);
      } else {
        const dx = tx - f.x;
        const dy = ty - f.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = f.state === 'leave' ? 0.45 : Math.min(0.32, 0.08 + dist * 0.0015);

        const flutter = Math.sin(t * 7 + f.seed) * 0.12;
        const wobble = Math.cos(t * 4.3 + f.seed) * 0.1;

        const ax = (dx / dist) * speed + wobble - f.vx;
        const ay = (dy / dist) * speed + flutter - f.vy;

        f.vx += ax * 0.06 * (dt / 16);
        f.vy += ay * 0.06 * (dt / 16);

        f.x += f.vx * dt;
        f.y += f.vy * dt + Math.sin(t * 12 + f.seed) * 0.5;

        f.angle += (Math.max(-0.5, Math.min(0.5, f.vx * 1.4)) - f.angle) * 0.1;
        f.wingOpen = Math.abs(Math.cos(t * 16 + f.seed));

        if (f.state === 'fly' && dist < 12) {
          f.state = 'perch';
          f.phase = 0;
        }
        if (f.state === 'leave' && (f.x < -70 || f.x > width + 70 || f.y < -70)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Draws a fluttering butterfly
   */
  static drawButterfly(
    backend: RenderBackend,
    palette: Palette,
    x: number,
    y: number,
    size: number,
    angle: number,
    openRatio: number
  ): void {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const transform = (px: number, py: number): Point => [
      x + (px * ca - py * sa) * size,
      y + (px * sa + py * ca) * size,
    ];

    const wing = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      a: number,
      side: number
    ): Point[] => {
      const pts: Point[] = [];
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const steps = 14;
      for (let k = 0; k < steps; k++) {
        const th = (k / steps) * Math.PI * 2;
        const r = 1 + 0.08 * Math.sin(th * 3);
        const lx = Math.cos(th) * rx * r;
        const ly = Math.sin(th) * ry * r;
        pts.push(
          transform(
            side * (cx + lx * c - ly * sn) * (0.15 + 0.85 * openRatio),
            cy + lx * sn + ly * c
          )
        );
      }
      return pts;
    };

    for (const side of [-1, 1]) {
      backend.fill(wing(0.48, 0.28, 0.36, 0.3, 0.5 * side, side), palette.text);
      backend.fill(wing(0.56, -0.32, 0.55, 0.36, -0.55, side), palette.text);
      if (openRatio > 0.35) {
        backend.fill(wing(0.66, -0.4, 0.14, 0.12, 0, side), palette.flower);
      }
    }

    const body: Point[] = [];
    for (let k = 0; k < 12; k++) {
      const th = (k / 12) * Math.PI * 2;
      body.push(transform(Math.cos(th) * 0.08, Math.sin(th) * 0.48));
    }
    backend.fill(body, palette.stem);

    const lw = Math.max(0.8, size * 0.05);
    backend.stroke(
      [transform(0, -0.42), transform(-0.14, -0.72), transform(-0.24, -0.86)],
      palette.stem,
      lw
    );
    backend.stroke(
      [transform(0, -0.42), transform(0.14, -0.72), transform(0.24, -0.86)],
      palette.stem,
      lw
    );
  }
}
