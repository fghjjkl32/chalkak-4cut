// A: 카메라, 카운트다운, 연속 촬영, 다시 찍기, 컷마다 움직임 모으기

const CAM_W = 640;
const CAM_H = 480;
const CLIP_W = 320;
const CLIP_H = 240;
const CLIP_STEP = 100; // 0.1초마다 한 장 (초당 10장)
const CLIP_MAX = 15; // 1.5초

let video; // 실제 카메라
let camReady = false;
let camG; // 좌우 반전, 색 필터, 얼굴 필터까지 입힌 카메라 한 장
let fakeCam; // 카메라를 쓸 수 없을 때 보여 줄 안내 화면
let camFailed = false;

let shoot = {
  phase: "idle", // idle, count, flash, done
  queue: [], // 아직 찍을 컷 번호들
  cut: -1, // 지금 찍는 컷 번호
  t0: 0,
  ring: [], // 최근 1.5초 프레임
  lastGrab: 0,
  selected: -1, // 다시 찍으려고 고른 컷
};

function setupCamera() {
  camG = createGraphics(CAM_W, CAM_H);
  fakeCam = createGraphics(CAM_W, CAM_H);
  video = createCapture(VIDEO, () => {
    camReady = true;
    onCameraReady();
  });
  video.size(CAM_W, CAM_H);
  video.hide();
}

// 카메라가 없을 때: 어두운 화면에 안내 문구만 (거울 반전되므로 글자는 미리 뒤집어 그린다)
function drawFakeCam() {
  const g = fakeCam;
  g.push();
  g.background(30, 32, 38);
  g.noStroke();
  g.fill(200);
  g.textAlign(CENTER, CENTER);
  g.textSize(22);
  g.translate(CAM_W, 0);
  g.scale(-1, 1);
  g.text(camFailed ? "카메라를 쓸 수 없습니다" : "카메라를 준비하는 중입니다", CAM_W / 2, CAM_H - 50);
  g.pop();
  return g;
}

// 매 프레임 camG를 새로 그린다
function renderCamera() {
  const src = camReady ? video : drawFakeCam();
  camG.push();
  camG.background(0);
  applyColorFilter(camG, app.colorFilter);
  camG.push();
  camG.translate(CAM_W, 0);
  camG.scale(-1, 1);
  camG.image(src, 0, 0, CAM_W, CAM_H);
  camG.pop();
  drawFaceFilter(camG, app.faceFilter);
  camG.pop(); // pop이 색 필터도 되돌린다
}

function isShooting() {
  return shoot.phase === "count" || shoot.phase === "flash";
}

function startShooting(indices) {
  if (isShooting()) return;
  shoot.queue = indices.slice();
  nextCut();
  refreshShootButtons();
}

function retake(i) {
  if (i < 0) return;
  startShooting([i]);
}

function nextCut() {
  if (shoot.queue.length === 0) {
    shoot.phase = "done";
    shoot.cut = -1;
    refreshShootButtons();
    return;
  }
  shoot.cut = shoot.queue.shift();
  shoot.phase = "count";
  shoot.t0 = millis();
  shoot.ring = [];
  shoot.lastGrab = 0;
}

function grabClipFrame() {
  const f = camG.get();
  f.resize(CLIP_W, CLIP_H);
  return f;
}

function updateShooting() {
  const now = millis();
  if (shoot.phase === "count") {
    if (now - shoot.lastGrab >= CLIP_STEP) {
      shoot.lastGrab = now;
      shoot.ring.push(grabClipFrame());
      if (shoot.ring.length > CLIP_MAX) shoot.ring.shift();
    }
    if (now - shoot.t0 >= 3000) capture();
  } else if (shoot.phase === "flash") {
    if (now - shoot.t0 >= 900) nextCut();
  }
}

function capture() {
  app.shots[shoot.cut] = camG.get();
  app.clips[shoot.cut] = shoot.ring.concat([grabClipFrame()]);
  shoot.phase = "flash";
  shoot.t0 = millis();
  playShutter();
}

// 카운트다운 숫자와 플래시 (r: 미리보기 사각형)
function drawShootOverlay(r) {
  push();
  if (shoot.phase === "count") {
    const left = 3 - floor((millis() - shoot.t0) / 1000);
    const frac = ((millis() - shoot.t0) % 1000) / 1000;
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(170 - frac * 40);
    fill(255, 255, 255, 230 - frac * 120);
    stroke(0, 90);
    strokeWeight(6);
    text(max(left, 1), r.x + r.w / 2, r.y + r.h / 2);
  } else if (shoot.phase === "flash") {
    const a = map(millis() - shoot.t0, 0, 400, 255, 0, true);
    noStroke();
    fill(255, a);
    rect(r.x, r.y, r.w, r.h);
  }
  pop();
}
