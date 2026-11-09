// D: 화면 전환, 버튼과 패널, 화면별 그리기

const SCREENS = ["start", "frame", "shoot", "decorate", "save"];
const SWATCHES = ["#111111", "#ffffff", "#ffd23f", "#ff8fab", "#8ecae6", "#b5e48c", "#3355e0", "#7b2cbf"];
const PATTERNS = { none: "없음", dot: "물방울", stripe: "줄무늬", check: "체크" };
const PREVIEW = { x: 20, y: 50, w: 720, h: 540 }; // 촬영 미리보기 자리
let decoView = { x: 0, y: 0, k: 1 };
let colorPicker;

const $ = (id) => document.getElementById(id);

function setupUI() {
  $("btnStart").onclick = () => goTo("frame");
  $("btnBackStart").onclick = () => goTo("start");
  $("btnToShoot").onclick = () => goTo("shoot");
  $("chkEight").onchange = (e) => (app.eight = e.target.checked);

  $("btnShoot").onclick = onShootButton;
  $("btnRetake").onclick = () => retake(shoot.selected);
  $("btnToDecorate").onclick = () => goTo("decorate");
  $("chkGesture").onchange = (e) => (app.gestureOn = e.target.checked);

  makeChips("faceChips", FACE_FILTERS, () => app.faceFilter, (v) => (app.faceFilter = v));
  makeChips("colorChips", mapLabels(COLOR_FILTERS), () => app.colorFilter, (v) => (app.colorFilter = v));
  makeChips("patternChips", PATTERNS, () => app.frame.pattern, (v) => (app.frame.pattern = v));

  // 프레임 색
  const sw = $("swatches");
  SWATCHES.forEach((c) => {
    const b = document.createElement("button");
    b.style.background = c;
    b.title = c;
    b.onclick = () => {
      app.frame.color = c;
      colorPicker.value(c);
      markSwatch();
    };
    sw.appendChild(b);
  });
  colorPicker = createColorPicker(app.frame.color);
  colorPicker.parent("pickerSlot");
  colorPicker.input(() => {
    app.frame.color = colorPicker.value();
    markSwatch();
  });
  markSwatch();

  $("caption").oninput = (e) => (app.frame.text = e.target.value);
  $("chkDate").onchange = (e) => (app.frame.showDate = e.target.checked);
  $("bgFile").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    loadImage(URL.createObjectURL(f), (img) => (app.frame.bgImage = shrinkImage(img)));
    e.target.value = "";
  };
  $("btnBgClear").onclick = () => (app.frame.bgImage = null);

  // 스티커
  const list = $("stickerList");
  defaultStickers.forEach((img) => {
    const b = document.createElement("button");
    const im = document.createElement("img");
    im.src = img.canvas.toDataURL();
    b.appendChild(im);
    b.onclick = () => addSticker(img, null);
    list.appendChild(b);
  });
  $("stickerFile").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    loadImage(URL.createObjectURL(f), (img) => {
      const small = shrinkImage(img);
      addSticker(autoCutout(small, Number($("tol").value)), small);
    });
    e.target.value = "";
  };
  $("tol").oninput = (e) => ($("tolVal").textContent = e.target.value);
  $("tol").onchange = (e) => recutSelected(Number(e.target.value));

  $("btnToSave").onclick = () => goTo("save");
  $("btnBackShoot").onclick = () => goTo("shoot");

  // 저장
  $("btnPNG").onclick = () => {
    savePNG();
    setSaveStatus("사진을 저장했습니다.");
  };
  $("btnGIF").onclick = () => {
    setSaveBusy(true);
    saveGIF();
  };
  $("btnVideo").onclick = () => {
    setSaveBusy(true);
    saveVideo();
  };
  $("btnBackDecorate").onclick = () => goTo("decorate");
  $("btnRestart").onclick = () => {
    app.stickers = [];
    selectedSticker = -1;
    goTo("start");
  };

  // 손동작
  onGesture("v", () => {
    if (app.screen !== "shoot") return;
    if (shoot.phase === "idle") onShootButton();
    else if (shoot.phase === "done" && shoot.selected >= 0) retake(shoot.selected);
  });
  onGesture("palm", () => {
    if (app.screen === "shoot" && shoot.phase === "done" && allShot()) goTo("decorate");
  });

  if (typeof ml5 === "undefined") {
    $("chkGesture").checked = false;
    $("chkGesture").disabled = true;
    app.gestureOn = false;
    $("camStatus").textContent += " 인식 라이브러리를 불러오지 못해 제스처와 얼굴 필터는 쓸 수 없습니다.";
  }
  setTimeout(() => {
    if (!camReady) {
      $("camStatus").textContent =
        "카메라를 쓸 수 없어 연습 화면으로 진행합니다. 주소창의 카메라 아이콘에서 권한을 허용한 뒤 새로고침하면 실제 카메라로 찍습니다.";
    }
  }, 5000);
  fitDisplay();
}

