#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_FILE="${ROOT_DIR}/structurizr/workspace.dsl"
CLI_SCRIPT="${ROOT_DIR}/structurizr/bin/structurizr.sh"
DOT_OUT_DIR="${ROOT_DIR}/structurizr/out/dot"
PNG_OUT_DIR="${ROOT_DIR}/structurizr/diagrams"

# Dark theme + restrained accents.
DOT_BG="#000000"
DOT_FG="#e5e7eb"
DOT_MUTED="#94a3b8"
DOT_CLUSTER="#0b1220"
DOT_NODE_BG="#0b1220"
DOT_NODE_BORDER="#67e8f9"
DOT_EDGE="#67e8f9"

# Node border gradient (matches the outer ring on the oryn logo).
BORDER_GRAD_TOP="#a855f7"
BORDER_GRAD_MID="#2563eb"
BORDER_GRAD_BOT="#a855f7"
BORDER_W_PX="4"

# Final output is 16:9. Graph content renders into a 16:8 body area
# so we can reserve a 1/9 height header.
FINAL_W="2560"
FINAL_H="1440"
HEADER_H="$((FINAL_H / 9))" # 160

# Body render size (inches) + DPI.
# 16in x 8in at 160 DPI => 2560 x 1280 pixels.
DOT_SIZE="16,8!"
DOT_DPI="160"

ASSETS_DIR="${ROOT_DIR}/structurizr/assets"
LOGO_PNG="${ASSETS_DIR}/orynlogo.png"

if [[ ! -f "${CLI_SCRIPT}" ]]; then
  echo "Structurizr CLI not found at ${CLI_SCRIPT}"
  echo "Download it with:"
  echo "  mkdir -p structurizr/bin"
  echo "  curl -L -o structurizr/bin/structurizr-cli.zip https://github.com/structurizr/cli/releases/latest/download/structurizr-cli.zip"
  echo "  unzip -o structurizr/bin/structurizr-cli.zip -d structurizr/bin"
  exit 1
fi

if ! command -v dot >/dev/null 2>&1; then
  echo "Graphviz 'dot' is required to render PNG files."
  echo "Install Graphviz and run this script again."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to post-process DOT output for styling."
  echo "Install python3 and run this script again."
  exit 1
fi

if ! python3 -c "import PIL" >/dev/null 2>&1; then
  echo "Python package 'Pillow' is required to compose branded PNG diagrams."
  echo "Install it with: python3 -m pip install pillow"
  exit 1
fi

if [[ ! -f "${LOGO_PNG}" ]]; then
  if command -v rsvg-convert >/dev/null 2>&1 && [[ -f "${ROOT_DIR}/orynlogo.svg" ]]; then
    mkdir -p "${ASSETS_DIR}"
    rsvg-convert -w 512 -h 512 -o "${LOGO_PNG}" "${ROOT_DIR}/orynlogo.svg" || true
  fi
fi

rm -rf "${DOT_OUT_DIR}"
mkdir -p "${DOT_OUT_DIR}" "${PNG_OUT_DIR}"

bash "${CLI_SCRIPT}" validate -w "${WORKSPACE_FILE}"
bash "${CLI_SCRIPT}" export -w "${WORKSPACE_FILE}" -f dot -o "${DOT_OUT_DIR}"

