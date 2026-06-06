# Journey Image Prompts — Grok Image Generation

> Dùng Grok Image (web app) để gen từng ảnh, lưu vào `public/images/journey/<id>.webp`
>
> **Recommended export**: PNG transparent background (hoặc WebP dark bg) · 800×1000px (4:5 portrait)
>
> Ảnh sẽ được dùng với parallax (mouse-reactive layer) + float animation.

---

## Base style (thêm vào cuối MỌI prompt)

```
Cinematic sci-fi concept art, dark near-black background (#050912), volumetric glow,
holographic UI elements, no people, no text overlay, ultra-detailed digital painting,
portrait 4:5 aspect ratio, 800x1000 resolution, suitable for web use as parallax layer
```

---

## Chapter: Origins — accent #5b8cff (electric blue)

### `uit-foundation`
```
A glowing blue constellation of algorithm nodes and binary trees floating in deep space,
connected by thin light filaments, university textbook silhouettes dissolving into
glowing geometric shapes, electric blue (#5b8cff) and indigo color palette,
deep-space nebula in the far background
```
→ File: `public/images/journey/uit-foundation.webp`

---

### `btec-practical`
```
A holographic blueprint schematic dissolving into working code on a floating monitor,
teal-blue glowing circuit lines tracing a product prototype in wireframe style,
hands (no face) holding a glowing chip or device, electric blue and teal (#36d6c3),
dark workshop atmosphere
```
→ File: `public/images/journey/btec-practical.webp`

---

## Chapter: Forge — accent #36d6c3 (teal/cyan)

### `first-frontend-ship`
```
Glowing React component tree rendered as 3D floating nodes in teal (#36d6c3),
holographic blockchain blocks linking in the background, a deploy rocket trail
ascending in the far distance, Saigon city lights blurred below, dark nighttime atmosphere
```
→ File: `public/images/journey/first-frontend-ship.webp`

---

### `threejs-saas`
```
A stunning 3D wireframe object (abstract machine part) rotating in teal-cyan holographic light,
two floating screens showing frontend UI and backend graphs side by side,
WebGL-style render with depth-of-field blur, electric teal and deep blue (#5b8cff),
starfield background
```
→ File: `public/images/journey/threejs-saas.webp`

---

### `personal-platforms`
```
Multiple glowing project windows orbiting a central glowing core like planets,
each window shows abstract dashboard UI (no real data), golden (#f0b232) and teal accents,
bootstrap/startup energy, floating in zero gravity, dark cosmos background
```
→ File: `public/images/journey/personal-platforms.webp`

---

### `plogg-bucco`
```
A dental clinic app holographic UI floating in mid-air, teal-white glowing interface,
a globe connection arc between Vietnam and France in the background,
remote work: floating code editor alongside the clinic interface,
clean white-blue-teal palette on dark background
```
→ File: `public/images/journey/plogg-bucco.webp`

---

## Chapter: Systems — accent #b58cff (purple/violet)

### `me-join`
```
A vast enterprise microservices architecture diagram rendered as a glowing purple-violet
neural network, dozens of interconnected service nodes, event arrows flowing between them,
the diagram fills a huge curved holographic screen, one node glowing brighter (entry point),
deep purple (#b58cff) and indigo, dark engineering atmosphere
```
→ File: `public/images/journey/me-join.webp`

---

### `oikura-modernize`
```
A phoenix-like transformation: an old monolithic block shattering on the left,
morphing into a floating distributed microservices architecture on the right,
AWS service icons as glowing purple runes, Japanese kanji "再生" (rebirth) dissolving
in the background, purple (#b58cff) and electric blue, dramatic lighting
```
→ File: `public/images/journey/oikura-modernize.webp`

---

### `mmt-event-driven`
```
An event-driven message bus visualized as glowing rivers of light flowing between
floating service platforms, SQS/SNS queue icons rendered as luminous containers,
real-time dashboard hologram showing operator metrics, purple-violet (#b58cff)
and teal streams, dark space-like background
```
→ File: `public/images/journey/mmt-event-driven.webp`

---

## Chapter: Intelligence — accent #f0b232 (gold/amber)

### `first-rag`
```
A neural network web glowing in gold (#f0b232) and violet, document pages
dissolving into floating vector embeddings (small glowing dots), retrieval arrows
connecting document clusters to a central AI brain orb, streams of light representing
data flow, RAG pipeline visualized as a living organism, dark background
```
→ File: `public/images/journey/first-rag.webp`

---

### `ai-pipeline-prod`
```
An AI production pipeline as a holographic circuit board floating in space,
golden (#f0b232) signal pulses traveling through stages (ingest → process → output),
latency graphs glowing as real-time HUD overlays, monitoring dashboard with
green/amber status lights, connected to a starfield representing scale,
gold and electric blue color palette
```
→ File: `public/images/journey/ai-pipeline-prod.webp`

---

## Chapter: Horizon — accent #ff7eb3 (pink/rose)

### `horizon-lead`
```
A lone architect figure (silhouette only, no face) standing on a floating platform
overlooking a vast holographic city of AI systems, pink-rose (#ff7eb3) and electric blue
light bridges connecting towers, Japan and Vietnam map shapes subtly visible
in glowing geography below, a massive AI brain constellation in the sky above,
forward-looking, cinematic, hopeful, epic scale
```
→ File: `public/images/journey/horizon-lead.webp`

---

## Notes cho Grok Image

- Nếu background không transparent: chọn màu nền **#04060e** (site background) để blend tốt
- Tránh white backgrounds hoàn toàn
- Tránh text trong ảnh (caption, labels) — sẽ bị double với text trên UI
- Nếu Grok Image cho phép transparent PNG: dùng cho `first-frontend-ship`, `horizon-lead`, `ai-pipeline-prod` — các ảnh này layer đẹp nhất
- Sau khi gen: resize về 800×1000 và save WebP quality 85 trước khi đưa vào repo
- Đặt tên đúng ID milestone → `public/images/journey/<id>.webp`

## Quick convert script (sau khi có ảnh PNG)

```bash
# Resize + convert to WebP quality 85
python3 -c "
from PIL import Image
import sys, os

for src in sys.argv[1:]:
    img = Image.open(src)
    img = img.resize((800, 1000), Image.LANCZOS)
    out = src.rsplit('.', 1)[0] + '.webp'
    img.save(out, 'WEBP', quality=85)
    print(f'{src} → {out}  ({os.path.getsize(out)//1024}KB)')
" *.png
```