function mapLabels(obj) {
  const out = {};
  for (const k in obj) out[k] = obj[k].label;
  return out;
}

function makeChips(id, labels, get, set) {
  const box = $(id);
  for (const k in labels) {
    const b = document.createElement("button");
    b.textContent = labels[k];
    b.dataset.v = k;
    b.onclick = () => {
      set(k);
      [...box.children].forEach((c) => c.classList.toggle("on", c.dataset.v === get()));
    };
    box.appendChild(b);
  }
  [...box.children].forEach((c) => c.classList.toggle("on", c.dataset.v === get()));
}

function markSwatch() {
  [...$("swatches").children].forEach((b) => b.classList.toggle("on", b.title.toLowerCase() === app.frame.color.toLowerCase()));
}

function onCameraReady() {
  $("camStatus").textContent = "카메라가 준비되었습니다.";
}

function goTo(screen) {
  const prev = app.screen;
  app.screen = screen;
  document.querySelectorAll(".panel section").forEach((s) => s.classList.toggle("on", s.dataset.for === screen));
  const idx = SCREENS.indexOf(screen);
  document.querySelectorAll("#steps li").forEach((li) => {
    const i = SCREENS.indexOf(li.dataset.s);
    li.classList.toggle("on", i === idx);
    li.classList.toggle("done", i < idx);
  });
  if (screen === "frame") $("eightRow").style.display = app.layout === "2x4" ? "flex" : "none";
  if (screen === "shoot" && (prev === "frame" || app.shots.length !== shotCount())) resetShots();
  if (screen !== "decorate") selectedSticker = -1;
  refreshShootButtons();
}

function resetShots() {
  app.shots = new Array(shotCount()).fill(null);
  app.clips = [];
  shoot.phase = "idle";
  shoot.queue = [];
  shoot.selected = -1;
}

function allShot() {
  return app.shots.length === shotCount() && app.shots.every(Boolean);
}

function onShootButton() {
  if (isShooting()) return;
  if (shoot.phase === "done") resetShots();
  startShooting([...Array(shotCount()).keys()]);
}

function refreshShootButtons() {
  const done = shoot.phase === "done";
  $("btnShoot").disabled = isShooting();
  $("btnShoot").textContent = done ? "전체 다시 찍기" : `촬영 (${shotCount()}장)`;
  $("btnRetake").disabled = !(done && shoot.selected >= 0);
  $("btnToDecorate").disabled = !(done && allShot());
}

function setSaveStatus(msg) {
  $("saveStatus").textContent = msg;
}

function setSaveBusy(b) {
  ["btnPNG", "btnGIF", "btnVideo", "btnBackDecorate", "btnRestart"].forEach((id) => ($(id).disabled = b));
}

// 저장 중에는 캔버스 크기가 바뀌므로 화면에 보이는 높이를 고정한다
function fitDisplay() {
  if (!cnv) return;
  cnv.elt.style.height = CANVAS_H + "px";
  cnv.elt.style.width = "auto";
}

function stopAllDetectors() {
  stopGesture();
  stopFace();
}

function manageDetectors() {
  const wantGesture = app.screen === "shoot" && app.gestureOn && !isShooting();
  if (wantGesture) startGesture();
  else stopGesture();
  if (app.screen === "shoot" && app.faceFilter !== "none") startFace();
  else stopFace();
}

// ---------- 화면별 그리기 ----------

function drawStartScreen() {
  renderCamera();
  background(23, 24, 28);
  image(camG, 120, 50, 720, 540);
  noStroke();
  fill(0, 150);
  rect(120, 230, 720, 180);
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(72);
  text("찰칵 네컷", width / 2, 300);
  textStyle(NORMAL);
  textSize(20);
  text("브이 ✌ 한 번이면 촬영 시작. 꾸미고, 움직이는 네컷으로 저장하세요.", width / 2, 365);
}

function layoutCardRects() {
  return Object.keys(LAYOUTS).map((key, i) => ({ key, x: 60 + i * 300, y: 90, w: 240, h: 470 }));
}

function drawFramePickScreen() {
  background(245, 245, 248);
  fill(25);
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(26);
  text("레이아웃을 고르세요", width / 2, 50);
  for (const c of layoutCardRects()) {
    const L = LAYOUTS[c.key];
    const on = app.layout === c.key;
    const hover = mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.h;
    stroke(on ? color(51, 85, 224) : hover ? 160 : 215);
    strokeWeight(on ? 4 : 2);
    fill(255);
    rect(c.x, c.y, c.w, c.h, 14);
    // 작은 미리보기
    const k = min((c.w - 60) / L.w, (c.h - 110) / L.h);
    const ox = c.x + (c.w - L.w * k) / 2;
    const oy = c.y + 24;
    noStroke();
    fill(app.frame.color);
    rect(ox, oy, L.w * k, L.h * k, 4);
    fill(isLightColor(app.frame.color) ? 200 : 90);
    cellRects(c.key).forEach((r) => rect(ox + r.x * k, oy + r.y * k, r.w * k, r.h * k));
    fill(25);
    textStyle(BOLD);
    textSize(22);
    text(L.label, c.x + c.w / 2, c.y + c.h - 62);
    textStyle(NORMAL);
    textSize(15);
    fill(90);
    const n = c.key === "2x4" ? (app.eight ? "8장 따로" : "4장 · 두 줄로 나눠 갖기") : `${L.shots}장`;
    text(n, c.x + c.w / 2, c.y + c.h - 34);
  }
}

