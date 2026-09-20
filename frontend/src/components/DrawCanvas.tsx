import { useEffect, useRef } from "react";

interface Props {
  brushSize: number;
  onChange: (hasInk: boolean, dataUrl: string | null) => void;
  clearSignal: number;
  undoSignal: number;
}

export default function DrawCanvas({ brushSize, onChange, clearSignal, undoSignal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<string[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Khởi tạo nền giấy trắng + lưới mờ
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 480;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    ctx.scale(dpr, dpr);
    paintPaper(ctx, size);
    historyRef.current = [];
    onChangeRef.current(false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xóa toàn bộ khi nhận signal
  useEffect(() => {
    if (clearSignal === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    paintPaper(ctx, 480);
    historyRef.current = [];
    onChangeRef.current(false, null);
  }, [clearSignal]);

  // Hoàn tác 1 nét
  useEffect(() => {
    if (undoSignal === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    historyRef.current.pop();
    paintPaper(ctx, 480);
    const last = historyRef.current[historyRef.current.length - 1];
    if (last) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 480, 480);
        onChangeRef.current(true, canvas.toDataURL("image/png"));
      };
      img.src = last;
    } else {
      onChangeRef.current(false, null);
    }
  }, [undoSignal]);

  function paintPaper(ctx: CanvasRenderingContext2D, size: number) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    // lưới mờ hỗ trợ căn chữ
    ctx.strokeStyle = "rgba(26,26,46,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(26,26,46,0.16)";
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 480,
      y: ((e.clientY - rect.top) / rect.height) * 480,
    };
  }

  function snapshot() {
    const canvas = canvasRef.current!;
    historyRef.current.push(canvas.toDataURL("image/png"));
    if (historyRef.current.length > 30) historyRef.current.shift();
  }

  return (
    <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drawingRef.current = true;
          lastRef.current = pos(e);
          snapshot();
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#1a1a2e";
            ctx.lineWidth = brushSize;
            ctx.beginPath();
            ctx.moveTo(lastRef.current!.x, lastRef.current!.y);
            ctx.lineTo(lastRef.current!.x + 0.1, lastRef.current!.y + 0.1);
            ctx.stroke();
          }
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const p = pos(e);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#1a1a2e";
          ctx.lineWidth = brushSize;
          ctx.beginPath();
          ctx.moveTo(lastRef.current?.x ?? p.x, lastRef.current?.y ?? p.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          lastRef.current = p;
        }}
        onPointerUp={() => {
          drawingRef.current = false;
          lastRef.current = null;
          const url = canvasRef.current?.toDataURL("image/png") ?? null;
          onChangeRef.current(true, url);
        }}
        onPointerLeave={() => {
          if (drawingRef.current) {
            drawingRef.current = false;
            const url = canvasRef.current?.toDataURL("image/png") ?? null;
            onChangeRef.current(true, url);
          }
        }}
      />
      <p className="canvas-hint">Vẽ 1 chữ Kanji duy nhất, căn giữa khung hình</p>
    </div>
  );
}
