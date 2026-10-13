import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  LetterItem,
  Palette,
  Butterfly,
  GiftFlower,
  StemElement,
  RoseElement,
  LeafElement,
  BotanicalSpecies,
  AspectRatio,
  AtmosphericParticle,
} from '../types';
import { BotanyEngine } from '../engine/botany';
import { CanvasBackend, SvgBackend } from '../engine/renderer';
import { easeOutCubic, springEase } from '../engine/math';
import { soundEngine } from '../engine/audio';

export interface GardenCanvasHandle {
  exportPng: () => string;
  exportSvg: () => string;
  startVideoRecording: (durationMs: number, onComplete: (blob: Blob) => void) => void;
  clearGarden: () => void;
  resetText: (text: string) => void;
}

interface GardenCanvasProps {
  palette: Palette;
  species: BotanicalSpecies;
  fontFamily: string;
  aspectRatio: AspectRatio;
  preset: string;
  onLetterCountChange?: (count: number) => void;
}

export const GardenCanvas = forwardRef<GardenCanvasHandle, GardenCanvasProps>(
  ({ palette, species, fontFamily, aspectRatio, preset, onLetterCountChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const lettersRef = useRef<LetterItem[]>([]);
    const butterfliesRef = useRef<Butterfly[]>([]);
    const giftsRef = useRef<GiftFlower[]>([]);
    const particlesRef = useRef<AtmosphericParticle[]>([]);
    const mousePosRef = useRef<[number, number] | null>(null);
    const uidRef = useRef(1);

    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);

    // Font metrics cache
    const charWidthCache = useRef<{ [key: string]: number }>({});
    const scaleRef = useRef({ current: 80, target: 80 });
    const cursorRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const wrappedStateRef = useRef(false);

    // Measure character width with proportional space handling and cache
    const measureChar = useCallback(
      (ch: string, ctx: CanvasRenderingContext2D): number => {
        const cacheKey = `${fontFamily}_${ch}`;
        if (charWidthCache.current[cacheKey] != null) return charWidthCache.current[cacheKey];
        ctx.font = `700 100px ${fontFamily}`;
        if (ch === ' ') {
          // Proportionally balanced space width relative to font 'M'
          const mWidth = ctx.measureText('M').width / 100;
          const spWidth = Math.max(0.34, mWidth * 0.4);
          charWidthCache.current[cacheKey] = spWidth;
          return spWidth;
        }
        let w = ctx.measureText(ch).width / 100;
        if (!w || w <= 0) w = 0.55;
        charWidthCache.current[cacheKey] = w;
        return w;
      },
      [fontFamily]
    );

    // Layout calculation with multi-line word wrapping and vertical centering
    const computeLayout = useCallback(
      (snap = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        if (!W || !H) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const letters = lettersRef.current.filter((l) => !l.dead);
        if (letters.length === 0) {
          cursorRef.current.targetX = W / 2;
          cursorRef.current.targetY = H / 2;
          return;
        }

        const ws = letters.map((l) => measureChar(l.ch, ctx));
        const words: { isSpace: boolean; indices: number[] }[] = [];
        let currentWord: { isSpace: boolean; indices: number[] } | null = null;

        letters.forEach((l, idx) => {
          if (l.ch === ' ') {
            if (currentWord) words.push(currentWord);
            currentWord = null;
            words.push({ isSpace: true, indices: [idx] });
          } else {
            if (!currentWord) currentWord = { isSpace: false, indices: [] };
            currentWord.indices.push(idx);
          }
        });
        if (currentWord) words.push(currentWord);

        const maxW = W * 0.78;
        const S0 = Math.min(H * 0.22, 105);
        const LH = 1.95;

        const calcLineW = (lineIndices: number[], scale: number) => {
          let end = lineIndices.length;
          while (end > 0 && letters[lineIndices[end - 1]].ch === ' ') end--;
          let total = 0;
          for (let k = 0; k < end; k++) total += ws[lineIndices[k]];
          return total * scale;
        };

        const wrapLinesAtScale = (scale: number): number[][] => {
          const lines: number[][] = [[]];
          let currentLineWidth = 0;

          for (const word of words) {
            const wordWidth = word.indices.reduce((sum, idx) => sum + ws[idx], 0) * scale;
            if (!word.isSpace && currentLineWidth > 0 && currentLineWidth + wordWidth > maxW) {
              lines.push([]);
              currentLineWidth = 0;
            }
            lines[lines.length - 1].push(...word.indices);
            currentLineWidth += wordWidth;
          }
          return lines;
        };

        let lines = [letters.map((_, i) => i)];
        const singleLineUnitW = calcLineW(lines[0], 1);
        let S = singleLineUnitW > 0 ? Math.min(S0, maxW / singleLineUnitW) : S0;

        const realWordsCount = words.filter((w) => !w.isSpace).length;
        let shouldWrap = realWordsCount > 1 && (S < H * 0.11 || (wrappedStateRef.current && S < H * 0.15));

        if (shouldWrap) {
          let lo = H * 0.04;
          let hi = Math.min(H * 0.16, S0);
          for (let k = 0; k < 20; k++) {
            const mid = (lo + hi) / 2;
            const testLines = wrapLinesAtScale(mid);
            const fitsHorizontally = testLines.every((li) => calcLineW(li, mid) <= maxW);
            const fitsVertically = testLines.length * LH * mid <= H * 0.82;
            if (fitsHorizontally && fitsVertically) {
              lo = mid;
            } else {
              hi = mid;
            }
          }
          S = lo;
          lines = wrapLinesAtScale(S);
          if (lines.length < 2) shouldWrap = false;
        }

        wrappedStateRef.current = shouldWrap;
        scaleRef.current.target = S;

        const numLines = lines.length;
        const lineHeightPx = LH * S;

        lines.forEach((lineIndices, lineIdx) => {
          const linePixelWidth = calcLineW(lineIndices, S);
          let startX = W / 2 - linePixelWidth / 2;
          const baselineY = H / 2 + (lineIdx - (numLines - 1) / 2) * lineHeightPx + 0.32 * S;

          lineIndices.forEach((letterIdx) => {
            const l = letters[letterIdx];
            const w = ws[letterIdx] * S;
            l.tx = startX + w / 2;
            l.ty = baselineY;
            l.tw = w;
            l.line = lineIdx;
            l.relX = (startX + w / 2 - W / 2) / S;

            if (snap || l.x === 0) {
              l.x = l.tx;
              l.y = l.ty;
            }
            startX += w;
          });
        });

        const lastLetter = letters[letters.length - 1];
        if (lastLetter) {
          cursorRef.current.targetX = lastLetter.tx + lastLetter.tw / 2 + 0.08 * S;
          cursorRef.current.targetY = lastLetter.ty - 0.32 * S;
        }

        if (snap) {
          scaleRef.current.current = S;
          cursorRef.current.x = cursorRef.current.targetX;
          cursorRef.current.y = cursorRef.current.targetY;
        }
      },
      [measureChar]
    );

    // Watch for font changes and reload metrics
    useEffect(() => {
      charWidthCache.current = {};
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.load(`700 100px ${fontFamily}`).then(() => {
          charWidthCache.current = {};
          computeLayout(true);
        }).catch(() => {
          computeLayout(true);
        });
      } else {
        computeLayout(true);
      }
    }, [fontFamily, computeLayout]);

    // Add character to streaming garden
    const addCharacter = useCallback(
      (ch: string) => {
        const now = performance.now();
        const active = lettersRef.current.filter((l) => !l.dead);
        const last = active[active.length - 1];
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const charW = ctx ? measureChar(ch, ctx) : 0.55;
        const currentS = scaleRef.current.current;

        // Spacebar cuts stem and sprouts terminal blooms
        if (ch === ' ') {
          soundEngine.playFlourish();
          if (last && last.ch !== ' ') {
            last.cut = now;
            BotanyEngine.generateWordEndBlooms(last, now - last.birth);
          }
          const initX = last ? last.x + (last.tw / 2 + (charW * currentS) / 2) : 0;
          const initY = last ? last.y : 0;

          const spaceItem: LetterItem = {
            id: uidRef.current++,
            ch: ' ',
            birth: now,
            dead: null,
            ws: 0,
            wi: 0,
            els: [],
            tx: initX,
            ty: initY,
            tw: charW * currentS,
            x: initX,
            y: initY,
            line: last ? last.line : 0,
            relX: 0,
          };
          lettersRef.current.push(spaceItem);
          computeLayout();
          onLetterCountChange?.(lettersRef.current.length);
          return;
        }

        soundEngine.playTypingChime(lettersRef.current.length);

        const isSameWord = last && last.ch !== ' ';
        const wordSeed = isSameWord ? last.ws : Math.floor(Math.random() * 1e9);
        const wordIndex = isSameWord ? last.wi + 1 : 0;

        // Position new letter precisely adjacent to the last letter
        const initX = last ? last.x + (last.tw / 2 + (charW * currentS) / 2) : 0;
        const initY = last ? last.y : 0;

        const letterItem: LetterItem = {
          id: uidRef.current++,
          ch,
          birth: now,
          dead: null,
          tb: now,
          ws: wordSeed,
          wi: wordIndex,
          prev: isSameWord ? last : null,
          els: [],
          tx: initX,
          ty: initY,
          tw: charW * currentS,
          x: initX,
          y: initY,
          line: last ? last.line : 0,
          relX: 0,
        };

        BotanyEngine.generateLetterStreaming(letterItem, charW);
        lettersRef.current.push(letterItem);

        computeLayout();
        onLetterCountChange?.(lettersRef.current.length);
      },
      [computeLayout, measureChar, onLetterCountChange]
    );

    // Backspace withering animation
    const handleBackspace = useCallback(() => {
      const now = performance.now();
      const active = lettersRef.current.filter((l) => !l.dead);
      const last = active[active.length - 1];
      if (!last) return;

      soundEngine.playWither();
      last.dead = now;
      const prev = active[active.length - 2];
      if (prev && prev.ch !== ' ') {
        prev.cut = null;
        prev.endEls = null;
        prev.tb = now;
      }

      computeLayout();
      onLetterCountChange?.(active.length - 1);
    }, [computeLayout, onLetterCountChange]);

    // Populate full text
    const populateText = useCallback(
      (text: string) => {
        lettersRef.current = [];
        const now = performance.now();
        let prev: LetterItem | null = null;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === ' ') {
            const sp: LetterItem = {
              id: uidRef.current++,
              ch: ' ',
              birth: now - (text.length - i) * 80,
              dead: null,
              ws: 0,
              wi: 0,
              els: [],
              tx: 0,
              ty: 0,
              tw: 0,
              x: 0,
              y: 0,
              line: 0,
              relX: 0,
            };
            lettersRef.current.push(sp);
            prev = sp;
            continue;
          }

          const isSame = prev !== null && prev.ch !== ' ';
          const ws = isSame && prev ? prev.ws : Math.floor(Math.random() * 1e9);
          const wi = isSame && prev ? prev.wi + 1 : 0;
          const letterItem: LetterItem = {
            id: uidRef.current++,
            ch,
            birth: now - (text.length - i) * 80,
            dead: null,
            ws,
            wi,
            prev: isSame ? prev : null,
            els: [],
            tx: 0,
            ty: 0,
            tw: 0,
            x: 0,
            y: 0,
            line: 0,
            relX: 0,
          };

          const charW = ctx ? measureChar(ch, ctx) : 0.55;
          BotanyEngine.generateLetterStreaming(letterItem, charW);
          lettersRef.current.push(letterItem);
          prev = letterItem;
        }

        computeLayout(true);
        onLetterCountChange?.(lettersRef.current.length);
      },
      [computeLayout, measureChar, onLetterCountChange]
    );

    // Plant flower on double click
    const plantFlower = useCallback((clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      soundEngine.playFlourish();
      giftsRef.current.push({
        id: Math.random(),
        x,
        y,
        born: performance.now(),
        seed: Math.random() * 1000,
        radius: scaleRef.current.current * 0.26,
      });
    }, []);

    // Expose export handles
    useImperativeHandle(ref, () => ({
      exportPng: () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL('image/png', 1.0) : '';
      },
      exportSvg: () => {
        const canvas = canvasRef.current;
        if (!canvas) return '';
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const svgBackend = new SvgBackend(w, h);
        svgBackend.rect(0, 0, w, h, palette.bg);
        renderGardenFrame(svgBackend, performance.now(), w, h);
        return svgBackend.toSvgString();
      },
      startVideoRecording: (durationMs: number, onComplete: (blob: Blob) => void) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsRecording(true);
        const stream = canvas.captureStream(60);
        const chunks: Blob[] = [];

        const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
          ? 'video/mp4;codecs=avc1'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          setIsRecording(false);
          onComplete(new Blob(chunks, { type: mime }));
        };
        recorder.start();
        recorderRef.current = recorder;

        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, durationMs);
      },
      clearGarden: () => {
        const now = performance.now();
        soundEngine.playWither();
        lettersRef.current.forEach((l) => {
          if (!l.dead) l.dead = now;
        });
        butterfliesRef.current = [];
        giftsRef.current = [];
        onLetterCountChange?.(0);
      },
      resetText: (text: string) => {
        populateText(text);
      },
    }));

    // Initial load
    useEffect(() => {
      populateText('Type Garden');
    }, [populateText]);

    // Keyboard capture
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const now = performance.now();
          lettersRef.current.forEach((l) => {
            if (!l.dead) l.dead = now;
          });
          onLetterCountChange?.(0);
        } else if (e.key.length === 1) {
          e.preventDefault();
          addCharacter(e.key);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [addCharacter, handleBackspace, onLetterCountChange]);

    // Mouse pointer listener
    useEffect(() => {
      const onPointerMove = (e: PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mousePosRef.current = [e.clientX - rect.left, e.clientY - rect.top];
      };

      const onPointerLeave = () => {
        mousePosRef.current = null;
      };

      let lastClick = 0;
      const onPointerDown = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastClick < 320) {
          plantFlower(e.clientX, e.clientY);
          lastClick = 0;
        } else {
          lastClick = now;
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerleave', onPointerLeave);
      window.addEventListener('pointerdown', onPointerDown);

      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerleave', onPointerLeave);
        window.removeEventListener('pointerdown', onPointerDown);
      };
    }, [plantFlower]);

    // Render pass
    const renderGardenFrame = useCallback(
      (backend: CanvasBackend | SvgBackend, now: number, _w: number, _h: number) => {
        const S = scaleRef.current.current;
        const letters = lettersRef.current;
        const mouse = mousePosRef.current;
        const activeLetters = letters.filter((l) => !l.dead);

        let wind = 0;
        if (preset === 'Gust') {
          wind = Math.sin(now * 0.003) * 0.09;
        } else if (preset === 'Breathe') {
          wind = Math.sin(now * 0.0016) * 0.035;
        }

        const perchPoints: { id: number; x: number; y: number; r: number }[] = [];

        const calcTilt = (cx: number, cy: number): [number, number] => {
          if (!mouse) return [0, 0];
          const dx = mouse[0] - cx;
          const dy = mouse[1] - cy;
          const dist = Math.hypot(dx, dy);
          if (dist > 280 || dist < 1) return [0, 0];
          const w = (1 - dist / 280) * 0.55;
          return [(dx / dist) * w, (dy / dist) * w];
        };

        const drawStemElement = (
          stem: StemElement,
          letter: LetterItem,
          age: number,
          witherK: number,
          targetLayer: number,
          overrideFr?: number
        ) => {
          const progress =
            overrideFr != null
              ? overrideFr
              : easeOutCubic(Math.max(0, (age - stem.d0) / stem.dur)) * witherK;
          if (progress <= 0) return;

          const Spx = S;
          const stemWidth = Math.max(1.2, Spx * 0.024 * stem.w * witherK);

          for (let sIdx = 0; sIdx < stem.segs.length; sIdx++) {
            const seg = stem.segs[sIdx];
            if (seg.layer !== targetLayer) continue;

            const segEnd = Math.min(seg.u1, progress);
            if (segEnd <= seg.u0) continue;

            const curve: [number, number][] = [];
            for (let pIdx = 0; pIdx < stem.pts.length; pIdx++) {
              const pt = stem.pts[pIdx];
              curve.push([letter.x + pt[0] * Spx, letter.y + pt[1] * Spx]);
            }

            backend.strokeRange(curve, seg.u0, segEnd, palette.stem, stemWidth);
          }
        };

        const drawLeafElement = (
          leaf: LeafElement,
          letter: LetterItem,
          age: number,
          witherK: number
        ) => {
          const leafAge = age - leaf.d0;
          if (leafAge <= 0) return;
          const scale = springEase(leafAge / 600, 7, 14) * witherK;
          if (scale <= 0.01) return;

          const lx = letter.x + leaf.x * S;
          const ly = letter.y + leaf.y * S;
          BotanyEngine.drawLeaf(
            backend,
            palette,
            species,
            lx,
            ly,
            leaf.a + wind,
            leaf.L * S,
            leaf.bend,
            scale
          );
        };

        const drawRoseElement = (
          rose: RoseElement,
          letter: LetterItem,
          age: number,
          witherK: number
        ) => {
          const roseAge = age - rose.d0;
          if (roseAge <= 0 || witherK <= 0.01) return;
          const bloom = Math.min(1, roseAge / 420) * witherK;
          if (bloom <= 0.01) return;

          const rx = letter.x + rose.x * S;
          const ry = letter.y + rose.y * S;
          const rRadius = rose.R * S * witherK;
          const tilt = calcTilt(rx, ry);

          BotanyEngine.drawFlower(
            backend,
            palette,
            species,
            rx,
            ry,
            rRadius,
            rose.rot + wind,
            rose.turns,
            rose.ph1,
            rose.ph2,
            bloom,
            tilt
          );

          if (bloom > 0.6) {
            perchPoints.push({ id: rose.id, x: rx, y: ry, r: rRadius });
          }
        };

        // LAYER 0: BACKGROUND
        for (let i = 0; i < letters.length; i++) {
          const l = letters[i];
          if (l.ch === ' ') continue;

          const age = now - l.birth;
          const witherK = l.dead ? Math.max(0, 1 - (now - l.dead) / 280) : 1;
          if (witherK <= 0) continue;

          const allElements = [...l.els, ...(l.endEls || [])];
          for (let eIdx = 0; eIdx < allElements.length; eIdx++) {
            const el = allElements[eIdx];
            if (el.t === 'stem') {
              drawStemElement(el, l, age, witherK, 0);
            } else if (el.t === 'leaf' && el.layer === 0) {
              drawLeafElement(el, l, age, witherK);
            } else if (el.t === 'rose') {
              drawRoseElement(el, l, age, witherK);
            }
          }

          const letterIdx = activeLetters.indexOf(l);
          const nextLetter = letterIdx >= 0 ? activeLetters[letterIdx + 1] : null;
          if (l.tend && (!nextLetter || nextLetter.ch === ' ' || l.dead)) {
            const tendrilProgress = easeOutCubic(Math.max(0, (now - (l.tb || l.birth) - 100) / 400));
            for (let tIdx = 0; tIdx < l.tend.length; tIdx++) {
              drawStemElement(l.tend[tIdx], l, age, witherK, 0, tendrilProgress * witherK);
            }
          }
        }

        // TYPOGRAPHY PASS: 100% UNBLOCKED & LEGIBLE
        for (let i = 0; i < letters.length; i++) {
          const l = letters[i];
          if (l.ch === ' ') continue;
          const witherK = l.dead ? Math.max(0, 1 - (now - l.dead) / 280) : 1;
          if (witherK <= 0) continue;

          backend.text(l.ch, l.x, l.y, S * witherK, palette.text, fontFamily);
        }

        // LAYER 1: FOREGROUND (ONLY VINES & THORNS WEAVING OVER LETTERS)
        for (let i = 0; i < letters.length; i++) {
          const l = letters[i];
          if (l.ch === ' ') continue;

          const age = now - l.birth;
          const witherK = l.dead ? Math.max(0, 1 - (now - l.dead) / 280) : 1;
          if (witherK <= 0) continue;

          const allElements = [...l.els, ...(l.endEls || [])];
          for (let eIdx = 0; eIdx < allElements.length; eIdx++) {
            const el = allElements[eIdx];
            if (el.t === 'stem') {
              drawStemElement(el, l, age, witherK, 1);
            } else if (el.t === 'leaf' && el.layer === 1) {
              drawLeafElement(el, l, age, witherK);
            }
          }

          const letterIdx = activeLetters.indexOf(l);
          const nextLetter = letterIdx >= 0 ? activeLetters[letterIdx + 1] : null;
          if (l.tend && (!nextLetter || nextLetter.ch === ' ' || l.dead)) {
            const tendrilProgress = easeOutCubic(Math.max(0, (now - (l.tb || l.birth) - 100) / 400));
            for (let tIdx = 0; tIdx < l.tend.length; tIdx++) {
              drawStemElement(l.tend[tIdx], l, age, witherK, 1, tendrilProgress * witherK);
            }
          }
        }

        // Render gift flowers
        for (let gIdx = 0; gIdx < giftsRef.current.length; gIdx++) {
          const gift = giftsRef.current[gIdx];
          const bloom = Math.min(1, (now - gift.born) / 400);
          const tilt = calcTilt(gift.x, gift.y);
          BotanyEngine.drawFlower(
            backend,
            palette,
            species,
            gift.x,
            gift.y,
            gift.radius,
            0,
            1.5,
            gift.seed,
            gift.seed * 1.5,
            bloom,
            tilt
          );
        }

        // Butterflies
        butterfliesRef.current = BotanyEngine.updateButterflies(
          butterfliesRef.current,
          perchPoints,
          16,
          now,
          _w,
          _h
        );
        for (let bIdx = 0; bIdx < butterfliesRef.current.length; bIdx++) {
          const bf = butterfliesRef.current[bIdx];
          BotanyEngine.drawButterfly(
            backend,
            palette,
            bf.x,
            bf.y,
            bf.size,
            bf.angle,
            bf.wingOpen
          );
        }
      },
      [palette, species, fontFamily, preset]
    );

    // Main 60 FPS animation loop with aspect ratio support & particle drift
    useEffect(() => {
      let animId: number;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const handleResize = () => {
        const dpr = window.devicePixelRatio || 1;
        const containerRect = container.getBoundingClientRect();
        let targetW = containerRect.width;
        let targetH = containerRect.height;

        if (aspectRatio === '1:1') {
          const minDim = Math.min(targetW * 0.88, targetH * 0.88);
          targetW = minDim;
          targetH = minDim;
        } else if (aspectRatio === '4:5') {
          const maxH = targetH * 0.88;
          targetH = maxH;
          targetW = maxH * 0.8;
          if (targetW > containerRect.width * 0.88) {
            targetW = containerRect.width * 0.88;
            targetH = targetW * 1.25;
          }
        } else if (aspectRatio === '9:16') {
          const maxH = targetH * 0.9;
          targetH = maxH;
          targetW = maxH * (9 / 16);
        }

        canvas.width = Math.round(targetW * dpr);
        canvas.height = Math.round(targetH * dpr);
        canvas.style.width = `${Math.round(targetW)}px`;
        canvas.style.height = `${Math.round(targetH)}px`;

        if (particlesRef.current.length === 0) {
          particlesRef.current = BotanyEngine.createAtmosphericParticles(28, targetW, targetH);
        }

        computeLayout(true);
      };

      handleResize();
      window.addEventListener('resize', handleResize);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;
      const canvasBackend = new CanvasBackend(ctx);

      let lastTime = performance.now();

      const loop = (now: number) => {
        const dt = Math.min(32, now - lastTime);
        lastTime = now;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        const k = 1 - Math.exp(-dt / 80);
        scaleRef.current.current += (scaleRef.current.target - scaleRef.current.current) * k;
        cursorRef.current.x += (cursorRef.current.targetX - cursorRef.current.x) * k;
        cursorRef.current.y += (cursorRef.current.targetY - cursorRef.current.y) * k;

        const letters = lettersRef.current;
        for (let i = 0; i < letters.length; i++) {
          const l = letters[i];
          if (!l.dead && l.tx != null) {
            l.x += (l.tx - l.x) * k;
            l.y += (l.ty - l.y) * k;
          }
        }

        lettersRef.current = lettersRef.current.filter((l) => !l.dead || now - l.dead < 280);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, w, h);

        // Atmospheric drifting petals / glowing spores
        BotanyEngine.updateAtmosphericParticles(particlesRef.current, w, h, Math.sin(now * 0.002) * 0.05);
        BotanyEngine.drawAtmosphericParticles(ctx, particlesRef.current, palette, species);

        renderGardenFrame(canvasBackend, now, w, h);

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
      };
    }, [palette, species, aspectRatio, computeLayout, renderGardenFrame]);

    return (
      <div
        ref={containerRef}
        className={`canvas-stage-wrapper ${aspectRatio !== 'fullscreen' ? 'framed-poster' : ''}`}
        onClick={() => inputRef.current?.focus({ preventScroll: true })}
      >
        <div className="canvas-frame">
          <canvas ref={canvasRef} className="garden-canvas" />
        </div>

        <input
          ref={inputRef}
          type="text"
          className="hidden-keyboard-input"
          autoFocus
          aria-label="Type your words into the garden"
        />

        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot" /> Recording Video Loop...
          </div>
        )}
      </div>
    );
  }
);
GardenCanvas.displayName = 'GardenCanvas';
