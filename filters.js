// C: 색 필터 (캔버스 내장 filter를 써서 미리보기에서도 빠르다)

const COLOR_FILTERS = {
  none: { label: "원본", css: "none" },
  gray: { label: "흑백", css: "grayscale(1) contrast(1.08)" },
  sepia: { label: "세피아", css: "sepia(0.85) contrast(1.05)" },
  warm: { label: "따뜻한 톤", css: "sepia(0.25) saturate(1.35) brightness(1.05)" },
  cool: { label: "차가운 톤", css: "saturate(0.85) hue-rotate(12deg) brightness(1.06)" },
};

// g에 이후 그리는 그림에 색 필터를 건다. g.pop()을 하면 원래대로 돌아간다.
function applyColorFilter(g, name) {
  const f = COLOR_FILTERS[name] || COLOR_FILTERS.none;
  g.drawingContext.filter = f.css;
}
