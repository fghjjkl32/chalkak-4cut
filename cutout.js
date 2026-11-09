// C: 자동 누끼 (가장자리에서부터 배경색과 비슷한 픽셀을 이어서 투명하게)

const CUT_MAX = 500; // 올린 이미지는 이 크기 안으로 줄여서 처리한다

function shrinkImage(img) {
  const c = img.get();
  if (c.width > CUT_MAX || c.height > CUT_MAX) {
    if (c.width >= c.height) c.resize(CUT_MAX, 0);
    else c.resize(0, CUT_MAX);
  }
  return c;
}

function autoCutout(src, tol) {
  const img = src.get(); // 원본은 그대로 두고 복사본에 작업
  img.loadPixels();
  const w = img.width;
  const h = img.height;
  const px = img.pixels;

  // 네 모서리 색의 평균을 배경색으로 본다
  let br = 0, bg = 0, bb = 0;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = (y * w + x) * 4;
    br += px[i];
    bg += px[i + 1];
    bb += px[i + 2];
  }
  br /= 4;
  bg /= 4;
  bb /= 4;

  const limit = tol * 2; // 슬라이더 0~120 → 색 거리 0~240
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length > 0) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    const alreadyClear = px[i + 3] < 10;
    if (!alreadyClear) {
      const dr = px[i] - br, dg = px[i + 1] - bg, db = px[i + 2] - bb;
      if (Math.sqrt(dr * dr + dg * dg + db * db) > limit) continue;
    }
    px[i + 3] = 0;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  img.updatePixels();
  return trimTransparent(img);
}

// 투명한 테두리를 잘라 스티커 손잡이가 그림에 딱 붙게 한다
function trimTransparent(img) {
  img.loadPixels();
  const w = img.width, h = img.height, px = img.pixels;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return img; // 전부 지워졌으면 그대로 돌려준다
  return img.get(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
