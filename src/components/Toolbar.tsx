import { useState, FC } from 'react';
import { Palette, BotanicalSpecies, AspectRatio } from '../types';
import { PALETTES, SPECIES_CONFIGS } from '../engine/palettes';
import { soundEngine } from '../engine/audio';
import {
  Sparkles,
  Download,
  Video,
  FileCode,
  RotateCcw,
  Palette as PaletteIcon,
  Wind,
  Flower2,
  Type,
  LayoutTemplate,
  Volume2,
  VolumeX,
  Keyboard,
} from 'lucide-react';

interface ToolbarProps {
  currentPalette: Palette;
  onSelectPalette: (pal: Palette) => void;
  species: BotanicalSpecies;
  onSelectSpecies: (species: BotanicalSpecies) => void;
  fontFamily: string;
  onSelectFont: (font: string) => void;
  aspectRatio: AspectRatio;
  onSelectAspectRatio: (ratio: AspectRatio) => void;
  preset: string;
  onSelectPreset: (preset: string) => void;
  onClear: () => void;
  onSetText: (text: string) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportVideo: () => void;
}

const FONTS = [
  { label: 'Playfair Display', value: '"Playfair Display", Georgia, serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, serif' },
  { label: 'Cinzel Classical', value: '"Cinzel", serif' },
  { label: 'Italiana Haute', value: '"Italiana", serif' },
  { label: 'Syne Modernist', value: '"Syne", sans-serif' },
];

