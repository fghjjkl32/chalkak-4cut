// B: 셔터 소리 (p5.sound 없이 브라우저 내장 Web Audio로 짧은 소리를 만든다)

let audioCtx = null;

function playShutter() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const rate = audioCtx.sampleRate;
    const n = floor(rate * 0.12);
    const buf = audioCtx.createBuffer(1, n, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.4;
    src.connect(gain).connect(audioCtx.destination);
    src.start();
  } catch (e) {
    // 소리가 안 나도 촬영은 계속한다
  }
}
