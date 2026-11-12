"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { loadImage, slabGeometry, tintedMark } from "./three-shapes";
import siroMark from "@/assets/siro-original.png";

const C = { purple: "#A597FF", pink: "#EEB2CB", peach: "#F3CDB0", ink: "#1B1620" };

const WALLET_W = 2.6;
const WALLET_H = 1.8;
const WALLET_D = 0.42;
const SLOT: [number, number, number] = [0, 0.55, 0];
const COIN_R = 0.26;
const CYCLE = 5.2;

// Each coin rides its own arc from off-screen into the wallet's top slot.
const PATHS = [
  [[-7, 1.4, 1.2], [-3.8, 2.6, 0.8], [-1.2, 2.3, 0.4]],
  [[7, 0.2, 1.4], [3.6, 2.4, 0.9], [1.1, 2.2, 0.3]],
  [[-7, -1.2, 0.8], [-3.4, 1.4, 1.2], [-0.8, 2.5, 0.3]],
  [[7, -1.6, 0.6], [3.9, 1.0, 1.1], [0.9, 2.4, 0.4]],
  [[-6.8, 0.2, -0.4], [-3.2, 2.8, 0.2], [-0.4, 2.3, 0.2]],
  [[6.8, 1.6, -0.2], [3.0, 2.9, 0.4], [0.5, 2.3, 0.2]],
] as const;

function coinFaceTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#c4b9ff");
  grad.addColorStop(1, "#7f6ff0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#2a2160";
  ctx.font = `700 140px "Instrument Sans", ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", size / 2, size / 2 + 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Pointer = RefObject<{ x: number; y: number }>;

function WalletModel({ active, reduced, pointer }: { active: boolean; reduced: boolean; pointer: Pointer }) {
  const groupRef = useRef<THREE.Group>(null);
  const walletRef = useRef<THREE.Group>(null);
  const coinRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pulse = useRef(0);
  const lastPhase = useRef<number[]>(PATHS.map(() => 0));
  const [logo, setLogo] = useState<{ texture: THREE.CanvasTexture; aspect: number } | null>(null);

  const parts = useMemo(() => {
    const body = slabGeometry(WALLET_W, WALLET_H, WALLET_D, 0.22, 0.05).rotateX(Math.PI / 2).translate(0, 0, -WALLET_D / 2);
    const flap = slabGeometry(0.95, 0.72, 0.12, 0.16, 0.03).rotateX(Math.PI / 2);
    const card = slabGeometry(2.2, 1.3, 0.03, 0.12, 0.01).rotateX(Math.PI / 2);
    const coin = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.07, 48).rotateX(Math.PI / 2);
    const face = coinFaceTexture();
    const edge = new THREE.MeshStandardMaterial({ color: "#8d7ef2", metalness: 0.85, roughness: 0.25 });
    const faceMat = new THREE.MeshStandardMaterial({ map: face, metalness: 0.55, roughness: 0.3 });
    const curves = PATHS.map((p) => new THREE.CatmullRomCurve3([...p.map(([x, y, z]) => new THREE.Vector3(x, y * 0.55, z)),new THREE.Vector3(...SLOT)]));
    return { body, flap, card, coin, coinMaterials: [edge, faceMat, faceMat], curves };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadImage(siroMark.src).then((img) => {
      if (cancelled || !img) return;
      const alpha = tintedMark(img, "#fff", "#000");
      setLogo({ texture: new THREE.CanvasTexture(alpha), aspect: alpha.width / alpha.height });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    parts.curves.forEach((curve, i) => {
      const coin = coinRefs.current[i];
      if (!coin) return;
      const phase = reduced ? 0.25 + i * 0.1 : ((t / CYCLE + i / PATHS.length) % 1);
      if (!reduced && phase < lastPhase.current[i]) pulse.current = 1;
      lastPhase.current[i] = phase;
      const eased = 1 - Math.pow(1 - phase, 2);
      coin.position.copy(curve.getPoint(eased));
      coin.rotation.set(0.35, t * 3 + i, 0.2);
      // Shrink into the slot over the last stretch, and fade in from off-screen.
      coin.scale.setScalar(THREE.MathUtils.clamp((1 - phase) / 0.12, 0, 1) * THREE.MathUtils.clamp(phase / 0.08, 0, 1));
    });

    pulse.current = Math.max(0, pulse.current - dt * 3);
    walletRef.current?.scale.setScalar(1 + Math.sin(pulse.current * Math.PI) * 0.04);

    if (groupRef.current && active) {
      const p = pointer.current;
      const yaw = reduced ? -0.25 : -0.25 + p.x * 0.25 + Math.sin(t * 0.4) * 0.05;
      const pitch = reduced ? 0.08 : 0.08 + p.y * -0.08;
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, yaw, 3, dt);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, pitch, 3, dt);
      groupRef.current.position.y = reduced ? 0 : Math.sin(t * 0.9) * 0.06;
    }
  });

  return (
    <>
      <group ref={groupRef} rotation={[0.08, -0.25, 0]}>
        <group ref={walletRef} position={[0, -0.25, 0]}>
          <mesh geometry={parts.card} position={[-0.12, 0.42, -0.08]} rotation={[0, 0, 0.06]}>
            <meshStandardMaterial color={C.purple} metalness={0.2} roughness={0.35} />
          </mesh>
          <mesh geometry={parts.card} position={[0.1, 0.32, 0.06]} rotation={[0, 0, -0.04]}>
            <meshStandardMaterial color={C.pink} metalness={0.2} roughness={0.35} />
          </mesh>
          <mesh geometry={parts.body}>
            <meshStandardMaterial color="#3a3a62" metalness={0.45} roughness={0.32} />
          </mesh>
          <mesh geometry={parts.flap} position={[WALLET_W / 2 - 0.42, 0.05, WALLET_D / 2 + 0.06]}>
            <meshStandardMaterial color="#4a4a78" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[WALLET_W / 2 - 0.42, 0.05, WALLET_D / 2 + 0.135]}>
            <torusGeometry args={[0.07, 0.022, 16, 40]} />
            <meshStandardMaterial color={C.purple} metalness={0.9} roughness={0.2} emissive={C.purple} emissiveIntensity={0.35} />
          </mesh>
          {logo && (
            <mesh position={[-0.55, -0.05, WALLET_D / 2 + 0.002]}>
              <planeGeometry args={[0.6, 0.6 / logo.aspect]} />
              <meshStandardMaterial color={C.purple} emissive={C.purple} emissiveIntensity={0.6} metalness={0.5} roughness={0.3} alphaMap={logo.texture} transparent depthWrite={false} />
            </mesh>
          )}
        </group>
      </group>
      {parts.curves.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            coinRefs.current[i] = m;
          }}
          geometry={parts.coin}
          material={parts.coinMaterials}
        />
      ))}
    </>
  );
}

export function Wallet3D() {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
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
    <div ref={ref} className="ed-wallet3d" aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop={inView ? "always" : "never"}
        camera={{ position: [0, 0.7, 6.4], fov: 32, near: 0.5, far: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: "none" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.3} />
        <directionalLight position={[-5, 2, -2]} intensity={0.5} color={C.pink} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, 5]} scale={[10, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2.4} position={[-6, 2, 2]} scale={[1.5, 8, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.6} color={C.purple} position={[6, 1, 1]} scale={[3, 6, 1]} target={[0, 0, 0]} />
        </Environment>
        <WalletModel active={inView} reduced={reduced} pointer={pointer} />
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={8} blur={2.6} far={2} resolution={256} color="#000000" />
      </Canvas>
    </div>
  );
}
