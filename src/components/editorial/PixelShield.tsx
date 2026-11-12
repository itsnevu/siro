"use client";

import { useEffect, useRef } from "react";

type Props = { className?: string; label?: string };

const COLS = 43;
const ROWS = 49;

/** True when grid cell (col,row) is part of the shield, with the keyhole cut out. */
function inShield(col: number, row: number): boolean {
  const x = ((col + 0.5) / COLS) * 2 - 1;
  const y = (row + 0.5) / ROWS;
  const half = y < 0.42 ? 0.94 : 0.94 * Math.sqrt(Math.max(0, 1 - ((y - 0.42) / 0.58) ** 2));
  if (Math.abs(x) > half || y < 0.03) return false;
  const inHead = x * x * 1.3 + (y - 0.36) ** 2 * 4.2 < 0.03;
  const stemHalf = 0.05 + (y - 0.4) * 0.3;
  const inStem = y > 0.4 && y < 0.64 && Math.abs(x) < stemHalf;
  return !(inHead || inStem);
}

function cssColor(name: string, fallback: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(${name}, ${fallback})`;
  document.body.appendChild(probe);
  const match = getComputedStyle(probe).color.match(/[\d.]+/g);
  probe.remove();
  return match ? [Number(match[0]), Number(match[1]), Number(match[2])] : [143, 227, 176];
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * Dot-matrix shield with a keyhole, drawn on canvas from a generated bitmap mask.
 * Colours come from the site palette. Pixels flicker gently and scatter from the pointer.
 * With prefers-reduced-motion it renders once and stays still.
 */
export function PixelShield({ className = "", label = "Guarded vault shield" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = cssColor("--light-fg", "#F4F2EE");
    const accent = cssColor("--mint", "#8FE3B0");
    const deep = cssColor("--dark-bg", "#0A0B12");
    const cells: { c: number; r: number; seed: number; dx: number; dy: number }[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (inShield(c, r)) cells.push({ c, r, seed: Math.random() * 6.28, dx: 0, dy: 0 });

    let width = 0, height = 0, frame = 0, visible = true;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const draw = (time: number) => {
      const cell = Math.min(width / COLS, height / ROWS);
      const size = Math.max(1.5, cell * 0.72);
      const ox = (width - cell * COLS) / 2, oy = (height - cell * ROWS) / 2;
      const t = time / 1000;
      ctx.clearRect(0, 0, width, height);
      for (const p of cells) {
        const bx = ox + p.c * cell, by = oy + p.r * cell;
        const dist = Math.hypot(bx - pointer.x, by - pointer.y);
        const push = reduced ? 0 : Math.max(0, 1 - dist / (cell * 9));
        const tx = push ? ((bx - pointer.x) / (dist || 1)) * push * cell * 2.4 : 0;
        const ty = push ? ((by - pointer.y) / (dist || 1)) * push * cell * 2.4 : 0;
        p.dx += (tx - p.dx) * 0.14; p.dy += (ty - p.dy) * 0.14;
        const g = Math.min(1, (p.c / COLS) * 0.45 + (p.r / ROWS) * 0.75);
        const rgb = g < 0.5 ? mix(light, accent, g * 2) : mix(accent, deep, (g - 0.5) * 1.5);
        const flicker = reduced ? 1 : 0.82 + 0.18 * Math.sin(t * 1.7 + p.seed);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${flicker})`;
        ctx.fillRect(bx + p.dx, by + p.dy, size, size);
      }
      if (!reduced && visible) frame = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => { const b = canvas.getBoundingClientRect(); pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };
    const resizeObserver = new ResizeObserver(() => { resize(); if (reduced) draw(0); });
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible && !reduced) frame = requestAnimationFrame(draw);
    });
    resizeObserver.observe(canvas); viewObserver.observe(canvas);
    canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerleave", onLeave);
    resize(); draw(0);
    return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); viewObserver.disconnect(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave); };
  }, []);

  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