patch_dot() {
  local input_file="$1"
  local output_file="$2"

  # Note: we intentionally hide the Graphviz node stroke and draw our own
  # gradient border later in the PNG compositor.
  python3 - "$input_file" "$output_file" "$DOT_BG" "$DOT_FG" "$DOT_MUTED" "$DOT_CLUSTER" "$DOT_NODE_BG" "$DOT_NODE_BG" "$DOT_EDGE" <<'PY'
import re
import sys

input_file, output_file, bg, fg, muted, cluster, node_bg, node_border, edge = sys.argv[1:]
is_flow = "live-co-reading-flow" in input_file

node_ids: dict[str, str] = {}

def _clean_name(s: str) -> str:
  s = s.replace("<br />", " ").replace("<br/>", " ")
  s = re.sub(r"\s+", " ", s).strip()
  return s

with open(input_file, "r", encoding="utf-8") as f:
  lines = f.readlines()

out = []
cluster_depth = 0

graph_header_re = re.compile(r'(\s*)graph \[fontname="Arial",')
cluster_open_re = re.compile(r'^(\s*)subgraph cluster_\d+ \{\s*$')
node_line_re = re.compile(r'^\s*\d+ \[')

def patch_node(line: str) -> str:
  line = line.replace("shape=rect", "shape=box")
  line = re.sub(r"\bstyle=filled\b", 'style="rounded,filled"', line)
  line = re.sub(r'fillcolor="#[0-9a-fA-F]{6}"', f'fillcolor="{node_bg}"', line)
  line = re.sub(r'fontcolor="#[0-9a-fA-F]{6}"', f'fontcolor="{fg}"', line)
  # Border color (avoid matching fontcolor/fillcolor).
  line = re.sub(r'(?<!font)(?<!fill)color="#[0-9a-fA-F]{6}"', f'color="{node_border}"', line)

  if "penwidth=" not in line and line.rstrip().endswith("]"):
    line = line.rstrip("\n")
    line = line[:-1] + ", penwidth=1]\n"
  return line

def patch_edge(line: str) -> str:
  line = re.sub(r'style="dashed"', 'style="solid", penwidth=2', line)
  line = re.sub(r'color="#[0-9a-fA-F]{6}"', f'color="{edge}"', line)
  line = re.sub(r'fontcolor="#[0-9a-fA-F]{6}"', f'fontcolor="{muted}"', line)

  if is_flow:
    # Strip edge labels for readability; rely on layout + node titles.
    line = re.sub(r',?\s*(x?label)=<<.*?>>', '', line)
    line = re.sub(r',?\s*(x?label)=".*?"', '', line)
  return line

for line in lines:
  m = graph_header_re.match(line)
  if m:
    line = line.replace('graph [fontname="Arial",', f'graph [bgcolor="{bg}", fontcolor="{fg}", fontname="Arial",', 1)

    if is_flow:
      line = line.replace("rankdir=LR,", "rankdir=LR, splines=true, overlap=false,")
      line = line.replace("ranksep=1.0", "ranksep=2.0")
      line = line.replace("nodesep=1.0", "nodesep=1.6")

  if cluster_depth == 0 and line.strip().startswith("label="):
    continue

  m = cluster_open_re.match(line)
  if m:
    cluster_depth += 1
    out.append(line)
    indent = m.group(1) + "  "
    out.append(f'{indent}style="invis"\n')
    out.append(f'{indent}label=""\n')
    out.append(f'{indent}margin=0\n')
    continue

  if cluster_depth > 0:
    stripped = line.strip()
    if stripped.startswith((
      "label=",
      "labelloc=",
      "color=",
      "fontcolor=",
      "fillcolor=",
      "margin=",
    )):
      continue

  if node_line_re.match(line):
    mname = re.search(r'label=<<font point-size="\d+">([^<]+)</font>', line)
    if mname:
      node_ids[_clean_name(mname.group(1))] = line.strip().split(" ", 1)[0]
    line = patch_node(line)
  elif "->" in line and "[" in line and "]" in line:
    line = patch_edge(line)

  out.append(line)

  if line.strip() == "}" and cluster_depth > 0:
    cluster_depth -= 1

if is_flow:
  web = node_ids.get("Web Client")
  routes = node_ids.get("Session Routes + SSE")
  live = node_ids.get("Live Voice Gateway")
  store = node_ids.get("Session Store Adapter")
  pipe = node_ids.get("Analysis Pipeline")
  fs = node_ids.get("Cloud Firestore (optional)")
  g_live = node_ids.get("Gemini Live API")
  g_api = node_ids.get("Gemini API")
  sources = node_ids.get("Public Web Sources")

  if all([web, routes, live, store, pipe, fs, g_live, g_api, sources]):
    layout = []
    layout.append("\n  // Layout constraints for readability (live flow)\n")
    layout.append(f"  {{ rank=same; {web}; }}\n")
    layout.append(f"  {{ rank=same; {routes}; {live}; }}\n")
    layout.append(f"  {{ rank=same; {pipe}; }}\n")
    layout.append(f"  {{ rank=same; {store}; }}\n")
    layout.append(f"  {{ rank=same; {fs}; {g_api}; {sources}; {g_live}; }}\n")

    # Vertical ordering inside columns.
    layout.append(f"  {routes} -> {live} [style=invis, weight=100, constraint=false];\n")
    layout.append(f"  {fs} -> {g_api} [style=invis, weight=100, constraint=false];\n")
    layout.append(f"  {g_api} -> {sources} [style=invis, weight=100, constraint=false];\n")
    layout.append(f"  {sources} -> {g_live} [style=invis, weight=100, constraint=false];\n")

    # Insert before the final closing brace.
    for i in range(len(out) - 1, -1, -1):
      if out[i].strip() == "}":
        out[i:i] = layout
        break

with open(output_file, "w", encoding="utf-8") as f:
  f.writelines(out)
PY
}

