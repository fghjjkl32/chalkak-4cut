// C: 스티커 (기본 스티커, 짤 업로드, 옮기기, 크기와 회전, 삭제)

const STK_BASE = 260; // 결과물 기준 스티커 기본 너비
let defaultStickers = [];
let selectedSticker = -1;
let stkDrag = null;

function addSticker(img, orig) {
  const L = outSize();
  const w = STK_BASE;
  const h = (STK_BASE * img.height) / img.width;
  app.stickers.push({ img, orig, x: L.w / 2, y: L.h * 0.35, s: 1, a: 0, w, h });
  selectedSticker = app.stickers.length - 1;
}

function drawStickers(g) {
  g.push();
  g.imageMode(CENTER);
  for (const s of app.stickers) {
    g.push();
    g.translate(s.x, s.y);
    g.rotate(s.a);
    g.image(s.img, 0, 0, s.w * s.s, s.h * s.s);
    g.pop();
  }
  g.pop();
}

// 고른 스티커의 테두리와 손잡이 (캔버스 좌표로 그린다)
function drawStickerHandles(view) {
  const s = app.stickers[selectedSticker];
  if (!s) return;
  push();
  translate(view.x + s.x * view.k, view.y + s.y * view.k);
  rotate(s.a);
  const w = s.w * s.s * view.k;
  const h = s.h * s.s * view.k;
  noFill();
  stroke(51, 85, 224);
  strokeWeight(2);
  drawingContext.setLineDash([6, 4]);
  rect(-w / 2, -h / 2, w, h);
  drawingContext.setLineDash([]);
  fill(255);
  circle(w / 2, h / 2, 18);
  pop();
}

// 결과물 좌표 (mx, my)를 스티커 안쪽 좌표로 바꾼다
function toLocal(s, mx, my) {
  const dx = mx - s.x;
  const dy = my - s.y;
  const c = cos(-s.a);
  const n = sin(-s.a);
  return { x: dx * c - dy * n, y: dx * n + dy * c };
}

function stickerPressed(mx, my, viewK) {
  const handleR = 14 / viewK;
  // 고른 스티커의 손잡이부터 확인
  const cur = app.stickers[selectedSticker];
  if (cur) {
    const p = toLocal(cur, mx, my);
    if (dist(p.x, p.y, (cur.w * cur.s) / 2, (cur.h * cur.s) / 2) < handleR) {
      stkDrag = {
        mode: "scale",
        s0: cur.s,
        a0: cur.a,
        d0: dist(cur.x, cur.y, mx, my),
        ang0: atan2(my - cur.y, mx - cur.x),
      };
      return;
    }
  }
  // 위에 있는 스티커부터 확인
  for (let i = app.stickers.length - 1; i >= 0; i--) {
    const s = app.stickers[i];
    const p = toLocal(s, mx, my);
    if (abs(p.x) <= (s.w * s.s) / 2 && abs(p.y) <= (s.h * s.s) / 2) {
      selectedSticker = i;
      stkDrag = { mode: "move", ox: mx - s.x, oy: my - s.y };
      return;
    }
  }
  selectedSticker = -1;
  stkDrag = null;
}

function stickerDragged(mx, my) {
  const s = app.stickers[selectedSticker];
  if (!s || !stkDrag) return;
  if (stkDrag.mode === "move") {
    s.x = mx - stkDrag.ox;
    s.y = my - stkDrag.oy;
  } else {
    const d = dist(s.x, s.y, mx, my);
    s.s = constrain((stkDrag.s0 * d) / max(stkDrag.d0, 1), 0.15, 6);
    s.a = stkDrag.a0 + atan2(my - s.y, mx - s.x) - stkDrag.ang0;
  }
}

function stickerReleased() {
  stkDrag = null;
}

function deleteSelectedSticker() {
  if (selectedSticker < 0) return;
  app.stickers.splice(selectedSticker, 1);
  selectedSticker = -1;
}

// 누끼 허용 범위를 바꾸면 고른 스티커(올린 짤)를 다시 자른다
function recutSelected(tol) {
  const s = app.stickers[selectedSticker];
  if (!s || !s.orig) return;
  s.img = autoCutout(s.orig, tol);
  s.h = (s.w * s.img.height) / s.img.width;
}

// 기본 스티커 8개를 도형으로 그려 만든다
function makeDefaultStickers() {
  const makers = [
    (g) => { // 하트
      g.fill(255, 90, 120);
      g.beginShape();
      for (let t = 0; t < TWO_PI; t += 0.05) {
        const x = 16 * pow(sin(t), 3);
        const y = -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t));
        g.vertex(100 + x * 5.6, 104 + y * 5.6);
      }
      g.endShape(CLOSE);
    },
    (g) => { // 별
      g.fill(255, 210, 63);
      g.stroke(255, 160, 0);
      g.strokeWeight(6);
      g.beginShape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 88 : 38;
        const a = -HALF_PI + (i * PI) / 5;
        g.vertex(100 + r * cos(a), 106 + r * sin(a));
      }
      g.endShape(CLOSE);
    },
    (g) => { // 왕관
      g.fill(255, 200, 40);
      g.stroke(200, 140, 0);
      g.strokeWeight(5);
      g.beginShape();
      g.vertex(25, 150); g.vertex(25, 70); g.vertex(62, 110); g.vertex(100, 50);
      g.vertex(138, 110); g.vertex(175, 70); g.vertex(175, 150);
      g.endShape(CLOSE);
      g.noStroke();
      g.fill(255, 90, 120);
      g.circle(100, 120, 22);
    },
    (g) => { // 반짝이
      g.fill(120, 200, 255);
      for (const [x, y, r] of [[100, 100, 70], [45, 45, 28], [160, 150, 24]]) {
        g.beginShape();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 === 0 ? r : r * 0.22;
          const a = (i * PI) / 4;
          g.vertex(x + rr * cos(a), y + rr * sin(a));
        }
        g.endShape(CLOSE);
      }
    },
    (g) => { // 말풍선 ㅋㅋ
      g.fill(255);
      g.stroke(30);
      g.strokeWeight(6);
      g.ellipse(100, 88, 170, 120);
      g.triangle(60, 135, 50, 180, 95, 145);
      g.noStroke();
      g.fill(30);
      g.textAlign(CENTER, CENTER);
      g.textStyle(BOLD);
      g.textSize(54);
      g.text("ㅋㅋ", 100, 90);
    },
    (g) => { // LOVE
      g.textAlign(CENTER, CENTER);
      g.textStyle(BOLD);
      g.textSize(64);
      g.stroke(255);
      g.strokeWeight(10);
      g.fill(255, 90, 160);
      g.text("LOVE", 100, 100);
    },
    (g) => { // 리본
      g.fill(255, 120, 170);
      g.triangle(100, 100, 20, 55, 20, 145);
      g.triangle(100, 100, 180, 55, 180, 145);
      g.fill(230, 70, 130);
      g.circle(100, 100, 40);
    },
    (g) => { // 고양이 귀
      g.fill(60);
      g.triangle(20, 160, 50, 40, 90, 140);
      g.triangle(180, 160, 150, 40, 110, 140);
      g.fill(255, 170, 190);
      g.triangle(38, 140, 52, 75, 74, 132);
      g.triangle(162, 140, 148, 75, 126, 132);
    },
  ];
  defaultStickers = makers.map((fn) => {
    const g = createGraphics(200, 200);
    g.pixelDensity(1);
    g.clear();
    g.noStroke();
    fn(g);
    const img = trimTransparent(g.get());
    g.remove();
    return img;
  });
}
