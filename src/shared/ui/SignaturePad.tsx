import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

function posFromEvent(canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent) {
  const rect = canvas.getBoundingClientRect();
  const point = 'touches' in e ? e.touches[0] : e;
  if (!point) return { x: 0, y: 0 };
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1B2838';
  }, []);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const { x, y } = posFromEvent(canvas, e.nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = posFromEvent(canvas, e.nativeEvent);
    const ctx = canvas.getContext('2d');
    ctx?.lineTo(x, y);
    ctx?.stroke();
    setEmpty(false);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (!empty && canvasRef.current) onChange(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={440}
        height={170}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{ touchAction: 'none' }}
        className="w-full cursor-crosshair rounded-lg border-2 border-dashed border-line bg-white"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate">وقّع باستخدام الفأرة أو إصبعك</p>
        <Button variant="secondary" onClick={clear} disabled={empty}>
          مسح التوقيع
        </Button>
      </div>
    </div>
  );
}
