// B: ml5.js faceMesh로 얼굴을 따라다니는 필터

let faceMesh = null;
let faces = [];
let faceRunning = false;
let faceSm = null; // 떨림을 줄인 좌표

const FACE_FILTERS = {
  none: "없음",
  dog: "강아지",
  glasses: "안경",
  blush: "볼터치",
};

function preloadFace() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, refineLandmarks: false, flipped: true });
}

function startFace() {
  if (!faceMesh || faceRunning || !camReady) return;
  faceMesh.detectStart(video, (r) => (faces = r));
  faceRunning = true;
}

function stopFace() {
  if (!faceMesh || !faceRunning) return;
  faceMesh.detectStop();
  faceRunning = false;
  faces = [];
  faceSm = null;
}

function avgPt(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function smoothPt(prev, next) {
  if (!prev) return next;
  return { x: lerp(prev.x, next.x, 0.5), y: lerp(prev.y, next.y, 0.5) };
}

// 필터에 쓰는 점만 골라 부드럽게 만든다
function facePoints() {
  if (faces.length === 0) return null;
  const kp = faces[0].keypoints;
  if (!kp || kp.length < 468) return null;
  const raw = {
    eyeA: avgPt(kp[33], kp[133]),
    eyeB: avgPt(kp[362], kp[263]),
    nose: kp[1],
    forehead: kp[10],
    cheekA: kp[205],
    cheekB: kp[425],
  };
  const sm = {};
  for (const k in raw) sm[k] = smoothPt(faceSm && faceSm[k], raw[k]);
  faceSm = sm;
  return sm;
}

function hasFace() {
  return faces.length > 0;
}

function drawFaceFilter(g, name) {
  if (name === "none") return;
  const p = facePoints();
  if (!p) return;
  // 화면 왼쪽 눈과 오른쪽 눈을 정해야 기울기가 뒤집히지 않는다
  const L = p.eyeA.x < p.eyeB.x ? p.eyeA : p.eyeB;
  const R = p.eyeA.x < p.eyeB.x ? p.eyeB : p.eyeA;
  const eyeD = dist(L.x, L.y, R.x, R.y);
  const ang = atan2(R.y - L.y, R.x - L.x);
  const mid = avgPt(L, R);

  g.push();
  if (name === "dog") drawDog(g, mid, p.nose, eyeD, ang);
  else if (name === "glasses") drawGlasses(g, L, R, mid, eyeD, ang);
  else if (name === "blush") drawBlush(g, p.cheekA, p.cheekB, eyeD, ang);
  g.pop();
}

function drawDog(g, mid, nose, d, ang) {
  // 귀: 두 눈 가운데에서 위쪽으로
  g.push();
  g.translate(mid.x, mid.y);
  g.rotate(ang);
  g.noStroke();
  for (const side of [-1, 1]) {
    g.push();
    g.translate(side * d * 0.95, -d * 1.25);
    g.rotate(side * 0.35);
    g.fill(120, 78, 50);
    g.ellipse(0, 0, d * 0.75, d * 1.1);
    g.fill(240, 170, 170);
    g.ellipse(0, d * 0.08, d * 0.4, d * 0.7);
    g.pop();
  }
  g.pop();
  // 코
  g.push();
  g.translate(nose.x, nose.y);
  g.rotate(ang);
  g.noStroke();
  g.fill(35);
  g.ellipse(0, 0, d * 0.5, d * 0.34);
  g.fill(255, 255, 255, 160);
  g.ellipse(-d * 0.08, -d * 0.06, d * 0.12, d * 0.07);
  g.pop();
}

function drawGlasses(g, L, R, mid, d, ang) {
  g.push();
  g.translate(mid.x, mid.y);
  g.rotate(ang);
  g.strokeWeight(max(3, d * 0.07));
  g.stroke(20);
  g.fill(30, 30, 40, 150);
  const r = d * 0.78;
  g.circle(-d / 2, 0, r);
  g.circle(d / 2, 0, r);
  g.noFill();
  g.line(-d / 2 + r / 2, 0, d / 2 - r / 2, 0);
  g.line(-d / 2 - r / 2, -r * 0.1, -d * 1.05, -r * 0.2);
  g.line(d / 2 + r / 2, -r * 0.1, d * 1.05, -r * 0.2);
  g.noStroke();
  g.fill(255, 255, 255, 120);
  g.ellipse(-d / 2 - r * 0.18, -r * 0.18, r * 0.22, r * 0.12);
  g.ellipse(d / 2 - r * 0.18, -r * 0.18, r * 0.22, r * 0.12);
  g.pop();
}

function drawBlush(g, a, b, d, ang) {
  g.noStroke();
  for (const c of [a, b]) {
    g.push();
    g.translate(c.x, c.y);
    g.rotate(ang);
    g.fill(255, 120, 150, 90);
    g.ellipse(0, 0, d * 0.6, d * 0.32);
    g.fill(255, 120, 150, 70);
    g.ellipse(0, 0, d * 0.4, d * 0.2);
    g.pop();
  }
}
