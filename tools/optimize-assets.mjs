// One-shot asset optimizer: fonts -> woff2 (subset), images -> webp, audio wav -> ogg,
// Font Awesome -> self-hosted subset. Not part of the site build; run manually:
//   node tools/optimize-assets.mjs [fonts|images|audio|fa|all]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import subsetFont from 'subset-font';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(root, ...s);

// Latin-1 + Latin Extended-A + common typographic punctuation. Covers the site's English/Finnish
// copy and ordinary dynamic text (dates, clock) without dragging in Tahoma's Cyrillic/Arabic/Hebrew.
const LATIN = (() => {
  let s = '';
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCharCode(c);            // ASCII printable
  for (let c = 0xa0; c <= 0x17f; c++) s += String.fromCharCode(c);            // Latin-1 + Ext-A
  for (const c of '‐‑‒–—‘’‚“”„…′″€™←→↑↓•·²³½¼¾№') s += c;
  return s;
})();

// Press Start 2P draws the scramble animation from its whole cmap, so keep every range it uses
// (mirrors SCRAMBLE_RANGES in portfolio-common.ts) and only losslessly recompress to woff2.
const SCRAMBLE_RANGES = [
  [0x21,0x7e],[0xa1,0x148],[0x14a,0x161],[0x164,0x17f],[0x192,0x192],[0x21a,0x21b],[0x2bc,0x2bc],
  [0x2c6,0x2c7],[0x2c9,0x2cb],[0x2d7,0x2dd],[0x300,0x301],[0x326,0x326],[0x335,0x335],[0x37a,0x37a],
  [0x37e,0x37e],[0x384,0x38a],[0x38c,0x38c],[0x38e,0x3a1],[0x3a3,0x3ce],[0x400,0x45f],[0x462,0x463],
  [0x46a,0x46b],[0x472,0x475],[0x490,0x49d],[0x4a0,0x4a5],[0x4aa,0x4b1],[0x4b6,0x4bb],[0x4c0,0x4c2],
  [0x4cb,0x4cc],[0x4cf,0x4d9],[0x4dc,0x4df],[0x4e2,0x4e9],[0x4ee,0x4f9],[0x51a,0x51d],[0x524,0x525],
  [0x2013,0x2015],[0x2018,0x201a],[0x201c,0x201e],[0x2020,0x2022],[0x2026,0x2026],[0x2030,0x2030],
  [0x2039,0x203a],[0x2044,0x2044],[0x2074,0x2074],[0x20ac,0x20ac],[0x20ae,0x20af],[0x20b4,0x20b4],
  [0x20b8,0x20b8],[0x20bd,0x20bd],[0x2116,0x2116],[0x2122,0x2122],[0x2190,0x2193],[0x2202,0x2202],
  [0x2206,0x2206],[0x220f,0x220f],[0x2211,0x2211],[0x2215,0x2215],[0x221a,0x221a],[0x221e,0x221e],
  [0x222b,0x222b],[0x2248,0x2248],[0x2260,0x2260],[0x2264,0x2265],[0x25b2,0x25b2],[0x25b6,0x25b6],
  [0x25bc,0x25bc],[0x25c0,0x25c0],[0x25ca,0x25ca],[0x2605,0x2606],[0x2660,0x2660],[0x2663,0x2663],
  [0x2665,0x2666],[0x266a,0x266a],[0xf100,0xf101],[0xf8ff,0xf8ff],[0xfb01,0xfb02]
];
const SCRAMBLE_TEXT = SCRAMBLE_RANGES.flatMap(([a,b]) => { let s=''; for (let c=a;c<=b;c++) s+=String.fromCharCode(c); return s; }).join('');

const kb = (n) => (n/1024).toFixed(1) + ' KB';

async function fonts() {
  mkdirSync(p('fonts'), { recursive: true });
  const jobs = [
    { src: 'fonts/tahoma.ttf', out: 'fonts/tahoma.woff2', text: LATIN },
    { src: 'fonts/tahoma-bold.ttf', out: 'fonts/tahoma-bold.woff2', text: LATIN },
    { src: 'fonts/trebuchet-ms.ttf', out: 'fonts/trebuchet-ms.woff2', text: LATIN },
    { src: 'fonts/trebuchet-ms-bold.ttf', out: 'fonts/trebuchet-ms-bold.woff2', text: LATIN },
    { src: 'fonts/pressstart2p.ttf', out: 'fonts/pressstart2p.woff2', text: SCRAMBLE_TEXT },
  ];
  for (const { src, out, text } of jobs) {
    const input = readFileSync(p(src));
    const woff2 = await subsetFont(input, text, { targetFormat: 'woff2' });
    writeFileSync(p(out), woff2);
    console.log(`font  ${src} (${kb(input.length)}) -> ${out} (${kb(woff2.length)})`);
  }
}