render_png() {
  local dot_file="$1"
  local png_file="$2"
  local title="$3"
  local subtitle="$4"
  local patched_dot
  local raw_png
  local plain_file
  patched_dot="${dot_file%.dot}.patched.dot"
  raw_png="${png_file%.png}.raw.png"
  plain_file="${patched_dot%.dot}.plain"
  patch_dot "$dot_file" "$patched_dot"
  dot -Tpng "$patched_dot" \
    -Gsize="$DOT_SIZE" \
    -Gratio=fill \
    -Gdpi="$DOT_DPI" \
    -Gbgcolor="$DOT_BG" \
    -Gfontcolor="$DOT_FG" \
    -Gmargin=0.05 \
    -o "$raw_png"

  dot -Tplain "$patched_dot" \
    -Gsize="$DOT_SIZE" \
    -Gratio=fill \
    -Gdpi="$DOT_DPI" \
    -Gmargin=0.05 >"$plain_file"

  python3 - \
    "$raw_png" \
    "$plain_file" \
    "$png_file" \
    "$LOGO_PNG" \
    "$title" \
    "$subtitle" \
    "$FINAL_W" \
    "$FINAL_H" \
    "$HEADER_H" \
    "$DOT_BG" \
    "$DOT_FG" \
    "$DOT_MUTED" \
    "$DOT_NODE_BORDER" \
    "$DOT_DPI" \
    "$BORDER_GRAD_TOP" \
    "$BORDER_GRAD_MID" \
    "$BORDER_GRAD_BOT" \
    "$BORDER_W_PX" <<'PY'
import os
import sys

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFont

raw_png = sys.argv[1]
plain_file = sys.argv[2]
out_png = sys.argv[3]
logo_png = sys.argv[4]
title = sys.argv[5]
subtitle = sys.argv[6]
final_w = int(sys.argv[7])
final_h = int(sys.argv[8])
header_h = int(sys.argv[9])
bg = sys.argv[10]
fg = sys.argv[11]
muted = sys.argv[12]
accent = sys.argv[13]
dpi = float(sys.argv[14])
grad_top = sys.argv[15]
grad_mid = sys.argv[16]
grad_bot = sys.argv[17]
border_w = int(sys.argv[18])


def load_font(size: int):
  candidates = [
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ]
  for p in candidates:
    try:
      return ImageFont.truetype(p, size=size)
    except Exception:
      pass
  return ImageFont.load_default()


def lerp(a: float, b: float, t: float) -> float:
  return a + (b - a) * t


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
  return (
    int(round(lerp(c1[0], c2[0], t))),
    int(round(lerp(c1[1], c2[1], t))),
    int(round(lerp(c1[2], c2[2], t))),
  )


raw = Image.open(raw_png).convert("RGBA")
bg_rgba = ImageColor.getcolor(bg, "RGBA")


def parse_plain(path: str):
  scale = 1.0
  width = 0.0
  height = 0.0
  nodes = []
  with open(path, "r", encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      if line.startswith("graph "):
        parts = line.split()
        # graph <scale> <width> <height>
        if len(parts) >= 4:
          scale = float(parts[1])
          width = float(parts[2])
          height = float(parts[3])
      elif line.startswith("node "):
        parts = line.split(" ", 6)
        if len(parts) >= 6:
          node_id = parts[1]
          x = float(parts[2])
          y = float(parts[3])
          w = float(parts[4])
          h = float(parts[5])
          nodes.append((node_id, x, y, w, h))
  return scale, width, height, nodes


def apply_gradient_borders(img: Image.Image) -> None:
  scale, gw, gh, nodes = parse_plain(plain_file)
  if gw <= 0 or gh <= 0:
    return

  expected_w = gw * scale * dpi
  expected_h = gh * scale * dpi
  if expected_w <= 0 or expected_h <= 0:
    return

  sx = img.size[0] / expected_w
  sy = img.size[1] / expected_h

  top_rgb = ImageColor.getrgb(grad_top)
  mid_rgb = ImageColor.getrgb(grad_mid)
  bot_rgb = ImageColor.getrgb(grad_bot)

  for _node_id, x, y, w, h in nodes:
    x *= scale
    y *= scale
    w *= scale
    h *= scale

    cx = x * dpi * sx
    cy = y * dpi * sy
    bw = w * dpi * sx
    bh = h * dpi * sy

    if bw < 20 or bh < 20:
      continue

    x0 = int(round(cx - (bw / 2)))
    y0 = int(round((img.size[1] - (cy + (bh / 2)))))
    x1 = int(round(cx + (bw / 2)))
    y1 = int(round((img.size[1] - (cy - (bh / 2)))))

    # Clamp to image.
    x0 = max(0, min(img.size[0] - 1, x0))
    y0 = max(0, min(img.size[1] - 1, y0))
    x1 = max(0, min(img.size[0], x1))
    y1 = max(0, min(img.size[1], y1))

    rw = x1 - x0
    rh = y1 - y0
    if rw <= 0 or rh <= 0:
      continue

    radius = int(round(min(rw, rh) * 0.14))
    radius = max(14, min(28, radius))
    inner_radius = max(0, radius - border_w)

    # Gradient fill.
    grad = Image.new("RGBA", (rw, rh), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for yy in range(rh):
      t = 0.0 if rh <= 1 else (yy / (rh - 1))
      if t <= 0.5:
        tt = t / 0.5
        r, g, b = lerp_color(top_rgb, mid_rgb, tt)
      else:
        tt = (t - 0.5) / 0.5
        r, g, b = lerp_color(mid_rgb, bot_rgb, tt)
      gdraw.line((0, yy, rw, yy), fill=(r, g, b, 255))

    # Border mask (outer minus inner rounded rect).
    mask = Image.new("L", (rw, rh), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle((0, 0, rw - 1, rh - 1), radius=radius, fill=255)
    inset = border_w
    if rw - (inset * 2) > 0 and rh - (inset * 2) > 0:
      mdraw.rounded_rectangle(
        (inset, inset, rw - 1 - inset, rh - 1 - inset),
        radius=inner_radius,
        fill=0,
      )

    grad.putalpha(mask)
    img.alpha_composite(grad, (x0, y0))


apply_gradient_borders(raw)

# Trim excess background so the diagram fills the body better.
diff = ImageChops.difference(raw, Image.new("RGBA", raw.size, bg_rgba))
bbox = diff.getbbox()
if bbox:
  pad = 24
  l = max(0, bbox[0] - pad)
  t = max(0, bbox[1] - pad)
  r = min(raw.size[0], bbox[2] + pad)
  b = min(raw.size[1], bbox[3] + pad)
  raw = raw.crop((l, t, r, b))

canvas = Image.new("RGBA", (final_w, final_h), bg_rgba)
draw = ImageDraw.Draw(canvas)

# Header background.
draw.rectangle((0, 0, final_w, header_h), fill=bg_rgba)

# Brand gradient bar.
bar_h = max(4, header_h // 32)
bar_y0 = header_h - bar_h
stops = [
  (0.0, (0x67, 0xE8, 0xF9)),
  (0.55, (0x25, 0x63, 0xEB)),
  (1.0, (0x8B, 0x5C, 0xF6)),
]
for x in range(final_w):
  tx = x / max(1, final_w - 1)
  for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
    if p0 <= tx <= p1:
      tt = 0.0 if p1 == p0 else (tx - p0) / (p1 - p0)
      r, g, b = lerp_color(c0, c1, tt)
      draw.line((x, bar_y0, x, header_h), fill=(r, g, b, 255))
      break

# Logo + brand text.
pad_x = 56
logo_size = header_h - (bar_h + 56)
logo_size = max(64, min(112, logo_size))

cursor_x = pad_x
if logo_png and os.path.exists(logo_png):
  try:
    logo = Image.open(logo_png).convert("RGBA")
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, (cursor_x, (header_h - bar_h - logo_size) // 2))
    cursor_x += logo_size + 20
  except Exception:
    pass

brand_font = load_font(52)
meta_font = load_font(22)

draw.text((cursor_x, 34), "oryn", fill=ImageColor.getrgb(fg), font=brand_font)
draw.text((cursor_x, 92), "Architecture diagrams", fill=ImageColor.getrgb(muted), font=meta_font)

# Right-aligned title + subtitle.
title_font = load_font(44)
sub_font = load_font(22)

title_box = draw.textbbox((0, 0), title, font=title_font)
title_w = title_box[2] - title_box[0]
title_x = final_w - pad_x - title_w

draw.text((title_x, 34), title, fill=ImageColor.getrgb(fg), font=title_font)

# Subtitle pill.
sub_pad_x = 14
sub_pad_y = 8
sub_box = draw.textbbox((0, 0), subtitle, font=sub_font)
sub_w = sub_box[2] - sub_box[0]
sub_h = sub_box[3] - sub_box[1]
pill_w = sub_w + (sub_pad_x * 2)
pill_h = sub_h + (sub_pad_y * 2)
pill_x1 = final_w - pad_x
pill_x0 = pill_x1 - pill_w
pill_y0 = 92
pill_y1 = pill_y0 + pill_h

pill_fill = ImageColor.getcolor("#0b1220", "RGBA")
pill_border = ImageColor.getrgb(accent)

draw.rounded_rectangle((pill_x0, pill_y0, pill_x1, pill_y1), radius=18, fill=pill_fill, outline=pill_border, width=2)
draw.text((pill_x0 + sub_pad_x, pill_y0 + sub_pad_y), subtitle, fill=ImageColor.getrgb(fg), font=sub_font)

# Body: place the diagram beneath the header.
body_y0 = header_h
body_h = final_h - body_y0
body_w = final_w

margin = 56
max_w = body_w - (margin * 2)
max_h = body_h - (margin * 2)

scale = min(max_w / raw.size[0], max_h / raw.size[1])
new_w = max(1, int(round(raw.size[0] * scale)))
new_h = max(1, int(round(raw.size[1] * scale)))
raw = raw.resize((new_w, new_h), Image.Resampling.LANCZOS)

paste_x = (final_w - new_w) // 2
paste_y = body_y0 + (body_h - new_h) // 2
canvas.alpha_composite(raw, (paste_x, paste_y))

canvas.save(out_png)
PY

  rm -f "$raw_png" "$plain_file" || true
}

render_png "${DOT_OUT_DIR}/structurizr-general-architecture.dot" "${PNG_OUT_DIR}/general-architecture.png" "General Architecture" "C4 Container View"
render_png "${DOT_OUT_DIR}/structurizr-live-co-reading-flow.dot" "${PNG_OUT_DIR}/live-co-reading-flow.png" "Live Co-Reading Flow" "Start at Web Client (left)"

echo "Diagrams exported to ${PNG_OUT_DIR}:"
echo "  - general-architecture.png"
echo "  - live-co-reading-flow.png"
