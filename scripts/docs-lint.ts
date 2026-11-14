// Documentation linter. Run: node scripts/docs-lint.ts [--offline]
// Node >= 23.6 strips TypeScript types natively; no build step.
// Rules are numbered as in the docs specification (docs/contributing.md).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const OFFLINE = process.argv.includes("--offline");
const TODAY = new Date(process.env.DOCS_LINT_TODAY ?? Date.now());

// Rule 1 list. Kept here, not repeated in docs, so docs never trip it by quoting it.
const BANNED = [
  "revolutionary", "game-changing", "cutting-edge", "seamless", "ai-powered alpha",
  "terbukti profit", "dijamin", "bebas risiko", "terbaik di kelasnya", "ekosistem",
  "sinergi", "unleash", "supercharge", "masa depan trading",
];

// Every file under docs/ carries status and last_reviewed frontmatter; there are no exemptions.
const LEGACY_NO_FRONTMATTER = new Set<string>();

type Finding = { file: string; line: number; rule: number; msg: string };
const findings: Finding[] = [];
const fail = (file: string, line: number, rule: number, msg: string) => findings.push({ file, line, rule, msg });

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
  });
}

const rootDocs = ["README.md", "CHANGELOG.md", "SECURITY.md", "THREAT_MODEL.md", "HONESTY_LOG.md"]
  .map(f => join(ROOT, f)).filter(existsSync);
const docsFiles = walk(join(ROOT, "docs"));
const all = [...rootDocs, ...docsFiles];
const rel = (p: string) => relative(ROOT, p).replaceAll("\\", "/");

