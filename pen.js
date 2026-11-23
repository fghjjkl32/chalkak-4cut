// D: 프레임 위에 펜으로 낙서하기와 지우개

const PEN_MODES = { off: "끄기", pen: "펜", eraser: "지우개" };
const PEN_COLORS = ["#111111", "#ffffff", "#ff3b6b", "#ff9f1c", "#ffd23f", "#2ec4b6", "#3355e0", "#9b5de5"];
const PEN_UNDO_MAX = 20;

const pen = { mode: "off", color: "#ff3b6b", size: 12 };
let penG = null; // 결과물 크기의 낙서 층
let penLast = null;
let penUndo = [];

// 레이아웃이 바뀌면 결과물 크기도 바뀌므로 낙서 층을 새로 만든다
function penLayer() {
  const L = outSize();
  if (!penG || penG.width !== L.w || penG.height !== L.h) {
    if (penG) penG.remove();
    penG = createGraphics(L.w, L.h);
    penG.pixelDensity(1);
    penG.clear();
    penUndo = [];
  }
  return penG;
}

function penActive() {
  return app.screen === "decorate" && pen.mode !== "off";
}

function penPressed(x, y) {
  const g = penLayer();
  penUndo.push(g.get());
  if (penUndo.length > PEN_UNDO_MAX) penUndo.shift();
  penLast = { x, y };
  penStroke(x, y);
}

function penDragged(x, y) {
  if (penLast) penStroke(x, y);
}

function penReleased() {
  penLast = null;
}

function penStroke(x, y) {
  const g = penLayer();
  const erasing = pen.mode === "eraser";
  g.push();
  if (erasing) g.erase();
  g.stroke(pen.color);
  g.strokeWeight(erasing ? pen.size * 2 : pen.size);
  g.strokeCap(ROUND);
  g.line(penLast.x, penLast.y, x, y);
  if (erasing) g.noErase();
  g.pop();
  penLast = { x, y };
}

function undoPen() {
  const img = penUndo.pop();
  if (!img || !penG) return;
  penG.clear();
  penG.image(img, 0, 0);
}

function clearPen() {
  if (!penG) return;
  penUndo.push(penG.get());
  if (penUndo.length > PEN_UNDO_MAX) penUndo.shift();
  penG.clear();
}

function resetPen() {
  if (penG) penG.clear();
  penUndo = [];
  penLast = null;
}

// composeLayout 안에서 결과물 좌표로 그린다
function drawPen(g) {
  if (!penG) return;
  const L = outSize();
  if (penG.width !== L.w || penG.height !== L.h) return;
  g.image(penG, 0, 0, L.w, L.h);
}

// 펜 굵기를 캔버스 위에 동그라미로 보여 준다
function drawPenCursor(view) {
  if (!penActive() || !inCanvas()) return;
  const r = (pen.mode === "eraser" ? pen.size * 2 : pen.size) * view.k;
  push();
  noFill();
  stroke(pen.mode === "eraser" ? 90 : pen.color);
  strokeWeight(1.5);
  circle(mouseX, mouseY, max(r, 4));
  pop();
}

function setupPenUI() {
  makeChips("penModeChips", PEN_MODES, () => pen.mode, (v) => {
    pen.mode = v;
    if (v !== "off") selectedSticker = -1; // 펜을 쓰는 동안 스티커 손잡이를 숨긴다
    cursor(v === "off" ? ARROW : CROSS);
  });
  const box = $("penColors");
  PEN_COLORS.forEach((c) => {
    const b = document.createElement("button");
    b.style.background = c;
    b.title = c;
    b.onclick = () => {
      pen.color = c;
      if (pen.mode !== "pen") $("penModeChips").querySelector('[data-v="pen"]').click();
      [...box.children].forEach((x) => x.classList.toggle("on", x.title === c));
    };
    box.appendChild(b);
  });
  [...box.children].forEach((x) => x.classList.toggle("on", x.title === pen.color));
  $("penSize").oninput = (e) => {
    pen.size = Number(e.target.value);
    $("penSizeVal").textContent = e.target.value;
  };
  $("btnPenUndo").onclick = undoPen;
  $("btnPenClear").onclick = clearPen;
}
