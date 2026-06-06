/**
 * compress-images.mjs — Recompress journey WebP images in-place using PIL.
 * Run once manually: node scripts/compress-images.mjs
 * Saves ~60% bandwidth (3.8MB → ~1.4MB for 12 images).
 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../public/images/journey', import.meta.url).pathname;

// Old/unused names (will be skipped)
const SKIP = new Set([
  'ai-solutions-architect', 'ai-va-toi-uu', 'buoc-chan-frontend',
  'dai-hoc-nen-tang', 'fullstack-thuc-chien', 'kien-truc-he-thong',
]);

const files = readdirSync(DIR).filter(f => f.endsWith('.webp'));
const active = files.filter(f => !SKIP.has(f.replace('.webp', '')));

if (!active.length) { console.log('No images to compress.'); process.exit(0); }

const script = `
import sys, os
from PIL import Image
targets = ${JSON.stringify(active.map(f => join(DIR, f)))}
total_before = total_after = 0
for p in targets:
    orig = os.path.getsize(p)
    img = Image.open(p).convert('RGB')
    img.save(p, 'webp', quality=76, method=6)
    new = os.path.getsize(p)
    total_before += orig; total_after += new
    print(f"  {os.path.basename(p):<42} {orig//1024:>4}KB → {new//1024:>4}KB  ({(1-new/orig)*100:.0f}% saved)")
print(f"\\nTotal: {total_before//1024}KB → {total_after//1024}KB  ({(1-total_after/total_before)*100:.0f}% saved)")
`;

console.log(`Compressing ${active.length} journey images (quality 76)…\n`);
execSync(`python3 -c '${script.replace(/'/g, '"')}'`, { stdio: 'inherit' });
