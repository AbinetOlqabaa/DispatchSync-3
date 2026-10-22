import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signatureDataUrl: string | null) => void;
  signerName?: string;
  initialSignature?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  signerName = 'Receiving Supervisor',
  initialSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = '#38bdf8'; // Sky blue ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  const generatePresetSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearSignature();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;

    // Draw stylized signature waveform
    ctx.beginPath();
    ctx.moveTo(30, 70);
    ctx.bezierCurveTo(60, 20, 90, 110, 130, 45);
    ctx.bezierCurveTo(160, 30, 180, 80, 220, 55);
    ctx.bezierCurveTo(240, 90, 270, 70, 310, 60);
    ctx.stroke();

    // Flourish line
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(320, 90);
    ctx.stroke();

    setHasDrawn(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-sky-400" />
          <span>Receiver Digital Dock Sign-off (Canvas Capture)</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generatePresetSignature}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
          >
            Quick Sign
          </button>
          <button
            type="button"
            onClick={clearSignature}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="relative border-2 border-dashed border-slate-700 bg-slate-950/80 rounded-xl overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-28 cursor-crosshair block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500 text-xs gap-1">
            <PenTool className="w-5 h-5 opacity-40 text-slate-400" />
            <span>Sign with finger, stylus, or cursor on glass</span>
          </div>
        )}

        <div className="absolute bottom-1 right-2 text-[10px] text-slate-500 flex items-center gap-1 pointer-events-none">
          <ShieldCheck className="w-3 h-3 text-teal-500" />
          <span>Legally binding digital acceptance</span>
        </div>
      </div>

      {hasDrawn && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Signature recorded & ready to lock into manifest record</span>
        </div>
      )}
    </div>
  );
};
