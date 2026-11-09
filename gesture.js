// B: ml5.js handPose로 손동작 인식 (브이 = 촬영, 손바닥 = 다음 화면)

let handPose = null;
let hands = [];
let gestureRunning = false;

const HOLD_MS = 1000; // 이만큼 유지해야 인정
const COOLDOWN_MS = 3000; // 한 번 동작한 뒤 쉬는 시간

let gest = {
  name: "none",
  since: 0,
  progress: 0,
  coolUntil: 0,
  pos: null, // 손 위치 (카메라 좌표)
  handlers: {},
};

function preloadGesture() {
  handPose = ml5.handPose({ maxHands: 1, flipped: true });
}

function startGesture() {
  if (!handPose || gestureRunning || !camReady) return;
  handPose.detectStart(video, (r) => (hands = r));
  gestureRunning = true;
}

function stopGesture() {
  if (!handPose || !gestureRunning) return;
  handPose.detectStop();
  gestureRunning = false;
  hands = [];
  gest.name = "none";
  gest.progress = 0;
  gest.pos = null;
}

function onGesture(name, fn) {
  gest.handlers[name] = fn;
}

// 손가락 끝이 둘째 마디보다 손목에서 더 멀면 펴진 것으로 본다
function fingerOpen(kp, tip, pip) {
  const w = kp[0];
  return dist(w.x, w.y, kp[tip].x, kp[tip].y) > dist(w.x, w.y, kp[pip].x, kp[pip].y) * 1.1;
}

function readGesture() {
  if (hands.length === 0) return "none";
  const kp = hands[0].keypoints;
  if (!kp || kp.length < 21) return "none";
  const index = fingerOpen(kp, 8, 6);
  const middle = fingerOpen(kp, 12, 10);
  const ring = fingerOpen(kp, 16, 14);
  const pinky = fingerOpen(kp, 20, 18);
  if (index && middle && !ring && !pinky) return "v";
  if (index && middle && ring && pinky) return "palm";
  return "none";
}

function updateGesture() {
  const now = millis();
  const name = readGesture();
  gest.pos = hands.length ? hands[0].keypoints[9] : null;
  if (name !== gest.name) {
    gest.name = name;
    gest.since = now;
  }
  const cooling = now < gest.coolUntil;
  gest.progress = name === "none" || cooling ? 0 : min(1, (now - gest.since) / HOLD_MS);
  if (gest.progress >= 1) {
    gest.coolUntil = now + COOLDOWN_MS;
    gest.progress = 0;
    const fn = gest.handlers[name];
    if (fn) fn();
  }
}

// 손 옆에 유지 진행 고리를 그린다 (r: 미리보기 사각형)
function drawGestureRing(r) {
  if (!gest.pos) return;
  const k = r.w / CAM_W;
  const x = r.x + gest.pos.x * k;
  const y = r.y + gest.pos.y * k;
  push();
  noFill();
  strokeWeight(8);
  stroke(255, 255, 255, 90);
  circle(x, y, 90);
  if (gest.progress > 0) {
    stroke(255, 210, 63);
    arc(x, y, 90, 90, -HALF_PI, -HALF_PI + TWO_PI * gest.progress);
  }
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(30);
  text(gest.name === "v" ? "✌" : gest.name === "palm" ? "✋" : "", x, y);
  pop();
}
