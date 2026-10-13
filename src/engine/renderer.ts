import { Point, RenderBackend } from '../types';

/**
 * Canvas 2D Backend - Highly optimized for 60-120 FPS
 * Zero heap allocations in hot drawing paths.
 */
export class CanvasBackend implements RenderBackend {
  public ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  fill(p: Point[], col: string): void {
    const n = p.length;
    if (n < 3) return;
    const c = this.ctx;
    c.beginPath();

    // Zero-allocation closed quadratic bezier path
    const last = p[n - 1];
    const first = p[0];
    c.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);

    for (let i = 0; i < n; i++) {
      const curr = p[i];
      const next = p[(i + 1) % n];
      c.quadraticCurveTo(curr[0], curr[1], (curr[0] + next[0]) * 0.5, (curr[1] + next[1]) * 0.5);
    }
    c.closePath();
    c.fillStyle = col;
    c.fill();
  }

  stroke(p: Point[], col: string, width: number): void {
    const n = p.length;
    if (n < 2) return;
    const c = this.ctx;
    c.beginPath();

    // Zero-allocation open quadratic bezier path
    c.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const curr = p[i];
      const next = p[i + 1];
      c.quadraticCurveTo(curr[0], curr[1], (curr[0] + next[0]) * 0.5, (curr[1] + next[1]) * 0.5);
    }
    c.lineTo(p[n - 1][0], p[n - 1][1]);
    c.strokeStyle = col;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }

  /**
   * Ultra-fast sub-segment curve drawing for continuous streaming vines
   * Interpolates fractional start and end points without allocating array buffers!
   */
  strokeRange(P: Point[], a: number, b: number, col: string, width: number): void {
    const n = P.length - 1;
    if (n < 1 || b <= a) return;

    const ia = a * n;
    const ib = b * n;

    const i0 = Math.floor(ia);
    const f0 = ia - i0;
    const p0 = P[i0];
    const p0N = P[i0 + 1];
    const startX = p0[0] + (p0N[0] - p0[0]) * f0;
    const startY = p0[1] + (p0N[1] - p0[1]) * f0;

    const i1 = Math.min(n - 1, Math.floor(ib));
    const f1 = ib - i1;
    const p1 = P[i1];
    const p1N = P[i1 + 1];
    const endX = p1[0] + (p1N[0] - p1[0]) * f1;
    const endY = p1[1] + (p1N[1] - p1[1]) * f1;

    const c = this.ctx;
    c.beginPath();
    c.moveTo(startX, startY);

    const firstFull = i0 + 1;
    const lastFull = Math.floor(ib);

    for (let i = firstFull; i < lastFull; i++) {
      const curr = P[i];
      const next = P[i + 1];
      c.quadraticCurveTo(curr[0], curr[1], (curr[0] + next[0]) * 0.5, (curr[1] + next[1]) * 0.5);
    }

    c.lineTo(endX, endY);
    c.strokeStyle = col;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }

  rect(x: number, y: number, w: number, h: number, col: string): void {
    const c = this.ctx;
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  }

  text(ch: string, x: number, y: number, size: number, col: string, font: string): void {
    const c = this.ctx;
    c.font = `700 ${size}px ${font}`;
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillStyle = col;
    c.fillText(ch, x, y);
  }
}

/**
 * SVG Backend for high-resolution vector export
 */
export class SvgBackend implements RenderBackend {
  private elements: string[] = [];
  public width: number;
  public height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  fill(p: Point[], col: string): void {
    const n = p.length;
    if (n < 3) return;
    const sX = ((p[n - 1][0] + p[0][0]) * 0.5).toFixed(2);
    const sY = ((p[n - 1][1] + p[0][1]) * 0.5).toFixed(2);
    let d = `M ${sX} ${sY} `;
    for (let i = 0; i < n; i++) {
      const q = p[(i + 1) % n];
      const mX = ((p[i][0] + q[0]) * 0.5).toFixed(2);
      const mY = ((p[i][1] + q[1]) * 0.5).toFixed(2);
      d += `Q ${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)} ${mX} ${mY} `;
    }
    d += 'Z';
    this.elements.push(`<path d="${d}" fill="${col}" />`);
  }

  stroke(p: Point[], col: string, width: number): void {
    const n = p.length;
    if (n < 2) return;
    let d = `M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)} `;
    for (let i = 1; i < n - 1; i++) {
      const q = p[i + 1];
      const mX = ((p[i][0] + q[0]) * 0.5).toFixed(2);
      const mY = ((p[i][1] + q[1]) * 0.5).toFixed(2);
      d += `Q ${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)} ${mX} ${mY} `;
    }
    d += `L ${p[n - 1][0].toFixed(2)} ${p[n - 1][1].toFixed(2)}`;
    this.elements.push(
      `<path d="${d}" fill="none" stroke="${col}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
    );
  }

  strokeRange(P: Point[], a: number, b: number, col: string, width: number): void {
    const n = P.length - 1;
    if (n < 1 || b <= a) return;
    const ia = a * n;
    const ib = b * n;

    const lerp = (t: number): Point => {
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
    };

    const pts: Point[] = [lerp(ia)];
    for (let i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
    pts.push(lerp(ib));
    this.stroke(pts, col, width);
  }

  rect(x: number, y: number, w: number, h: number, col: string): void {
    this.elements.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}" />`
    );
  }

  text(ch: string, x: number, y: number, size: number, col: string, font: string): void {
    const escaped = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
    this.elements.push(
      `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="700" fill="${col}" text-anchor="middle" dominant-baseline="alphabetic">${escaped}</text>`
    );
  }

  toSvgString(): string {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">`,
      `<style>text { user-select: none; }</style>`,
      ...this.elements,
      `</svg>`
    ].join('\n');
  }
}
