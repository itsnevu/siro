"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { loadImage, roundedRect, slabGeometry, tintedMark } from "./three-shapes";
import siroMark from "@/assets/siro-original.png";

const C = {
  bg: "#0A0B12",
  card: "#10111A",
  surface: "#191B27",
  text: "#F4F2EE",
  muted: "rgba(244,242,238,0.58)",
  line: "rgba(255,255,255,0.07)",
  mint: "#8FE3B0",
  purple: "#A597FF",
  pink: "#EEB2CB",
  peach: "#F3CDB0",
  ink: "#1B1620",
  bezel: "#050508",
};
const SANS = '"Instrument Sans", ui-sans-serif, system-ui, sans-serif';
const SERIF = '"Hedvig Letters Serif", Georgia, serif';

const HOLDINGS = [
  { ticker: "AAPL", name: "Apple", color: C.purple },
  { ticker: "MSFT", name: "Microsoft", color: C.pink },
  { ticker: "GOOGL", name: "Alphabet", color: C.peach },
  { ticker: "AMZN", name: "Amazon", color: C.mint },
  { ticker: "NVDA", name: "NVIDIA", color: C.text },
];

const W = 3.2;
const D = 2.2;
const BASE_H = 0.1;
const LID_H = 0.055;
const CORNER = 0.16;
const HINGE_Y = BASE_H + 0.014;
const LID_CLOSED = Math.PI / 2;
const LID_OPEN = -0.24;
const RIM = 0.024;
const FACE_W = W - RIM * 2;
const FACE_H = D - RIM * 2;
const BASE_YAW = -0.3;

const U = 0.18;
const KB_W = 14.5 * U;
const KB_Z0 = -D / 2 + 0.12;
const KEY_GAP = 0.026;
const KEY_H = 0.012;
const TP_W = 1.55;
const TP_D = 0.82;
const TP_Z = D / 2 - 0.12 - TP_D / 2;

const OPEN_TOP = HINGE_Y + D * Math.cos(LID_OPEN);
const OPEN_BACK = -D / 2 - D * Math.sin(-LID_OPEN) - LID_H;
// Lifted slightly above the bbox centre: perspective makes the near front edge the first thing to clip.
const CENTER: [number, number, number] = [0, 0.12 - OPEN_TOP / 2, -(D / 2 + OPEN_BACK) / 2];

const TEX_W = 2048;
const TEX_H = Math.round((TEX_W * FACE_H) / FACE_W);
const DISPLAY = (() => {
  const px = TEX_W / FACE_W;
  const side = Math.round(0.07 * px);
  const chin = Math.round(0.13 * px);
  return { x: side, y: side, w: TEX_W - side * 2, h: TEX_H - side - chin };
})();

type TextOptions = { weight?: number; font?: string; align?: CanvasTextAlign; spacing?: number };

