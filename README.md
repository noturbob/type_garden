# Floratype — Living Generative Typography 🌿🌸

<div align="center">

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Render-HTML5%20Canvas%202D-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20Synthesizer-orange?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Frame Rate](https://img.shields.io/badge/FPS-60%20Solid%20(Zero--GC)-brightgreen?style=flat-square)](#performance--architecture)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<p align="center">
  <strong>An interactive creative studio where letterforms sprout living botanical ecosystems in real time as you type.</strong>
  <br />
  Climbing briar vines weave behind and across glyph strokes, petals drift on simulated wind currents, and flowers bloom along letter contours at a steady 60 FPS.
</p>

</div>

---

## 📸 Visual Showcase

### Default Studio View — English Briar Rose & Ivy
![Default Studio View](docs/screenshots/hero.png)

---

### Botanical Species & Curated Palettes

| Kyoto Sakura *(Notched petals & drifting blossom drift)* | Neon Bioluminescence *(Cybernetic electric spores)* |
|:---:|:---:|
| ![Kyoto Sakura](docs/screenshots/sakura.png) | ![Neon Bioluminescence](docs/screenshots/bioluminecence.png) |

| Imperial Ginkgo *(Art Nouveau golden fan leaves)* | Wild Rose & Ivy *(Paper Vintage editorial)* |
|:---:|:---:|
| ![Imperial Ginkgo](docs/screenshots/ginkgo.png) | ![Wild Rose & Ivy](docs/screenshots/wildrose.png) |

---

## ✨ Highlights & Capabilities

- 🌿 **Procedural Living Botany**: Organic climbing vines, thorns, and leaves sprout and propagate character-to-character as you type. Stems bridge seamlessly across sequential letters on the same word.
- 🔤 **Uncompromised Typographic Legibility**: Flowers are calculated to anchor strictly along outer perimeter contours, ensuring strokes and counters remain 100% visible and unoccluded. Stems weave organically between background (`layer 0`) and foreground (`layer 1`).
- ⚡ **Zero-Heap 60 FPS Pipeline**: Built from the ground up without per-frame array or object allocations. Curve computations use inline scalar arithmetic and in-place midpoint evaluation, eliminating garbage-collection stutter.
- 📐 **Dynamic Multi-Line Wrapping & Scale Optimization**: Long sentences automatically wrap across multiple lines with a binary-searched font scale fitter and proportional em-width spacing that adjusts smoothly without jumping.
- 🌸 **5 Distinct Botanical Species**:
  1. **Wild Rose & Ivy**: Layered briar rosettes, serrated leaves, climbing ivy, and thorns.
  2. **Kyoto Sakura**: Five-notched cherry petals, radial stamens, and detached petal drifts.
  3. **Neon Bioluminescence**: Electric radial tendrils, glowing spore clusters, and cybernetic flora.
  4. **Imperial Ginkgo**: Art Nouveau golden fan leaves with delicate radiating veins.
  5. **Zen Lotus**: Multi-tiered water lily petals with broad floating pads.
- 🎨 **10 Curated Luxury Themes**: Dark gallery aesthetics ranging from *Rose Noir*, *Kyoto Sakura*, *Cyberpunk Neon*, and *Zen Lotus* to *Imperial Gold & Jade*, *Paper Vintage*, and *Editorial Monochrome*.
- 🎵 **Interactive Web Audio Synthesizer**: Native Web Audio API soundscape with microtonal kalimba chimes tuned to keystroke position, lush flourish chords on word breaks, and foliage rustles on deletion.
- 🦋 **Interactive Garden Fauna**: Double-click anywhere on the canvas to cultivate independent gift blossoms that attract animated pollinator butterflies with wing-flap physics.
- 💾 **Studio-Grade Export Suite**:
  - **PNG**: Crisp raster snapshot rendered at native device pixel ratio.
  - **SVG**: Pure vector paths for print, Illustrator, or Figma without quality loss.
  - **Video (WebM/MP4)**: Lossless in-browser recording of live bloom growth at 60 FPS.

---

## ⌨️ Interactive Controls

| Input | Action |
|---|---|
| **Any Character** (`A–Z`, `0–9`, punctuation) | Types glyph, sprouts climbing vines, and triggers kalimba chime |
| **Spacebar** | Completes current word, sprouts terminal flourish roses, and branches new vine stem |
| **Backspace** | Withers most recent character and its attached flora with organic dissolution physics |
| **Enter** | Clears garden with a collective withering sweep |
| **Double-Click Canvas** | Plants an independent bloom that flowers in place and attracts butterflies |
| **Mouse Move** | Interactive wind & magnetic petal tilt toward cursor proximity |

---

## 🛠️ Architecture & Performance

```
src/
├── components/
│   ├── GardenCanvas.tsx    # Multi-line binary search layout, event bus & 60 FPS render loop
│   └── Toolbar.tsx         # Minimalist floating glassmorphism control dock
├── engine/
│   ├── botany.ts           # Procedural vine generation, species geometries, leaf & petal math
│   ├── renderer.ts         # Allocation-free CanvasBackend & lossless SvgBackend
│   ├── math.ts             # Mulberry32 PRNG, cubic Bézier sampling, spring damping
│   ├── audio.ts            # Web Audio API pentatonic kalimba & chime synthesizer
│   └── palettes.ts         # Species specifications, color schemes, and style presets
├── types.ts                # Strict TypeScript models for all botanical elements
└── index.css               # Gallery framing, responsive layouts & glassmorphism styling
```

### Zero-Allocation Canvas Engine
Standard canvas implementations generate hundreds of temporary coordinate tuples `[x, y]` per frame when smoothing cubic curves. This engine executes Bézier segment slicing and quadratic spline rendering directly on flat numeric buffers, achieving zero runtime heap pressure and fluid frame rates even on low-power devices.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm**, **pnpm**, or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/floratype.git

# 2. Enter project directory
cd floratype

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Visit `http://localhost:5174` in your browser.

### Production Build

```bash
# Type check and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📦 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Graphics**: HTML5 2D Canvas + SVG Vector Export
- **Audio**: Native Web Audio API (Subtractive FM/Karplus-Strong chime synthesizer)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: Curated editorial serifs via Google Fonts (*Playfair Display*, *Cormorant Garamond*, *Cinzel*, *Italiana*, *Syne*)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