function pickLayoutAt(mx, my) {
  for (const c of layoutCardRects()) {
    if (mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h) {
      app.layout = c.key;
      $("eightRow").style.display = c.key === "2x4" ? "flex" : "none";
    }
  }
}

function thumbRects() {
  const n = shotCount();
  const rects = [];
  for (let i = 0; i < n; i++) {
    if (n <= 4) rects.push({ x: 760, y: 50 + i * 145, w: 180, h: 135 });
    else rects.push({ x: 760 + (i % 2) * 95, y: 50 + floor(i / 2) * 74, w: 85, h: 64 });
  }
  return rects;
}

function pickThumbAt(mx, my) {
  if (shoot.phase !== "done") return;
  thumbRects().forEach((r, i) => {
    if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
      shoot.selected = shoot.selected === i ? -1 : i;
    }
  });
  refreshShootButtons();
}

function shootMessage() {
  const n = shotCount();
  if (shoot.phase === "count" || shoot.phase === "flash") return `${n}장 중 ${shoot.cut + 1}번째 컷`;
  if (shoot.phase === "done") {
    if (shoot.selected >= 0) return `${shoot.selected + 1}번째 컷을 다시 찍으려면 ✌ 또는 "고른 컷 다시 찍기"`;
    return "다 찍었습니다. 컷을 눌러 다시 찍거나, ✋ 손바닥을 1초 보여 꾸미기로 넘어가세요.";
  }
  return "준비되면 촬영 버튼, 스페이스바, 또는 ✌ 브이를 1초 유지하세요.";
}

function drawShootScreen() {
  renderCamera();
  updateShooting();
  if (gestureRunning) updateGesture();
  else gest.pos = null;

  background(23, 24, 28);
  const r = PREVIEW;
  image(camG, r.x, r.y, r.w, r.h);
  drawShootOverlay(r);
  if (gestureRunning) drawGestureRing(r);

  noStroke();
  fill(255);
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  textSize(17);
  text(shootMessage(), 24, 26);
  if (app.faceFilter !== "none" && faceRunning && !hasFace()) {
    fill(0, 160);
    rect(r.x, r.y + r.h - 44, r.w, 44);
    fill(255);
    textAlign(CENTER, CENTER);
    text("얼굴을 화면 가운데로 가져와 주세요", r.x + r.w / 2, r.y + r.h - 22);
  }

  thumbRects().forEach((t, i) => {
    const img = app.shots[i];
    noStroke();
    if (img) drawCover(window, img, t);
    else {
      fill(50);
      rect(t.x, t.y, t.w, t.h);
      fill(130);
      textAlign(CENTER, CENTER);
      textSize(t.h * 0.35);
      text(i + 1, t.x + t.w / 2, t.y + t.h / 2);
    }
    noFill();
    strokeWeight(4);
    if (i === shoot.cut) {
      stroke(255, 210, 63);
      rect(t.x, t.y, t.w, t.h);
    } else if (i === shoot.selected) {
      stroke(80, 130, 255);
      rect(t.x, t.y, t.w, t.h);
    }
  });
  if (frameCount % 15 === 0) refreshShootButtons();
}

function drawComposite(images) {
  const L = outSize();
  const k = min((width - 80) / L.w, (height - 40) / L.h);
  decoView = { x: (width - L.w * k) / 2, y: (height - L.h * k) / 2, k };
  const g = composeLayout(images, k, true);
  noStroke();
  fill(0, 25);
  rect(decoView.x + 6, decoView.y + 8, g.width, g.height);
  image(g, decoView.x, decoView.y);
}

function toOutput(mx, my) {
  return { x: (mx - decoView.x) / decoView.k, y: (my - decoView.y) / decoView.k };
}

function drawDecorateScreen() {
  background(233, 234, 238);
  drawComposite(app.shots);
  drawStickerHandles(decoView);
}

function drawSaveScreen() {
  background(233, 234, 238);
  drawComposite(animatedImages(floor(millis() / CLIP_STEP)));
  noStroke();
  fill(90);
  textAlign(LEFT, TOP);
  textSize(14);
  text("칸마다 찍기 직전의 움직임이\n되풀이되는 미리보기입니다.", 20, 20);
}