function drawApp(ctx: CanvasRenderingContext2D, mark: HTMLCanvasElement | null) {
  const text = (value: string, x: number, y: number, size: number, color: string, o: TextOptions = {}) => {
    ctx.font = `${o.weight ?? 400} ${size}px ${o.font ?? SANS}`;
    ctx.fillStyle = color;
    ctx.textAlign = o.align ?? "left";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${o.spacing ?? 0}px`;
    ctx.fillText(value, x, y);
  };
  const panel = (x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, 1000, 660);
  const glow = ctx.createRadialGradient(160, 40, 0, 160, 40, 560);
  glow.addColorStop(0, "rgba(165,151,255,0.14)");
  glow.addColorStop(1, "rgba(165,151,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1000, 660);

  text("siro.", 36, 34, 26, C.text, { font: SERIF });
  text("Agent Studio", 500, 34, 17, C.muted, { weight: 500, align: "center" });
  panel(818, 17, 146, 34, 17, "rgba(143,227,176,0.10)", "rgba(143,227,176,0.28)");
  text("● Paper mode", 891, 34.5, 15, C.mint, { weight: 500, align: "center" });
  ctx.fillStyle = C.line;
  ctx.fillRect(0, 64, 1000, 1);

  panel(36, 88, 368, 524, 16, C.card, C.line);
  text("STRATEGY", 60, 122, 13, C.muted, { weight: 600, spacing: 1.8 });
  text("Top 5 Tech", 60, 164, 46, C.text, { font: SERIF });
  text("Equal weight · Weekly rebalance", 60, 204, 16, C.muted);

  const cx = 220, cy = 340, r = 88, seg = (Math.PI * 2) / HOLDINGS.length, gap = 0.34;
  ctx.lineWidth = 24;
  ctx.strokeStyle = C.surface;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineCap = "round";
  HOLDINGS.forEach((h, i) => {
    const start = -Math.PI / 2 + i * seg + gap / 2;
    ctx.strokeStyle = h.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + seg - gap);
    ctx.stroke();
  });
  ctx.lineCap = "butt";
  if (mark) {
    const mw = 70, mh = (mw * mark.height) / mark.width;
    ctx.drawImage(mark, cx - mw / 2, cy - mh / 2, mw, mh);
  } else {
    text("5", cx, cy - 8, 44, C.text, { font: SERIF, align: "center" });
    text("assets", cx, cy + 26, 14, C.muted, { align: "center" });
  }
  text("Target allocation", cx, 474, 15, C.muted, { align: "center" });

  panel(60, 506, 156, 84, 12, "rgba(255,255,255,0.03)", C.line);
  text("Max per trade", 76, 532, 14, C.muted);
  text("5%", 76, 564, 24, C.text, { weight: 600 });
  panel(228, 506, 152, 84, 12, "rgba(255,255,255,0.03)", C.line);
  text("Max drawdown", 244, 532, 14, C.muted);
  text("10%", 244, 564, 24, C.text, { weight: 600 });

  const rx = 432, rw = 532;
  text("Allocation", rx, 108, 19, C.text, { weight: 600 });
  text("5 assets · 100%", rx + rw, 108, 15, C.muted, { align: "right" });
  const bw = (rw - 16) / HOLDINGS.length;
  HOLDINGS.forEach((h, i) => panel(rx + i * (bw + 4), 128, bw, 12, 6, h.color));
  HOLDINGS.forEach((h, i) => {
    const ry = 158 + i * 64;
    panel(rx, ry, rw, 56, 12, C.surface);
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.arc(rx + 24, ry + 28, 6, 0, Math.PI * 2);
    ctx.fill();
    text(h.ticker, rx + 44, ry + 28, 20, C.text, { weight: 600 });
    text(h.name, rx + 128, ry + 28, 16, C.muted);
    text("20%", rx + rw - 22, ry + 28, 20, h.color, { weight: 600, align: "right" });
  });

  panel(rx, 486, rw, 64, 12, "rgba(143,227,176,0.07)", "rgba(143,227,176,0.24)");
  ctx.fillStyle = "rgba(143,227,176,0.16)";
  ctx.beginPath();
  ctx.arc(rx + 30, 518, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.mint;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(rx + 23, 518);
  ctx.lineTo(rx + 28, 523);
  ctx.lineTo(rx + 37, 513);
  ctx.stroke();
  ctx.lineCap = "butt";
  text("All limits passed", rx + 58, 507, 17, C.mint, { weight: 600 });
  text("Checked against 5 vault rules before every trade", rx + 58, 530, 14, C.muted);

  text("Paper mode · No real funds", rx, 588, 14, C.muted);
  const grad = ctx.createLinearGradient(rx + rw - 196, 0, rx + rw, 0);
  grad.addColorStop(0, C.purple);
  grad.addColorStop(0.7, C.pink);
  grad.addColorStop(1, C.peach);
  panel(rx + rw - 196, 566, 196, 44, 22, grad);
  text("Deploy agent  →", rx + rw - 98, 588.5, 17, C.ink, { weight: 600, align: "center" });
}

function drawScreen(ctx: CanvasRenderingContext2D, mark: HTMLCanvasElement | null) {
  const { x, y, w, h } = DISPLAY;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bezel;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  ctx.font = `600 24px ${SANS}`;
  ctx.fillStyle = "rgba(244,242,238,0.3)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "1px";
  ctx.fillText("siro", TEX_W / 2, y + h + (TEX_H - y - h) / 2);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [22, 22, 10, 10]);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(w / 1000, w / 1000);
  drawApp(ctx, mark);
  ctx.restore();

  ctx.fillStyle = C.bezel;
  ctx.beginPath();
  ctx.roundRect(TEX_W / 2 - 86, y - 1, 172, 31, [0, 0, 14, 14]);
  ctx.fill();
  ctx.fillStyle = "#151726";
  ctx.beginPath();
  ctx.arc(TEX_W / 2, y + 13, 5.5, 0, Math.PI * 2);
  ctx.fill();
}

type Logo = { texture: THREE.CanvasTexture; aspect: number };

function useLaptopTextures() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const [logo, setLogo] = useState<Logo | null>(null);
  const screen = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d")!;
    drawScreen(ctx, null);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    return { ctx, texture };
  }, [gl]);

  useEffect(() => {
    let cancelled = false;
    const fonts = Promise.all([
      document.fonts.load(`400 20px ${SANS}`),
      document.fonts.load(`600 20px ${SANS}`),
      document.fonts.load(`400 20px ${SERIF}`),
    ]).catch(() => null);
    Promise.all([fonts, loadImage(siroMark.src)]).then(([, img]) => {
      if (cancelled) return;
      drawScreen(screen.ctx, img && tintedMark(img, C.text));
      screen.texture.needsUpdate = true;
      if (img) {
        const alpha = tintedMark(img, "#fff", "#000");
        setLogo({ texture: new THREE.CanvasTexture(alpha), aspect: alpha.width / alpha.height });
      }
      invalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [screen, invalidate]);

  return { screen: screen.texture, logo };
}

function flatRoundedRect(w: number, h: number, r: number) {
  const geometry = new THREE.ShapeGeometry(roundedRect(w, h, r), 16);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / w + 0.5, uv.getY(i) / h + 0.5);
  return geometry;
}

type KeyRect = { x: number; z: number; w: number; d: number };

function keyLayout(): KeyRect[] {
  const rows: [number, number[]][] = [
    [0.55, [1.5, ...Array(12).fill(1), 1]],
    [1, [...Array(13).fill(1), 1.5]],
    [1, [1.5, ...Array(12).fill(1), 1]],
    [1, [1.75, ...Array(11).fill(1), 1.75]],
    [1, [2.25, ...Array(10).fill(1), 2.25]],
    [1, [1, 1, 1, 1.25, 5, 1.25, 1]],
  ];
  const keys: KeyRect[] = [];
  let z = 0;
  for (const [d, widths] of rows) {
    let x = 0;
    for (const w of widths) {
      keys.push({ x, z, w, d });
      x += w;
    }
    z += d;
  }
  const last = z - 1;
  keys.push(
    { x: 11.5, z: last + 0.5, w: 1, d: 0.5 },
    { x: 12.5, z: last, w: 1, d: 0.5 },
    { x: 12.5, z: last + 0.5, w: 1, d: 0.5 },
    { x: 13.5, z: last + 0.5, w: 1, d: 0.5 },
  );
  return keys;
}

function createKeyboard(material: THREE.Material) {
  const keys = keyLayout();
  const mesh = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), material, keys.length);
  const slot = new THREE.Object3D();
  keys.forEach((k, i) => {
    slot.position.set(-KB_W / 2 + (k.x + k.w / 2) * U, BASE_H + KEY_H / 2 - 0.004, KB_Z0 + (k.z + k.d / 2) * U);
    slot.scale.set(k.w * U - KEY_GAP, KEY_H, k.d * U - KEY_GAP);
    slot.updateMatrix();
    mesh.setMatrixAt(i, slot.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

type Pointer = RefObject<{ x: number; y: number }>;

function LaptopModel({ open, reduced, pointer }: { open: boolean; reduced: boolean; pointer: Pointer }) {
  const floatRef = useRef<THREE.Group>(null);
  const poseRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const motion = useRef({ lid: 0, vel: 0, yaw: BASE_YAW, pitch: 0 });
  const { screen, logo } = useLaptopTextures();

  const parts = useMemo(() => {
    const aluminium = new THREE.MeshStandardMaterial({ color: "#c2bfca", metalness: 0.9, roughness: 0.3 });
    const lid = slabGeometry(W, D, LID_H, CORNER, 0.014);
    lid.rotateX(Math.PI / 2);
    lid.translate(0, D / 2, -LID_H);
    return {
      aluminium,
      base: slabGeometry(W, D, BASE_H, CORNER, 0.022),
      lid,
      face: flatRoundedRect(FACE_W, FACE_H, CORNER - RIM),
      keyboard: createKeyboard(new THREE.MeshStandardMaterial({ color: "#141419", metalness: 0.2, roughness: 0.62 })),
      trackpad: flatRoundedRect(TP_W, TP_D, 0.06).rotateX(-Math.PI / 2),
      trackpadSeam: flatRoundedRect(TP_W + 0.014, TP_D + 0.014, 0.067).rotateX(-Math.PI / 2),
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const m = motion.current;
    const target = open || reduced ? 1 : 0;
    if (reduced) {
      m.lid = target;
      m.vel = 0;
    } else {
      // Slightly under-damped spring: the lid settles with a small hinge bounce.
      m.vel += ((target - m.lid) * 26 - m.vel * 8.2) * dt;
      m.lid += m.vel * dt;
    }
    if (lidRef.current) lidRef.current.rotation.x = LID_CLOSED + (LID_OPEN - LID_CLOSED) * m.lid;

    const t = state.clock.elapsedTime;
    const p = pointer.current;
    const yaw = BASE_YAW + (reduced ? 0 : Math.sin(t * 0.35) * 0.04 + p.x * 0.18);
    const pitch = reduced ? 0 : p.y * -0.035;
    m.yaw = THREE.MathUtils.damp(m.yaw, yaw, 3, dt);
    m.pitch = THREE.MathUtils.damp(m.pitch, pitch, 3, dt);
    poseRef.current?.rotation.set(m.pitch, m.yaw, 0);
    if (floatRef.current) floatRef.current.position.y = reduced ? 0 : Math.sin(t * 0.9) * 0.035;
  });

  return (
    <group ref={floatRef}>
      <group ref={poseRef}>
        <group position={CENTER}>
          <mesh geometry={parts.base} material={parts.aluminium} />
          <primitive object={parts.keyboard} />
          <mesh geometry={parts.trackpadSeam} position={[0, BASE_H + 0.0006, TP_Z]}>
            <meshStandardMaterial color="#3b3944" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh geometry={parts.trackpad} position={[0, BASE_H + 0.0012, TP_Z]}>
            <meshStandardMaterial color="#b3b0bc" metalness={0.85} roughness={0.18} />
          </mesh>
          <mesh position={[0, HINGE_Y - 0.02, -D / 2 + 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, W * 0.8, 32]} />
            <meshStandardMaterial color="#1d1c22" metalness={0.5} roughness={0.45} />
          </mesh>

          <group ref={lidRef} position={[0, HINGE_Y, -D / 2]} rotation={[LID_CLOSED, 0, 0]}>
            <mesh geometry={parts.lid} material={parts.aluminium} />
            <mesh geometry={parts.face} position={[0, D / 2, 0.0012]}>
              <meshStandardMaterial
                color="#000000"
                emissive="#ffffff"
                emissiveMap={screen}
                roughness={0.16}
                metalness={0}
                envMapIntensity={0.6}
                toneMapped={false}
              />
            </mesh>
            {logo && (
              <mesh position={[0, D / 2 + 0.06, -LID_H - 0.0012]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[0.5, 0.5 / logo.aspect]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={0.4}
                  metalness={0.6}
                  roughness={0.25}
                  alphaMap={logo.texture}
                  transparent
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

function Scene(props: { open: boolean; reduced: boolean; pointer: Pointer }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <directionalLight position={[-5, 3, -2]} intensity={0.35} color={C.purple} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 5]} scale={[10, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} position={[-6, 2, 2]} scale={[1.5, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} position={[6, 1.5, -1]} scale={[3, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} position={[0, 4, -7]} scale={[12, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color={C.purple} position={[3, -2, 4]} scale={[4, 1, 1]} target={[0, 0, 0]} />
      </Environment>
      <LaptopModel {...props} />
      <ContactShadows position={[0, CENTER[1] - 0.05, 0]} opacity={0.6} scale={8} blur={2.4} far={2} resolution={512} color="#000000" />
    </>
  );
}

export function Laptop3D() {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.intersectionRatio >= 0.4) setOpen(true);
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      pointer.current.x = THREE.MathUtils.clamp((e.clientX - r.left - r.width / 2) / (window.innerWidth / 2), -1, 1);
      pointer.current.y = THREE.MathUtils.clamp((e.clientY - r.top - r.height / 2) / (window.innerHeight / 2), -1, 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="ed-laptop3d"
      role="img"
      aria-label="Siro Agent Studio on a laptop: the Top 5 Tech strategy holding Apple, Microsoft, Alphabet, Amazon and NVIDIA at 20% each, with all vault limits passed."
    >
      <Canvas
        dpr={[1, 2]}
        frameloop={inView ? "always" : "never"}
        camera={{ position: [0, 1.95, 7.25], fov: 30, near: 0.5, far: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none" }}
      >
        <Scene open={open} reduced={reduced} pointer={pointer} />
      </Canvas>
    </div>
  );
}
