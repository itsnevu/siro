"use client";

import { useEffect, useRef } from "react";

type PixelIconProps = { className?: string; animated?: boolean; label?: string };

export function PixelIcon({ className = "", animated = true, label = "VAULTA guarded vault" }: PixelIconProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    const draw = (time: number) => {
      const unit = Math.max(4, Math.floor(Math.min(width, height) / 38));
      const t = reduced || !animated ? 0 : (time - start) / 1000;
      const bob = Math.sin(t * 1.4) * unit * 0.55;
      context.clearRect(0, 0, width, height);
      context.save(); context.translate(Math.round(width / 2), Math.round(height / 2 + bob));
      const shieldW = unit * 22; const shieldH = unit * 26;
      context.shadowColor = "rgba(198, 244, 50, 0.25)"; context.shadowBlur = unit * (4 + Math.sin(t * 1.8)); context.fillStyle = "#c6f432";
      context.beginPath(); context.moveTo(-shieldW / 2, -shieldH / 2 + unit * 3); context.lineTo(0, -shieldH / 2); context.lineTo(shieldW / 2, -shieldH / 2 + unit * 3); context.lineTo(shieldW / 2 - unit, shieldH / 2 - unit * 6); context.lineTo(unit * 7, shieldH / 2 - unit * 2); context.lineTo(0, shieldH / 2); context.lineTo(-unit * 7, shieldH / 2 - unit * 2); context.lineTo(-shieldW / 2 + unit, shieldH / 2 - unit * 6); context.closePath(); context.fill();
      context.shadowBlur = 0; context.fillStyle = "#000000"; context.fillRect(-unit * 2, -unit * 2, unit * 4, unit * 8); context.fillRect(-unit * 3, -unit * 4, unit * 6, unit * 4); context.fillStyle = "#c6f432"; context.fillRect(-unit, -unit * 2, unit * 2, unit * 2);
      context.globalAlpha = 0.28; context.strokeStyle = "#c6f432"; context.lineWidth = 1;
      for (let ring = 0; ring < 3; ring += 1) { const radius = shieldW * (0.72 + ring * 0.17) + Math.sin(t * 1.2 + ring) * unit; context.strokeRect(-radius / 2, -radius / 2, radius, radius); }
      context.restore(); if (!reduced && animated) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => { resize(); draw(performance.now()); });
    observer.observe(canvas); resize(); draw(start);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [animated]);

  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