// Strip fenced code blocks: code examples are not claims.
function proseLines(text: string): (string | null)[] {
  let fence = false;
  return text.split(/\r?\n/).map(l => {
    if (/^\s*```/.test(l)) { fence = !fence; return null; }
    return fence ? null : l;
  });
}

const DATE_RANGE = /\d{4}-\d{2}-\d{2}\s*(?:–|-|—|s\.d\.|sampai|to|\.\.)\s*\d{4}-\d{2}-\d{2}|\bT0\b/;
const PERCENT = /\d(?:[\d.,]*)\s?%/;
// A percent that defines a threshold, formula input or example is not a performance claim.
const THRESHOLD = /[<>≤≥]|\b(ambang|batas|maks|minimal|minimum|maksimal|contoh|misal|persentil|interval|gagal jika|di atas|di bawah|lebih dari|kurang dari)\b/i;
const NET_LABEL = /\b(net|bruto|gross|backtest)\b/i;

const links: { file: string; line: number; url: string }[] = [];

for (const path of all) {
  const file = rel(path);
  const text = readFileSync(path, "utf8");
  const lines = proseLines(text);

  // Rule 1
  lines.forEach((l, i) => {
    if (l == null) return;
    const low = l.toLowerCase();
    for (const w of BANNED) if (low.includes(w)) fail(file, i + 1, 1, `kata terlarang: "${w}"`);
  });

  lines.forEach((l, i) => {
    if (l == null) return;
    const isRow = /^\s*\|/.test(l) && !/^\s*\|[\s|:-]+\|\s*$/.test(l);
    // Rule 2
    if (isRow && (/\breturn\b/i.test(l) || PERCENT.test(l)) && !NET_LABEL.test(l))
      fail(file, i + 1, 2, "baris tabel memuat return/% tanpa label net/bruto/backtest");
    // Rule 3
    if (PERCENT.test(l) && !THRESHOLD.test(l)) {
      const win = lines.slice(Math.max(0, i - 3), i + 4).filter(x => x != null).join("\n");
      if (!DATE_RANGE.test(win)) fail(file, i + 1, 3, "angka persen tanpa rentang tanggal dalam 3 baris");
    }
    // Rule 9
    for (const s of l.split(/(?<=[.!?])\s+/))
      if (/\bAPY\b/i.test(s) && !/\b(fee|emisi|emission)\b/i.test(s)) fail(file, i + 1, 9, "klaim APY tanpa kata fee/emisi dalam kalimat yang sama");
    for (const m of l.matchAll(/\]\((https?:\/\/[^)\s]+)\)|<(https?:\/\/[^>\s]+)>/g)) links.push({ file, line: i + 1, url: m[1] ?? m[2] });
    for (const m of l.matchAll(/\]\((?!https?:|mailto:|#)([^)\s#]+)(?:#[^)]*)?\)/g)) {
      if (!existsSync(resolve(dirname(path), m[1]))) fail(file, i + 1, 4, `tautan internal mati: ${m[1]}`);
    }
  });

  // Rules 5 and 6
  if (file.startsWith("docs/") && !LEGACY_NO_FRONTMATTER.has(file)) {
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const status = fm?.[1].match(/^status:\s*(\S+)\s*$/m)?.[1];
    const reviewed = fm?.[1].match(/^last_reviewed:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1];
    if (!status || !["LIVE", "TESTING", "PLANNED"].includes(status)) fail(file, 1, 5, "frontmatter status harus LIVE|TESTING|PLANNED");
    if (!reviewed) fail(file, 1, 5, "frontmatter last_reviewed: YYYY-MM-DD wajib");
    else if (status === "LIVE" && (TODAY.getTime() - Date.parse(reviewed)) / 86_400_000 > 90)
      fail(file, 1, 6, `last_reviewed ${reviewed} lebih tua dari 90 hari untuk file LIVE`);
  }
}

// Rule 7: every metric heading in docs/metrics.md must be named in a test under tests/metrics/.
const metricsDoc = join(ROOT, "docs/metrics.md");
if (existsSync(metricsDoc)) {
  const testText = walk(join(ROOT, "tests/metrics")).concat(
    existsSync(join(ROOT, "tests/metrics")) ? readdirSync(join(ROOT, "tests/metrics")).filter(f => /\.(m?js|ts)$/.test(f)).map(f => join(ROOT, "tests/metrics", f)) : [],
  ).map(p => readFileSync(p, "utf8")).join("\n");
  readFileSync(metricsDoc, "utf8").split(/\r?\n/).forEach((l, i) => {
    if (!l.startsWith("### ")) return;
    for (const m of l.matchAll(/`([a-z0-9_.]+)`/g))
      if (!testText.includes(m[1])) fail("docs/metrics.md", i + 1, 7, `metrik "${m[1]}" tidak punya test di tests/metrics/`);
  });
}

// Rule 8
const lim = join(ROOT, "docs/limitations.md");
if (!existsSync(lim)) fail("docs/limitations.md", 0, 8, "file wajib tidak ada");
else {
  const items = readFileSync(lim, "utf8").split(/\r?\n/).filter(l => /^\s*(\d+\.|-)\s+\S/.test(l)).length;
  if (items < 15) fail("docs/limitations.md", 0, 8, `hanya ${items} butir; minimum 15`);
}

// Rule 4: external links must answer 200.
async function checkLinks() {
  if (OFFLINE) return;
  const unique = [...new Map(links.map(l => [l.url, l])).values()];
  await Promise.all(unique.map(async l => {
    try {
      let r = await fetch(l.url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(10_000) });
      if (r.status === 405 || r.status === 403) r = await fetch(l.url, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
      if (r.status !== 200) fail(l.file, l.line, 4, `tautan mati (${r.status}): ${l.url}`);
    } catch (e) {
      fail(l.file, l.line, 4, `tautan tidak bisa dijangkau: ${l.url} (${(e as Error).message})`);
    }
  }));
}

await checkLinks();
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const f of findings) console.log(`${f.file}:${f.line}  [aturan ${f.rule}] ${f.msg}`);
console.log(`\n${all.length} file diperiksa, ${findings.length} pelanggaran${OFFLINE ? " (tautan eksternal dilewati: --offline)" : ""}.`);
process.exit(findings.length ? 1 : 0);
