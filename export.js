// A: PNG, GIF, 동영상(WebM) 저장

let exportK = 1; // 결과물 대비 캔버스 배율
let exportTick = 0; // GIF용 프레임 번호
let exportStart = 0; // 동영상용 시작 시각

function savePNG() {
  const g = composeLayout(app.shots, 1, true);
  saveCanvas(g, "chalkak-4cut", "png");
}

// 움직임을 앞으로 갔다가 되돌아오게(부메랑) 재생할 때의 프레임 번호
function pingPong(i, len) {
  if (len <= 1) return 0;
  const period = len * 2 - 2;
  const k = i % period;
  return k < len ? k : period - k;
}

// i번째 프레임의 칸별 이미지
function animatedImages(i) {
  return app.shots.map((shot, c) => {
    const clip = app.clips[c];
    if (!clip || clip.length === 0) return shot;
    return clip[pingPong(i, clip.length)];
  });
}

function clipLength() {
  return max(1, ...app.clips.filter(Boolean).map((c) => c.length));
}

function beginExport(mode, k) {
  app.exporting = mode;
  exportK = k;
  exportTick = 0;
  exportStart = millis();
  stopAllDetectors();
  const L = outSize();
  resizeCanvas(round(L.w * k), round(L.h * k));
  fitDisplay();
}

function endExport() {
  app.exporting = null;
  resizeCanvas(CANVAS_W, CANVAS_H);
  frameRate(60);
  fitDisplay();
  setSaveBusy(false);
}

// 저장 중에는 캔버스에 결과물만 그린다 (버튼이나 안내 문구가 찍히지 않게)
function drawExportFrame() {
  let i;
  if (app.exporting === "gif") i = exportTick++;
  else i = floor((millis() - exportStart) / CLIP_STEP);
  const g = composeLayout(animatedImages(i), exportK, true);
  image(g, 0, 0, width, height);
}

async function saveGIF() {
  const L = outSize();
  const frames = clipLength() * 2 - 2; // 부메랑 한 바퀴
  setSaveStatus("GIF를 만드는 중입니다. 10~30초 정도 걸립니다.");
  beginExport("gif", 400 / L.w);
  frameRate(10); // GIF 한 장면 = 0.1초
  try {
    await saveGif("chalkak-4cut", max(frames, 2), {
      delay: 0,
      units: "frames",
      silent: false,
      notificationDuration: 0,
      notificationID: "progressBar",
    });
    setSaveStatus("GIF를 저장했습니다.");
  } catch (e) {
    console.error(e);
    setSaveStatus("GIF를 만들지 못했습니다.");
  } finally {
    endExport();
  }
}

function saveVideo() {
  if (!window.MediaRecorder || !cnv.elt.captureStream) {
    setSaveStatus("이 브라우저는 동영상 녹화를 지원하지 않습니다. Chrome에서 열어 주세요.");
    return;
  }
  const L = outSize();
  beginExport("video", L.w > 600 ? 0.75 : 1);
  const stream = cnv.elt.captureStream(30);
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  rec.onstop = () => {
    endExport();
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chalkak-4cut.webm";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setSaveStatus("동영상을 저장했습니다.");
  };
  setSaveStatus("동영상을 녹화하는 중입니다. 약 6초 걸립니다.");
  rec.start();
  // 부메랑 두 바퀴 길이만큼 녹화
  const ms = max(2, clipLength() * 2 - 2) * CLIP_STEP * 2;
  setTimeout(() => rec.stop(), max(ms, 3000));
}
