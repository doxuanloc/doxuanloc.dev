# Grok Image Gen — Logo + Welcome Hero Visual

> Hai task độc lập. Task A = logo icon (32–512px). Task B = welcome hero visual (1280×720, có thể animate).

---

## TASK A — Logo / Brand Mark

### Mục tiêu
Icon nhận ra được ở 16px browser tab. Đẹp ở 512px PWA icon. Không cần detail phức tạp.

### Hard requirements
- **Canvas**: 512×512px, hình vuông tuyệt đối, solid background
- **Background**: `#04060e` (deep space, gần như đen)
- **Style**: Sci-fi / HUD / space orbital. Không flat corporate. Không cute. Không pastel.
- **Readable at 16×16**: Tối đa 2 elements. Không fine detail. Không chữ nhỏ.

### Color palette
```
Background:       #04060e
Primary accent:   #5b8cff  (electric blue)
Secondary:        #36d6c3  (teal/cyan)
Optional:         #b58cff  (purple — dùng ít)
Text/highlight:   #eaeef8
```

### 3 options — chọn 1 hoặc gen cả 3

**Option A — Bold "L" Initial (đơn giản, readable nhất)**
- Chữ "L" hoa, font bold geometric (Orbitron / Exo / Tektur weight 700–900)
- Màu teal `#36d6c3` HOẶC electric blue `#5b8cff`
- 1 thin circular ring ngoài (2px stroke, opacity ~55%, cách edge 10%)
- Subtle glow xung quanh chữ L (blur 12px, opacity 40%)
- Background `#04060e`, không thêm decoration

**Option B — Orbital Hexagon**
- Hexagon filled nhẹ `rgba(91,140,255,0.08)`, border `#5b8cff` 2px
- Bên trong: chữ "L" HOẶC symbol `</>` HOẶC mạch điện đơn giản
- 1-2 thin orbital arc (dashed, broken line) màu teal xung quanh hexagon, như orbit path
- Tất cả centered trên `#04060e`

**Option C — Circuit Monogram**
- Vòng tròn ngoài màu `#5b8cff`, stroke 3px
- Chữ "L" bold bên trong + 2-3 angular line từ các góc L ra rìa (circuit trace style)
- 1-2 chấm teal nhỏ ở điểm cuối trace (solder point)
- Background `#04060e`, không gradient

### Không làm
- Không ảnh người, không ảnh thật
- Không gradient nhiều màu sặc sỡ hoặc rainbow
- Không shadow 3D bevel / emboss
- Không text dưới 30% canvas size
- Không background trắng hoặc sáng
- Không quá 3 màu chính
- Không elements detail sẽ biến mất ở 16×16

### Output
- PNG 512×512, background solid `#04060e`
- Nếu gen nhiều: cho cả 3 để compare

---

## TASK B — Welcome Hero Visual (Homepage)

### Mục tiêu
Visual anchor cho hero section của portfolio. Thay thế hoặc augment ảnh astronaut tĩnh hiện tại. Phải kể câu chuyện "AI engineer trong vũ trụ kỹ thuật số" trong 1 frame.

### Canvas
- **1280×720px** (16:9) — horizontal format
- Background: `#04060e` deep space
- Transparent edges OK (sẽ fade với CSS overlay)

### 3 concept options

**Concept 1 — "Command Station" (Orbital telemetry)**
Không gian tối với:
- Ở giữa: avatar / astronaut silhouette (abstract, không ảnh thật) hoặc chỉ logo "L" lớn
- Xung quanh: 2-3 orbital ellipse (like planet orbit), góc nghiêng 3D perspective, mỏng 1-2px, màu `#5b8cff` opacity 30%
- Scattered data points / nodes dọc theo orbit lines (glowing dots `#36d6c3`)
- Góc trên trái + phải: HUD corner brackets (2px, `#5b8cff`)
- Thin horizontal scanline animation (optional — có thể đề xuất frame để Claude tạo CSS)
- Tone: cold, precise, professional

**Concept 2 — "Neural Constellation"**
- Background: deep space với rất ít micro-dots (stars, không cluttered)
- Foreground: constellation graph — ~15-20 nodes (glowing circles) nối với nhau bằng thin lines
- Nodes = tech/skill concepts (labels: "AI", "Cloud", "API", "Voice", "RAG", v.v.)
- Nodes có 2-3 kích thước khác nhau (importance = size)
- Màu chính nodes: `#5b8cff`, connections `rgba(91,140,255,0.25)`
- Vài nodes highlight teal `#36d6c3` (core expertise)
- Không ảnh người, không text lớn
- Tone: intelligent, connected, data-driven

**Concept 3 — "Boot Sequence Terminal"**
- Split layout: bên trái là terminal window (dark panel, monospace font)
  ```
  > SYSTEM INIT...
  > LOADING: AI_STACK.module ✓
  > LOADING: CLOUD_INFRA.module ✓
  > LOADING: VOICE_AI.module ✓
  > STATUS: ONLINE ██████████ 100%
  > MISSION: Building intelligent systems
  ```
- Bên phải: logo "L" lớn với glow, orbital ring xung quanh
- Border giữa hai panel: thin vertical line `#5b8cff`
- Tone: hacker, engineering, authentic
- Text trong terminal: mono font, màu `#36d6c3` cho keywords, `#eaeef8` cho text thường

### Nếu có thể tạo GIF/animated:
- Loop 6-8s, seamless
- Tối thiểu: orbital rings spinning chậm (rất chậm, 30-60s/vòng)
- Các glowing dots pulse nhẹ (opacity 0.5 → 1 → 0.5)
- Scanline nếu có — di chuyển từ top xuống bottom chậm
- Không rapid flash, không jarring motion

### Không làm
- Không ảnh người thật / face
- Không neon city / cyberpunk clichés
- Không quá nhiều elements — phải feel clean và professional
- Không white background
- Không 3D render nặng

### Output
- PNG 1280×720 + GIF 1280×720 nếu có thể
- Nếu chỉ PNG: key frames (start frame, mid frame) để Claude implement CSS animation
- Sẽ dùng làm hero visual + og:image

---

## Reference style keywords (cả hai task)
`dark space portfolio, sci-fi HUD interface, orbital data visualization, electric blue teal dark background, minimal geometric, constellation network graph, terminal UI aesthetic, clean professional, AI engineer identity`
