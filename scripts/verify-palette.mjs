import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";

const tokens = new Map();
const css = postcss.parse(readFileSync("src/styles/tokens.css", "utf8"));
css.walkRules(":root", rule => rule.walkDecls(d => tokens.set(d.prop, d.value)));
const expected = { bg:"#0A0B12", surface:"#191B27", "surface-glass":"rgba(255,255,255,0.04)", border:"rgba(236,228,216,0.12)", text:"#F4F2EE", "text-muted":"rgba(244,242,238,0.72)", "text-subtle":"rgba(244,242,238,0.56)", "text-dim":"rgba(244,243,241,0.46)", "text-on-light":"#1B1620", "accent-mint":"#8FE3B0", "accent-mint-soft":"#A9E9C4", "brand-purple":"#A597FF", "brand-pink":"#EEB2CB", "brand-peach":"#F3CDB0", "light-top":"#FDFBF8", "light-bottom":"#EFEBE6", "light-cream":"#E9E1D6" };
for (const [name, value] of Object.entries(expected)) assert.equal(tokens.get(`--${name}`), value, `Target color --${name}`);
function resolve(value, seen = []) {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    assert(!seen.includes(name), `Cyclic token ${name}`);
    assert(tokens.has(name), `Missing token ${name}`);
    return resolve(tokens.get(name), [...seen, name]);
  });
}
for (const value of tokens.values()) resolve(value);
assert.equal(resolve("var(--gradient-brand)"), "linear-gradient(90deg, #A597FF 0%, #EEB2CB 70%, #F3CDB0 100%)", "Brand gradient stops");
assert.equal(resolve("var(--light-surface)"), "linear-gradient(180deg, #FDFBF8 0%, #EFEBE6 100%)", "Light surface stops");
for (const alias of ["primary", "secondary", "mint", "lime", "sage", "rusd-primary", "rusd-primary-hover", "chart-1", "chart-2", "allocation-1", "allocation-2", "allocation-3", "allocation-4"]) {
  assert(!resolve(`var(--${alias})`).includes("#8FE3B0") && !resolve(`var(--${alias})`).includes("#A9E9C4"), `Decorative alias --${alias} still leaks mint`);
}
assert.equal(resolve("var(--success)"), "#8FE3B0", "Mint remains reserved for positive status");
css.walkRules(rule => {
  if (rule.selector === ":root") return;
  rule.walkDecls(d => { if (tokens.has(d.prop)) assert.equal(resolve(d.value), resolve(tokens.get(d.prop)), `Unexpected theme override: ${d.prop}`); });
});
function color(value) {
  value = resolve(value);
  const mix = value.match(/^color-mix\(in srgb,(rgba\([^)]*\)) (\d+)%,(#[\da-f]+)\)$/i);
  if (mix) {
    const a = color(mix[1]), b = color(mix[3]), weight = Number(mix[2]) / 100;
    const alpha = a[3] * weight + (1 - weight);
    return [...b.map((v, i) => (a[i] * a[3] * weight + v * (1 - weight)) / alpha), alpha];
  }
  if (value.startsWith("#")) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
  assert(value.startsWith("rgba("), `Unsupported contrast color: ${value}`);
  return value.match(/[\d.]+/g).map(Number);
}
function luminance(rgb) {
  return rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
}
function contrast(fg, bg) {
  const a = fg[3] ?? 1;
  const x = luminance(fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a))), y = luminance(bg);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
let minimum = Infinity;
for (const background of ["bg", "surface"]) {
  const base = color(`var(--${background})`), glass = color("var(--surface-glass)");
  const input = glass.slice(0, 3).map((v, i) => v * glass[3] + base[i] * (1 - glass[3]));
  for (const backdrop of [base, input]) for (const foreground of ["text", "text-muted", "text-subtle", "placeholder", "accent-mint", "accent-mint-soft", "brand-purple", "danger", "warning"]) {
    const ratio = contrast(color(`var(--${foreground})`), backdrop);
    assert(ratio >= 4.5, `${foreground}/${background} (including glass): ${ratio.toFixed(2)}:1 fails AA`);
    minimum = Math.min(minimum, ratio);
  }
}
for (const stops of [["brand-purple", "brand-pink", "brand-peach"], ["light-top", "light-bottom"]]) for (let i = 0; i < stops.length - 1; i++) {
  const a = color(`var(--${stops[i]})`), b = color(`var(--${stops[i + 1]})`);
  for (let t = 0; t <= 100; t++) assert(contrast(color("var(--text-on-light)"), a.map((v, c) => v + (b[c] - v) * t / 100)) >= 4.5, "Gradient label fails AA");
}
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
}
for (const file of [...walk("src"), ...walk("public"), "tailwind.config.ts"]) {
  if (!/\.(css|tsx?|svg)$/.test(file) || file.endsWith("tokens.css") || file.includes("/generated/")) continue;
  const source = readFileSync(file, "utf8");
  assert(!/#[\da-f]{3,8}\b|\brgba?\(\s*\d|\bhsla?\(\s*\d/i.test(source), `Hardcoded color: ${file}`);
  assert(!/\b(?:bg|text|border|ring|fill|stroke)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|green|blue|teal|emerald|cyan|indigo|violet|purple|pink|yellow|orange|amber)-\d)/.test(source), `Unmapped color utility: ${file}`);
  assert(!/\}\d{2}`/.test(source), `Hex opacity appended to a CSS variable: ${file}`);
  assert(!/bg-(?:fg|ink)\/\d+|bg-fg text-cream|bg-\[var\(--fg\)\] text-\[var\(--bg\)\]/.test(source), `Outdated inverse color role: ${file}`);
  assert(!/<(?:img|Image)[^>]+src="\/brand\/mark"/.test(source), `Unversioned brand image can retain a stale palette: ${file}`);
  if (file.endsWith(".css")) postcss.parse(source).walkDecls(d => {
    assert(!/\b(?:white|black)\b/.test(d.value), `Untokenized named color: ${file} ${d.prop}`);
    if (d.prop === "background" && /(?:btn-primary|launch-continue-btn|cinematic-cta a)/.test(d.parent.selector ?? "")) {
      assert.equal(resolve(d.value), resolve("var(--gradient-brand)"), `Primary CTA color overridden: ${file} ${d.parent.selector}`);
    }
  });
}
const palette = postcss.parse(readFileSync("src/styles/palette.css", "utf8"));
const secondaryHover = palette.nodes.find(node => node.selector === ":is(.btn-secondary,.hero-pill-secondary):hover");
assert(secondaryHover, "Secondary hover color rule is required");
for (const [prop, token] of [["background", "light-surface"], ["color", "text-on-light"], ["border-color", "border"]]) {
  const decl = secondaryHover.nodes.find(node => node.prop === prop);
  assert.equal(resolve(decl?.value ?? ""), resolve(`var(--${token})`), `Secondary hover ${prop}`);
}
const cinematic = postcss.parse(readFileSync("src/styles/cinematic.css", "utf8"));
let keyframes = 0;
cinematic.walkAtRules("keyframes", rule => {
  keyframes++;
  rule.walkDecls(d => assert(["transform", "opacity"].includes(d.prop), `Expensive animation: ${d.prop}`));
});
assert.equal(keyframes, 2);
assert.match(cinematic.toString(), /prefers-reduced-motion:\s*reduce/);
assert.match(cinematic.toString(), /animation:none!important/);
console.log(`PASS: target palette, token references, source color sweep, gradient AA, text AA >= ${minimum.toFixed(2)}:1, transform-only cinematic animation and reduced motion.`);
