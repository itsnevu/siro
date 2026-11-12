"use client";

import { useState } from "react";
import { StatusTag } from "./ProductShell";

const isHex32 = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value.trim());
export function Verifier() {
  const [root, setRoot] = useState(""); const [leaf, setLeaf] = useState(""); const [checked, setChecked] = useState(false);
  const valid = isHex32(root) && isHex32(leaf);
  return <section className="vp-content"><form className="vp-form" onSubmit={(event) => { event.preventDefault(); setChecked(true); }}><label htmlFor="root">Onchain root (bytes32)</label><input id="root" value={root} onChange={(event) => { setRoot(event.target.value); setChecked(false); }} placeholder="0x…" /><label htmlFor="leaf">Decision leaf (bytes32)</label><input id="leaf" value={leaf} onChange={(event) => { setLeaf(event.target.value); setChecked(false); }} placeholder="0x…" /><button className="btn-primary" type="submit">Validate input</button></form>{checked && <div className="vp-note" style={{ margin: "28px 0 0", maxWidth: 760 }}><StatusTag tone={valid ? "lime" : "red"}>{valid ? "Valid shape" : "Invalid"}</StatusTag><p>{valid ? "Both values are canonical bytes32. Add the proof path and deployed DecisionLog address to perform an onchain verification." : "Root and leaf must each be 0x followed by exactly 64 hexadecimal characters."}</p></div>}</section>;
}
