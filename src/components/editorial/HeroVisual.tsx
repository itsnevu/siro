/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import "@/styles/hero-depth.css";

const SPRING = { stiffness: 65, damping: 20, mass: 0.8 };

/** The existing Siro composition, with depth and restrained independent motion. */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.08 });
  const [reduced, setReduced] = useState(true);
  const [finePointer, setFinePointer] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const tiltX = useSpring(0, SPRING);
  const tiltY = useSpring(0, SPRING);
  const firstX = useTransform(tiltY, [-7, 7], [-7, 7]);
  const firstY = useTransform(tiltX, [-6, 6], [4, -4]);
  const secondX = useTransform(tiltY, [-7, 7], [5, -5]);
  const secondY = useTransform(tiltX, [-6, 6], [-3, 3]);
  const moving = visible && !reduced && pageVisible;

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(motionPreference.matches);
    const updatePointer = () => setFinePointer(media.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    updatePointer();
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updatePointer);
    motionPreference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updatePointer);
      motionPreference.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!moving || !finePointer) { tiltX.set(0); tiltY.set(0); }
  }, [moving, finePointer, tiltX, tiltY]);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!moving || !finePointer || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5));
    tiltY.set(x * 14);
    tiltX.set(y * -12);
  }

  return <div ref={ref} className="ed-hero-visual ed-hero-depth" data-moving={moving ? "true" : "false"} aria-label="Illustration of Siro trade review notifications" onPointerMove={onPointerMove} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
    <div className="ed-visual-grid" />
    <span className="ed-visual-label mono-meta">INTELLIGENCE, WITH INTENTION.</span>
    <div className="ed-orbit ed-orbit-one" /><div className="ed-orbit ed-orbit-two" />
    <div className="ed-depth-shadow" aria-hidden="true" />
    <div className="ed-sculpture-anchor"><div className="ed-sculpture-float">
      <motion.div className="ed-brand-sculpture" style={{ rotate: -12, rotateX: tiltX, rotateY: tiltY }}>
        <img src="/brand/mark?palette=ascendlaunch" alt="Siro" width="230" height="230" draggable={false} />
        <span className="ed-sculpture-sheen" aria-hidden="true" />
      </motion.div>
    </div></div>
    <motion.div className="ed-notification ed-notification-one" style={{ rotate: -4, x: firstX, y: firstY }}><span className="ed-notification-icon">↗</span><div><strong>A clearer next move</strong><span>Proposal ready for your review</span></div><span className="ed-notification-dot" /></motion.div>
    <motion.div className="ed-notification ed-notification-two" style={{ rotate: 4, x: secondX, y: secondY }}><span className="ed-notification-icon">✓</span><div><strong>Your boundaries come first</strong><span>Policy check passed · illustrative</span></div></motion.div>
    <span className="ed-visual-caption mono-meta">BUILT AROUND YOU, BY DESIGN.</span>
    <span className="ed-visual-index mono-meta">SIRO / 001</span>
  </div>;
}
