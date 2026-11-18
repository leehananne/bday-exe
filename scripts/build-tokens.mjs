// Compiles design-system/tokens.json → src/client/styles/tokens.css
// Mirrors the Design System type's compiled layout (format.md "tokens.css as compiled"):
//   :root, [data-theme="<first>"] { colours + shadows }, one [data-theme] block per further theme,
//   :root { spacing, radius, --font-<key> }, a .<style> class per type style.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const t = JSON.parse(readFileSync(resolve(root, 'design-system/tokens.json'), 'utf8'));
const themes = t.color.themes.map((x) => x.id);
const first = themes[0];

const resolveVal = (v) => (typeof v === 'string' ? v.replace(/^\{(.+)\}$/, 'var(--$1)') : v);
const valueFor = (tok, theme) => {
  if (typeof tok.value === 'string') return theme === first ? resolveVal(tok.value) : null;
  if (tok.value[theme] != null) return resolveVal(tok.value[theme]);
  return theme === first ? resolveVal(Object.values(tok.value)[0]) : null;
};

const themed = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];
let css = `/* ${t.name} — generated from tokens.json by scripts/build-tokens.mjs. Do not edit. */\n`;
for (const th of themes) {
  const sel = th === first ? `:root, [data-theme="${th}"]` : `[data-theme="${th}"]`;
  const lines = themed
    .map((tok) => [tok.name, valueFor(tok, th)])
    .filter(([, v]) => v != null)
    .map(([n, v]) => `  --${n}: ${v};`);
  css += `${sel} {\n${lines.join('\n')}\n}\n`;
}
const flat = [...(t.spacing?.tokens ?? []), ...(t.radius?.tokens ?? [])].map((x) => `  --${x.name}: ${x.value};`);
const fams = Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`);
css += `:root {\n${[...flat, ...fams].join('\n')}\n}\n`;
for (const g of t.type.groups) {
  for (const s of g.styles) {
    const fam = s.family ?? g.family;
    css += `.${s.name} { font-family: var(--font-${fam}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight}; }\n`;
  }
}
const out = resolve(root, 'src/client/styles/tokens.css');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, css);
console.log(`tokens.css: ${themes.length} themes, ${themed.length} themed tokens → ${out}`);
