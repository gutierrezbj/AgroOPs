"use client";

/**
 * AgroOps — SignaturePad (HU-15)
 *
 * Canvas vanilla para captura de firma. Sin dependencias externas (signature_pad,
 * react-signature-canvas) para mantener el bundle ligero y evitar problemas
 * de compatibilidad con SSR. Soporta mouse + touch.
 *
 * El componente expone la firma como PNG data URL (`canvas.toDataURL`) y la
 * inyecta en un hidden input dentro del form padre cuando el usuario pulsa
 * "Confirmar firma". Si no confirmó, el hidden input queda vacío y el
 * server-side schema rechaza con "Firma requerida".
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  /** Nombre del hidden input que llevará el PNG data URL al server. */
  name?: string;
}

const CANVAS_W = 480;
const CANVAS_H = 200;

export function SignaturePad({ name = "signatureImageBase64" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Setup context (línea negra, suave).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
    // Fondo blanco para que el PNG no salga transparente.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const c = canvasRef.current;
      if (!c) return { x: 0, y: 0 };
      const rect = c.getBoundingClientRect();
      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        if (!t) return { x: 0, y: 0 };
        return {
          x: ((t.clientX - rect.left) * c.width) / rect.width,
          y: ((t.clientY - rect.top) * c.height) / rect.height,
        };
      }
      return {
        x: ((e.clientX - rect.left) * c.width) / rect.width,
        y: ((e.clientY - rect.top) * c.height) / rect.height,
      };
    },
    [],
  );

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setConfirmed(false);
    setIsDrawing(true);
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
    setConfirmed(false);
    if (hiddenRef.current) hiddenRef.current.value = "";
  };

  const confirm = () => {
    const c = canvasRef.current;
    if (!c || !hasInk) return;
    const dataUrl = c.toDataURL("image/png");
    if (hiddenRef.current) hiddenRef.current.value = dataUrl;
    setConfirmed(true);
  };

  return (
    <div className="signature-pad" style={{ marginTop: "0.5rem" }}>
      <input ref={hiddenRef} type="hidden" name={name} defaultValue="" />
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        style={{
          width: "100%",
          maxWidth: `${CANVAS_W}px`,
          height: "auto",
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.25)",
          borderRadius: 4,
          touchAction: "none",
          cursor: "crosshair",
        }}
        aria-label="Pad de firma del agricultor"
      />
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          marginTop: "0.5rem",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={clear} disabled={!hasInk}>
          Limpiar
        </button>
        <button type="button" onClick={confirm} disabled={!hasInk}>
          {confirmed ? "✓ Firma confirmada" : "Confirmar firma"}
        </button>
        {confirmed && (
          <small style={{ color: "#166534" }}>
            La firma se enviará al guardar.
          </small>
        )}
      </div>
    </div>
  );
}
