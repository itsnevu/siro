import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() { return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000", color: "#c6f432", fontFamily: "monospace", fontWeight: 900, fontSize: 42, border: "4px solid #c6f432" }}>V</div>, size); }
