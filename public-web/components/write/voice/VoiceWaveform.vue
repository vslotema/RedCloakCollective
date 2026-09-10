<script setup lang="ts">
// A microphone-reactive waveform for the voice-status pill — "voice cloning"
// style: a row of symmetric rounded bars that rise and fall with the live input
// level. Reads the shared analyser from `useMicAnalyser` and runs its own
// rAF draw loop while mounted (the pill only mounts it while voice is on).

const { mode } = useArticleVoice();
const { analyser, start, stop } = useMicAnalyser();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef");

const BAR_COUNT = 16;
const WIDTH = 132;
const HEIGHT = 28;
const GAP = 3;
const BAR_WIDTH = (WIDTH - GAP * (BAR_COUNT - 1)) / BAR_COUNT;

const reducedMotion =
  import.meta.client &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let raf = 0;
let bins: Uint8Array | null = null;
let barColor = "#de0038";

// Listening → primary (red), dictating → tertiary (green) — mirrors the
// colour convention of the old mic pulse ring.
function refreshColor() {
  const el = canvasRef.value;
  if (!el) return;
  const token = mode.value === "dictation" ? "--v-theme-tertiary" : "--v-theme-primary";
  const rgb = getComputedStyle(el).getPropertyValue(token).trim();
  if (rgb) barColor = `rgb(${rgb})`;
}

function draw() {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(WIDTH * dpr)) {
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = barColor;

  const node = analyser.value;
  if (node && !reducedMotion) {
    if (!bins || bins.length !== node.frequencyBinCount) {
      bins = new Uint8Array(node.frequencyBinCount);
    }
    node.getByteFrequencyData(bins);
  }

  const mid = BAR_COUNT / 2;
  for (let i = 0; i < BAR_COUNT; i++) {
    // Mirror the low-frequency energy around the centre for a symmetric shape.
    const dist = Math.abs(i - mid + 0.5);
    const level =
      bins && !reducedMotion
        ? bins[Math.min(bins.length - 1, Math.round(dist * 1.6))] / 255
        : 0;
    const h = Math.max(3, level * HEIGHT * (1 - dist / BAR_COUNT));
    const x = i * (BAR_WIDTH + GAP);
    const y = (HEIGHT - h) / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, BAR_WIDTH, h, BAR_WIDTH / 2);
    ctx.fill();
  }

  if (!reducedMotion) raf = requestAnimationFrame(draw);
}

watch(mode, refreshColor);

onMounted(async () => {
  refreshColor();
  await start();
  draw();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  void stop();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="voice-waveform"
    :width="WIDTH"
    :height="HEIGHT"
    aria-hidden="true"
  />
</template>

<style scoped lang="scss">
.voice-waveform {
  display: block;
  width: 132px;
  height: 28px;
}
</style>
