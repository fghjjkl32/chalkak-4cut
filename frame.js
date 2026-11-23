// D: 레이아웃 계산과 결과물 합치기 (프레임 색, 무늬, 배경 이미지, 날짜와 문구)

const LAYOUTS = {
  "1x4": { label: "1×4", w: 600, h: 1800, cols: 1, rows: 4, shots: 4 },
  "2x3": { label: "2×3", w: 1200, h: 1800, cols: 2, rows: 3, shots: 6 },
  "2x4": { label: "2×4", w: 1200, h: 1800, cols: 2, rows: 4, shots: 8 },
};
const MARGIN = 36;
const GAP = 18;
const FOOTER = 160;

function outSize(key = app.layout) {
  return LAYOUTS[key];
}

// 사진 칸 위치. 열 단위로 번호를 매긴다 (2×4에서 i % 4가 같은 사진이 되도록)
function cellRects(key = app.layout) {
  const L = LAYOUTS[key];
  const colGap = key === "2x4" ? MARGIN * 2 : GAP; // 2×4는 가운데를 잘라 나눠 갖는다
  const cw = (L.w - 2 * MARGIN - (L.cols - 1) * colGap) / L.cols;
  const ch = (L.h - MARGIN - FOOTER - (L.rows - 1) * GAP) / L.rows;
  const rects = [];
  for (let c = 0; c < L.cols; c++) {
    for (let r = 0; r < L.rows; r++) {
      rects.push({ x: MARGIN + c * (cw + colGap), y: MARGIN + r * (ch + GAP), w: cw, h: ch });
    }
  }
  return rects;
}

function shotCount() {
  if (app.layout === "2x4") return app.eight ? 8 : 4;
  return LAYOUTS[app.layout].shots;
}

// 칸 i에 들어갈 사진 번호
function cellImageIndex(i) {
  if (app.layout === "2x4" && !app.eight) return i % 4;
  return i;
}

// 사진을 칸 비율에 맞춰 가운데만 잘라 넣는다
function drawCover(g, img, r) {
  const sr = img.width / img.height;
  const dr = r.w / r.h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (sr > dr) {
    sw = img.height * dr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dr;
    sy = (img.height - sh) / 2;
  }
  g.image(img, r.x, r.y, r.w, r.h, sx, sy, sw, sh);
}

function isLightColor(hex) {
  const c = color(hex);
  const lum = (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255;
  return lum > 0.6;
}

function drawPattern(g, L, kind, light) {
  if (kind === "none") return;
  g.push();
  g.noStroke();
  g.fill(light ? color(0, 0, 0, 28) : color(255, 255, 255, 40));
  if (kind === "dot") {
    for (let y = 20; y < L.h; y += 44) {
      for (let x = (y / 44) % 2 ? 42 : 20; x < L.w; x += 44) g.circle(x, y, 12);
    }
  } else if (kind === "stripe") {
    g.stroke(light ? color(0, 0, 0, 28) : color(255, 255, 255, 40));
    g.strokeWeight(14);
    for (let x = -L.h; x < L.w; x += 48) g.line(x, 0, x + L.h, L.h);
  } else if (kind === "check") {
    for (let y = 0; y < L.h; y += 40) {
      for (let x = 0; x < L.w; x += 40) {
        if ((x / 40 + y / 40) % 2 === 0) g.rect(x, y, 40, 40);
      }
    }
  }
  g.pop();
}

function todayText() {
  return `${year()}.${nf(month(), 2)}.${nf(day(), 2)}`;
}

function drawFooter(g, L) {
  const light = !app.frame.bgImage && isLightColor(app.frame.color);
  const centers = app.layout === "2x4" ? [L.w / 4, (L.w * 3) / 4] : [L.w / 2];
  const top = L.h - FOOTER;
  g.push();
  g.textAlign(CENTER, CENTER);
  g.noStroke();
  if (app.frame.bgImage) {
    g.stroke(0, 140);
    g.strokeWeight(4);
  }
  g.fill(light ? 25 : 250);
  for (const cx of centers) {
    const hasText = app.frame.text.trim().length > 0;
    if (hasText) {
      g.textStyle(BOLD);
      g.textSize(42);
      g.text(app.frame.text, cx, top + (app.frame.showDate ? 48 : 66));
    }
    if (app.frame.showDate) {
      g.textStyle(NORMAL);
      g.textSize(hasText ? 26 : 40);
      g.text(todayText(), cx, top + (hasText ? 98 : 66));
    }
    g.textStyle(BOLD);
    g.textSize(16);
    g.text("CHALKAK 4CUT", cx, L.h - 22);
  }
  g.pop();
}

// 합친 결과물을 담을 그래픽은 배율마다 하나씩 만들어 재사용한다
const compCache = {};

function composeLayout(images, k, withStickers) {
  const L = outSize();
  const W = max(1, round(L.w * k));
  const H = max(1, round(L.h * k));
  const key = String(k);
  let g = compCache[key];
  if (!g || g.width !== W || g.height !== H) {
    if (g) g.remove();
    g = createGraphics(W, H);
    g.pixelDensity(1);
    compCache[key] = g;
  }
  g.push();
  g.clear();
  g.scale(k);
  const light = isLightColor(app.frame.color);
  g.background(app.frame.color);
  if (app.frame.bgImage) drawCover(g, app.frame.bgImage, { x: 0, y: 0, w: L.w, h: L.h });
  drawPattern(g, L, app.frame.pattern, light && !app.frame.bgImage);

  cellRects().forEach((r, i) => {
    const img = images[cellImageIndex(i)];
    if (img) {
      drawCover(g, img, r);
    } else {
      g.noStroke();
      g.fill(light ? 215 : 60);
      g.rect(r.x, r.y, r.w, r.h);
      g.fill(light ? 150 : 140);
      g.textAlign(CENTER, CENTER);
      g.textSize(60);
      g.text(cellImageIndex(i) + 1, r.x + r.w / 2, r.y + r.h / 2);
    }
  });
  drawFooter(g, L);
  if (withStickers) {
    drawStickers(g);
    drawPen(g);
  }
  g.pop();
  return g;
}