const RATIOS: { id: AspectRatio; label: string }[] = [
  { id: 'fullscreen', label: 'Screen' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Poster' },
  { id: '9:16', label: '9:16 Story' },
];

const PRESETS = ['Breathe', 'Gust', 'Still'];
const PHRASES = [
  'in bloom',
  'cherry blossom',
  'wildflower',
  'bioluminescent',
  'flora & fauna',
  'ginkgo biloba',
];

export const Toolbar: FC<ToolbarProps> = ({
  currentPalette,
  onSelectPalette,
  species,
  onSelectSpecies,
  fontFamily,
  onSelectFont,
  aspectRatio,
  onSelectAspectRatio,
  preset,
  onSelectPreset,
  onClear,
  onSetText,
  onExportPng,
  onExportSvg,
  onExportVideo,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);
  const [showTips, setShowTips] = useState(false);

  const toggleTab = (tab: string) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  const handleToggleSound = () => {
    const isNowOn = soundEngine.toggleSound();
    setSoundEnabled(isNowOn);
  };

  return (
    <div className="modern-studio-ui">
      {/* Interaction Tips Modal */}
      {showTips && (
        <div className="studio-modal-backdrop" onClick={() => setShowTips(false)}>
          <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-tag">STUDIO SHORTCUTS</span>
              <button className="modal-close-btn" onClick={() => setShowTips(false)}>✕</button>
            </div>
            <div className="shortcuts-grid">
              <div className="shortcut-row">
                <kbd>Type Letters</kbd>
                <span>Generates real-time procedural stems, buds & leaves</span>
              </div>
              <div className="shortcut-row">
                <kbd>Spacebar</kbd>
                <span>Cuts word and sprouts flourished terminal blooms</span>
              </div>
              <div className="shortcut-row">
                <kbd>Backspace</kbd>
                <span>Decays and withers stems gracefully before deletion</span>
              </div>
              <div className="shortcut-row">
                <kbd>Pointer Hover</kbd>
                <span>Flower heads track and orient toward your cursor</span>
              </div>
              <div className="shortcut-row">
                <kbd>Double Click</kbd>
                <span>Plants a wild blooming flower at cursor position</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Center Inspiration Pills */}
      <div className="studio-top-dock">
        <div className="pill-scroll">
          {PHRASES.map((phrase) => (
            <button
              key={phrase}
              className="editorial-pill"
              onClick={() => onSetText(phrase)}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Dock */}
      <nav className="studio-bottom-dock">
        <div className="dock-pill">
          {/* Species selector */}
          <div className="dock-item">
            <button
              className={`dock-btn ${activeTab === 'species' ? 'active' : ''}`}
              onClick={() => toggleTab('species')}
              title="Botanical Species"
            >
              <Flower2 size={17} />
              <span className="dock-label">Flora</span>
            </button>

            {activeTab === 'species' && (
              <div className="studio-popover species-popover">
                <div className="popover-title">Botanical Flora Species</div>
                <div className="species-list">
                  {SPECIES_CONFIGS.map((sp) => (
                    <button
                      key={sp.id}
                      className={`species-card ${species === sp.id ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectSpecies(sp.id);
                        onSelectPalette(PALETTES[sp.defaultPalette]);
                        setActiveTab(null);
                      }}
                    >
                      <div className="species-header">
                        <span className="sp-name">{sp.label}</span>
                        {species === sp.id && <span className="sp-badge">Active</span>}
                      </div>
                      <div className="sp-desc">{sp.sublabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Palette selector */}
          <div className="dock-item">
            <button
              className={`dock-btn ${activeTab === 'palette' ? 'active' : ''}`}
              onClick={() => toggleTab('palette')}
              title="Color Palette"
            >
              <PaletteIcon size={17} />
              <span className="dock-label">Color</span>
            </button>

            {activeTab === 'palette' && (
              <div className="studio-popover palette-popover">
                <div className="popover-title">Editorial Color Palettes</div>
                <div className="palette-grid">
                  {PALETTES.map((pal) => (
                    <button
                      key={pal.name}
                      className={`pal-item ${pal.name === currentPalette.name ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectPalette(pal);
                        setActiveTab(null);
                      }}
                    >
                      <div className="swatch-strip">
                        <span style={{ background: pal.bg }} />
                        <span style={{ background: pal.flower }} />
                        <span style={{ background: pal.stem }} />
                        <span style={{ background: pal.text }} />
                      </div>
                      <span className="pal-label">{pal.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Typography selector */}
          <div className="dock-item">
            <button
              className={`dock-btn ${activeTab === 'font' ? 'active' : ''}`}
              onClick={() => toggleTab('font')}
              title="Typography"
            >
              <Type size={17} />
              <span className="dock-label">Type</span>
            </button>

            {activeTab === 'font' && (
              <div className="studio-popover font-popover">
                <div className="popover-title">Typography & Typeface</div>
                <div className="font-list">
                  {FONTS.map((f) => (
                    <button
                      key={f.label}
                      className={`font-row ${fontFamily === f.value ? 'selected' : ''}`}
                      style={{ fontFamily: f.value }}
                      onClick={() => {
                        onSelectFont(f.value);
                        setActiveTab(null);
                      }}
                    >
                      <span>{f.label}</span>
                      <span className="font-preview-abc">Aa</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ratio / Framing */}
          <div className="dock-item">
            <button
              className={`dock-btn ${activeTab === 'ratio' ? 'active' : ''}`}
              onClick={() => toggleTab('ratio')}
              title="Poster Frame & Canvas Ratio"
            >
              <LayoutTemplate size={17} />
              <span className="dock-label">Frame</span>
            </button>

            {activeTab === 'ratio' && (
              <div className="studio-popover ratio-popover">
                <div className="popover-title">Canvas Frame Ratio</div>
                <div className="ratio-grid">
                  {RATIOS.map((r) => (
                    <button
                      key={r.id}
                      className={`ratio-btn ${aspectRatio === r.id ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectAspectRatio(r.id);
                        setActiveTab(null);
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preset / Motion */}
          <div className="dock-item">
            <button
              className={`dock-btn ${activeTab === 'preset' ? 'active' : ''}`}
              onClick={() => toggleTab('preset')}
              title="Motion & Ambient Presets"
            >
              <Wind size={17} />
              <span className="dock-label">{preset}</span>
            </button>

            {activeTab === 'preset' && (
              <div className="studio-popover preset-popover">
                <div className="popover-title">Ambient Motion</div>
                <div className="preset-list">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      className={`preset-row ${preset === p ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectPreset(p);
                        setActiveTab(null);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="dock-divider" />

          {/* Sound Synthesizer toggle */}
          <button
            className={`dock-btn icon-only ${soundEnabled ? 'active-glow' : ''}`}
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Kalimba & Chimes'}
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          {/* Shortcuts guide */}
          <button
            className="dock-btn icon-only"
            onClick={() => setShowTips(!showTips)}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={17} />
          </button>

          {/* Clear */}
          <button className="dock-btn icon-only" onClick={onClear} title="Clear Canvas">
            <RotateCcw size={17} />
          </button>

          {/* Export Studio */}
          <div className="dock-item">
            <button
              className="dock-btn export-cta"
              onClick={() => toggleTab('export')}
              title="Export Artwork"
            >
              <Download size={16} />
              <span>Export</span>
            </button>

            {activeTab === 'export' && (
              <div className="studio-popover export-popover">
                <div className="popover-title">Export Artwork</div>
                <button
                  className="export-opt"
                  onClick={() => {
                    onExportPng();
                    setActiveTab(null);
                  }}
                >
                  <Sparkles size={16} />
                  <div>
                    <div className="opt-title">PNG Artwork</div>
                    <div className="opt-sub">High-resolution poster rendering</div>
                  </div>
                </button>

                <button
                  className="export-opt"
                  onClick={() => {
                    onExportSvg();
                    setActiveTab(null);
                  }}
                >
                  <FileCode size={16} />
                  <div>
                    <div className="opt-title">Vector SVG</div>
                    <div className="opt-sub">Infinite lossless vector paths</div>
                  </div>
                </button>

                <button
                  className="export-opt"
                  onClick={() => {
                    onExportVideo();
                    setActiveTab(null);
                  }}
                >
                  <Video size={16} />
                  <div>
                    <div className="opt-title">Animated Video</div>
                    <div className="opt-sub">4-second seamless video loop</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};
