export interface Palette {
  name: string;
  bg: string;
  flower: string;
  stem: string;
  line: string;
  text: string;
  vein: string;
}

export type Point = [number, number];

export type BotanicalSpecies =
  | 'wild-rose'
  | 'sakura'
  | 'bioluminescent'
  | 'golden-ginkgo'
  | 'emerald-lotus';

export type AspectRatio = 'fullscreen' | '1:1' | '4:5' | '9:16';

export interface WeaveSegment {
  u0: number;
  u1: number;
  layer: number; // 0: behind text, 1: in front of text
}

export interface ThornElement {
  u: number;
  s: number; // 1 | -1
}

export interface StemElement {
  t: 'stem';
  id: number;
  pts: Point[];
  segs: WeaveSegment[];
  d0: number;
  dur: number;
  w: number;
  thorns: ThornElement[];
}

export interface LeafElement {
  t: 'leaf';
  id: number;
  x: number;
  y: number;
  a: number;
  L: number;
  bend: number;
  layer: number;
  d0: number;
}

export interface RoseElement {
  t: 'rose';
  id: number;
  x: number;
  y: number;
  R: number;
  rot: number;
  ph1: number;
  ph2: number;
  turns: number;
  layer: number;
  d0: number;
}

export type BotanicalElement = StemElement | LeafElement | RoseElement;

export interface LetterItem {
  id: number;
  ch: string;
  birth: number;
  dead: number | null;
  tb?: number;
  cut?: number | null;
  ws: number; // word seed
  wi: number; // word index
  prev?: LetterItem | null;
  els: BotanicalElement[];
  endEls?: BotanicalElement[] | null;
  tend?: StemElement[];
  tx: number;
  ty: number;
  tw: number;
  x: number;
  y: number;
  line: number;
  relX: number;
  lean?: [number, number];
}

export interface Butterfly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'wander' | 'fly' | 'perch' | 'leave';
  perchFlowerId: number | null;
  targetX: number;
  targetY: number;
  born: number;
  size: number;
  phase: number;
  seed: number;
  angle: number;
  wingOpen: number;
}

export interface GiftFlower {
  id: number;
  x: number;
  y: number;
  born: number;
  seed: number;
  radius: number;
}

export interface AtmosphericParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rot: number;
  vRot: number;
  seed: number;
}

export interface RenderBackend {
  fill(pts: Point[], col: string): void;
  stroke(pts: Point[], col: string, width: number): void;
  rect(x: number, y: number, w: number, h: number, col: string): void;
  text(ch: string, x: number, y: number, size: number, col: string, font: string): void;
  strokeRange(pts: Point[], a: number, b: number, col: string, width: number): void;
}
