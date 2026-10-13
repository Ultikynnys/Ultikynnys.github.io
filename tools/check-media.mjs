import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const files = ['programming-projects.md', 'games.md', '3d-projects.md'];
const seen = new Set();
for (const f of files) {
  for (const line of readFileSync(path.join('projects', f), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^- Media:\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    const list = v.startsWith('[') ? v.slice(1, -1).split(',').map(s => s.trim()) : [v];
    for (const src of list) {
      if (/^https?:/i.test(src)) continue;
      if (/\.(mp4|webm|mov|ogv)$/i.test(src)) continue; // a <video>, not an image
      if (seen.has(src)) continue;
      seen.add(src);
      if (!existsSync(src)) { console.log('MISSING ', src); continue; }
      const size = statSync(src).size;
      await sharp(src).metadata().then(md => {
        if (!md.width || !md.height) console.log('NO-DIMS ', src, JSON.stringify(md));
      }).catch(e => console.log('CORRUPT ', src, `(${(size/1024|0)}KB)`, '-', e.message.split('\n')[0]));
    }
  }
}
console.log('checked', seen.size, 'local media files');
