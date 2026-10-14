import { useState, useRef, FC } from 'react';
import { GardenCanvas, GardenCanvasHandle } from './components/GardenCanvas';
import { Toolbar } from './components/Toolbar';
import { PALETTES } from './engine/palettes';
import { Palette, BotanicalSpecies, AspectRatio } from './types';

export const App: FC = () => {
  const [currentPalette, setCurrentPalette] = useState<Palette>(PALETTES[0]);
  const [species, setSpecies] = useState<BotanicalSpecies>('wild-rose');
  const [fontFamily, setFontFamily] = useState<string>('"Playfair Display", Georgia, serif');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('fullscreen');
  const [preset, setPreset] = useState<string>('Breathe');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const canvasHandleRef = useRef<GardenCanvasHandle | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportPng = () => {
    if (!canvasHandleRef.current) return;
    const dataUrl = canvasHandleRef.current.exportPng();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `type-garden-${species}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('High-res poster exported successfully!');
  };

  const handleExportSvg = () => {
    if (!canvasHandleRef.current) return;
    const svgString = canvasHandleRef.current.exportSvg();
    if (!svgString) return;

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `type-garden-${species}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Vector SVG paths exported successfully!');
  };

  const handleExportVideo = () => {
    if (!canvasHandleRef.current) return;
    showToast('Recording 4-second animation loop...');

    canvasHandleRef.current.startVideoRecording(4000, (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      link.download = `type-garden-${species}-${Date.now()}.${ext}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Video recording downloaded!');
    });
  };

  return (
    <div className="app-root">
      <GardenCanvas
        ref={canvasHandleRef}
        palette={currentPalette}
        species={species}
        fontFamily={fontFamily}
        aspectRatio={aspectRatio}
        preset={preset}
        onFocusChange={setIsKeyboardOpen}
      />

      <Toolbar
        currentPalette={currentPalette}
        onSelectPalette={setCurrentPalette}
        species={species}
        onSelectSpecies={setSpecies}
        fontFamily={fontFamily}
        onSelectFont={setFontFamily}
        aspectRatio={aspectRatio}
        onSelectAspectRatio={setAspectRatio}
        preset={preset}
        onSelectPreset={setPreset}
        onClear={() => canvasHandleRef.current?.clearGarden()}
        onSetText={(text) => canvasHandleRef.current?.resetText(text)}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportVideo={handleExportVideo}
        isKeyboardOpen={isKeyboardOpen}
        onOpenKeyboard={() => canvasHandleRef.current?.focusInput()}
        onAddSpace={() => canvasHandleRef.current?.addCharacter(' ')}
        onBackspace={() => canvasHandleRef.current?.deleteCharacter()}
      />

      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