async function images() {
  const jobs = [
    ['images/xp/bliss.jpg', 'images/xp/bliss.webp'],
    ['images/Ballgen.jpg', 'images/Ballgen.webp'],
    ['images/yasuo.png', 'images/yasuo.webp'],
    ['images/Profile.png', 'images/Profile.webp'],
    ['images/MMP.png', 'images/MMP.webp'],
    ['images/Timble.png', 'images/Timble.webp'],
  ];
  for (const [src, out] of jobs) {
    const before = readFileSync(p(src)).length;
    await sharp(p(src)).webp({ quality: 76, effort: 6 }).toFile(p(out));
    const after = readFileSync(p(out)).length;
    console.log(`image ${src} (${kb(before)}) -> ${out} (${kb(after)})`);
  }
}

function audio() {
  const jobs = [
    ['audio/xp-start.wav', 'audio/xp-start.ogg'],
    ['audio/xp-minimize.wav', 'audio/xp-minimize.ogg'],
    ['audio/xp-restore.wav', 'audio/xp-restore.ogg'],
    ['audio/xp-startup.wav', 'audio/xp-startup.ogg'],
  ];
  for (const [src, out] of jobs) {
    const before = readFileSync(p(src)).length;
    execFileSync(ffmpegPath, ['-y', '-i', p(src), '-c:a', 'libvorbis', '-q:a', '4', p(out)], { stdio: 'ignore' });
    console.log(`audio ${src} (${kb(before)}) -> ${out} (${kb(readFileSync(p(out)).length)})`);
  }
}

async function fontAwesome() {
  const faRoot = p('node_modules/@fortawesome/fontawesome-free');
  const css = readFileSync(path.join(faRoot, 'css/all.css'), 'utf8');
  const solid = ['print','envelope','globe','flag','hashtag','code','microchip','project-diagram','cogs','shapes','bone','walking','palette','eye','magic','users','cube','lock'];
  // gumroad is intentionally omitted: neither FA 6 nor 7 ships it, so its badge never had a glyph.
  const brands = ['github','cuttlefish','html5','js-square','java','steam','itch-io','artstation','youtube','reddit','discord','linkedin','twitter'];

  // FA 6 defines the glyph as `.fa-name::before { content: "\fxxx" }` (a hex escape, or an escaped
  // literal like "\#" for symbols). Resolve to a code point.
  const codepoint = (name) => {
    const m = css.match(new RegExp('\\.fa-' + name + ':?:before\\s*\\{\\s*content:\\s*"([^"]*)"', 'i'));
    if (!m) return null;
    const raw = m[1];
    const hex = raw.match(/^\\([0-9a-f]{1,6})$/i);
    if (hex) return parseInt(hex[1], 16);
    const lit = raw.match(/^\\(.)$/s);
    return (lit ? lit[1] : raw).codePointAt(0);
  };
  const cssValue = (cp) => {
    const ch = String.fromCodePoint(cp);
    return cp <= 0x7e && ch !== '"' && ch !== '\\' ? ch : '\\' + cp.toString(16);
  };
  const text = (names) => names.map(n => { const cp = codepoint(n); if (cp === null) throw new Error('no codepoint for fa-' + n); return String.fromCodePoint(cp); }).join('');

  const solidText = text(solid), brandsText = text(brands);
  const solidWf = await subsetFont(readFileSync(path.join(faRoot, 'webfonts/fa-solid-900.woff2')), solidText, { targetFormat: 'woff2' });
  const brandsWf = await subsetFont(readFileSync(path.join(faRoot, 'webfonts/fa-brands-400.woff2')), brandsText, { targetFormat: 'woff2' });
  writeFileSync(p('fonts/fa-solid-subset.woff2'), solidWf);
  writeFileSync(p('fonts/fa-brands-subset.woff2'), brandsWf);

  const rules = solid.concat(brands).map(n => `.fa-${n}::before{content:"${cssValue(codepoint(n))}"}`).join('\n');
  const out = `/* Generated by tools/optimize-assets.mjs - self-hosted Font Awesome subset (only the icons this site uses). */
@font-face{font-family:'Font Awesome 6 Free';font-style:normal;font-weight:900;font-display:block;src:url("../fonts/fa-solid-subset.woff2") format("woff2")}
@font-face{font-family:'Font Awesome 6 Brands';font-style:normal;font-weight:400;font-display:block;src:url("../fonts/fa-brands-subset.woff2") format("woff2")}
:is(.fa,.fas,.fa-solid,.far,.fab,.fa-brands){-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;display:var(--fa-display,inline-block);font-style:normal;font-variant:normal;line-height:1;text-rendering:auto}
:is(.fas,.fa-solid){font-family:'Font Awesome 6 Free';font-weight:900}
:is(.fab,.fa-brands){font-family:'Font Awesome 6 Brands';font-weight:400}
${rules}
`;
  writeFileSync(p('styles/font-awesome-subset.css'), out);
  console.log(`fa     solid subset (${kb(solidWf.length)}) brands subset (${kb(brandsWf.length)}) -> styles/font-awesome-subset.css`);
}

const cmd = process.argv[2] || 'all';
const run = async (name) => {
  if (name === 'fonts') await fonts();
  else if (name === 'images') await images();
  else if (name === 'audio') audio();
  else if (name === 'fa') await fontAwesome();
};
if (cmd === 'all') { for (const n of ['fonts','images','audio','fa']) await run(n); }
else await run(cmd);
