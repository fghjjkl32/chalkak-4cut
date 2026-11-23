// D: 메인 스케치. setup()과 draw()는 이 파일에만 둔다.

// 모두가 함께 쓰는 상태
let app = {
  screen: "start", // start, frame, shoot, decorate, save
  layout: "1x4", // 1x4, 2x3, 2x4
  eight: true, // 2x4에서 8장 따로 찍기 (끄면 4장을 찍어 두 줄에 똑같이 넣는다)
  frame: {
    color: "#111111",
    pattern: "none", // none, dot, stripe, check
    bgImage: null,
    text: "",
    showDate: true,
  },
  gestureOn: true,
  faceFilter: "none", // none, dog, glasses, blush
  colorFilter: "none", // none, gray, sepia, warm, cool
  shots: [], // 컷마다 p5.Image 한 장
  clips: [], // 컷마다 직전 1.5초 프레임 배열
  stickers: [],
  exporting: null, // null, "gif", "video"
};

let cnv;
const CANVAS_W = 960;
const CANVAS_H = 640;

function preload() {
  // ml5.js가 없어도(오프라인 등) 나머지 기능은 돌아가게 한다
  if (typeof ml5 !== "undefined") {
    preloadGesture();
    preloadFace();
  }
}

function setup() {
  pixelDensity(1);
  cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent("canvasWrap");
  textFont("Apple SD Gothic Neo, Malgun Gothic, sans-serif");
  setupCamera();
  makeDefaultStickers();
  setupUI();
  goTo("start");
}

function draw() {
  if (app.exporting) {
    drawExportFrame();
    return;
  }
  manageDetectors();

  if (app.screen === "start") drawStartScreen();
  else if (app.screen === "frame") drawFramePickScreen();
  else if (app.screen === "shoot") drawShootScreen();
  else if (app.screen === "decorate") drawDecorateScreen();
  else if (app.screen === "save") drawSaveScreen();
}

// 캔버스 안을 눌렀을 때만 처리한다
function inCanvas() {
  return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
}

function mousePressed() {
  if (app.exporting || !inCanvas()) return;
  if (app.screen === "frame") pickLayoutAt(mouseX, mouseY);
  else if (app.screen === "shoot") pickThumbAt(mouseX, mouseY);
  else if (app.screen === "decorate") {
    const p = toOutput(mouseX, mouseY);
    if (penActive()) penPressed(p.x, p.y);
    else stickerPressed(p.x, p.y, decoView.k);
  }
}

function mouseDragged() {
  if (app.screen !== "decorate" || app.exporting) return;
  const p = toOutput(mouseX, mouseY);
  if (penActive()) penDragged(p.x, p.y);
  else stickerDragged(p.x, p.y);
}

function mouseReleased() {
  penReleased();
  stickerReleased();
}

function typingInInput() {
  const el = document.activeElement;
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.type !== "checkbox" && el.type !== "range";
}

function keyPressed() {
  if (typingInInput() || app.exporting) return;
  if (app.screen === "shoot" && key === " ") {
    onShootButton();
    return false; // 스페이스바로 페이지가 내려가지 않게
  }
  if (app.screen === "decorate" && (keyCode === DELETE || keyCode === BACKSPACE)) {
    deleteSelectedSticker();
    return false;
  }
}
