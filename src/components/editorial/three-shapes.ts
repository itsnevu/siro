import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Rounded slab lying on y=0, footprint w×d centred on the origin.
export function slabGeometry(w: number, d: number, h: number, r: number, bevel: number) {
  const extruded = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, r - bevel), {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 20,
  });
  extruded.rotateX(-Math.PI / 2);
  extruded.translate(0, bevel, 0);
  // Extrude normals are faceted; merging and recomputing gives a smooth machined edge.
  extruded.deleteAttribute("normal");
  extruded.deleteAttribute("uv");
  const geometry = mergeVertices(extruded, 1e-4);
  geometry.computeVertexNormals();
  extruded.dispose();
  return geometry;
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function tintedMark(img: HTMLImageElement, color: string, background?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round((512 * img.naturalHeight) / img.naturalWidth);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (background) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}
