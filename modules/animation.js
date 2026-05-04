/**
 * animation.js. Live preview of the chase-with-trail animation.
 *
 * The preview engine simulates exactly what the exported Arduino code
 * will do, so what you see here is what the strip will do. If you
 * change this, change the Arduino template in export.js too.
 *
 * Algorithm (per frame at intervalMs cadence):
 *   - "head" walks forward through the sequence by one position
 *   - "trail" of N LEDs behind the head are also lit, fading by index
 *   - all other LEDs are off
 *
 * Trail of 0 = single LED hopping. Trail = sequence.length = always-on
 * (with a brightness gradient).
 */

import { store } from "./state.js";

let rafId = null;
let lastTick = 0;

export function setupAnimation(canvasEl) {
  const ctx = canvasEl.getContext("2d");
  let head = 0; // current position in the sequence

  const dpr = () => Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const resize = () => {
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width  = Math.round(rect.width  * dpr());
    canvasEl.height = Math.round(rect.height * dpr());
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvasEl);

  const tick = (now) => {
    const state = store.get();
    if (!state.previewPlaying) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    // Advance head only when intervalMs has elapsed.
    const interval = Math.max(20, state.style.intervalMs);
    if (now - lastTick >= interval) {
      lastTick = now;
      const seqLen = state.sequence.length;
      if (seqLen > 0) head = (head + 1) % seqLen;
    }

    render(ctx, canvasEl, state, head);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    destroy() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      ro.disconnect();
    },
    resetHead() { head = 0; },
  };
}

function render(ctx, canvas, state, head) {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  // Dark "physical" background. Matches preview-wrap CSS color.
  ctx.fillStyle = "#0e0f12";
  ctx.fillRect(0, 0, W, H);

  const { leds, sequence, style } = state;
  if (leds.length === 0) {
    drawEmptyMessage(ctx, W, H, "Place some lights first.");
    return;
  }
  if (sequence.length === 0) {
    // Show LEDs as faint outlines.
    leds.forEach(led => drawDot(ctx, led.x * W, led.y * H, style.size, "rgba(255,255,255,0.18)", "outline"));
    drawEmptyMessage(ctx, W, H, "Build a sequence to see motion.");
    return;
  }

  // Draw all LEDs as faint outlines first.
  leds.forEach(led => drawDot(ctx, led.x * W, led.y * H, style.size, "rgba(255,255,255,0.10)", "outline"));

  // Compute trail positions: head, head-1, head-2, ... up to trail length.
  const trail = Math.min(style.trail, sequence.length - 1);
  for (let t = 0; t <= trail; t++) {
    const seqPos = (head - t + sequence.length) % sequence.length;
    const ledId = sequence[seqPos];
    const led = leds.find(l => l.id === ledId);
    if (!led) continue;

    const fade = 1 - (t / (trail + 1)); // 1.0 at head, fades to ~0
    const color = colorForStep(state.style, seqPos, sequence.length);
    drawDot(ctx, led.x * W, led.y * H, style.size, applyFade(color, fade), "filled");
    // Add a soft glow for the head.
    if (t === 0) drawGlow(ctx, led.x * W, led.y * H, style.size, color);
  }
}

function drawDot(ctx, x, y, size, color, fillMode) {
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  if (fillMode === "filled") {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawGlow(ctx, x, y, size, rgbColor) {
  // Radial gradient for a halo around the head LED.
  const r = size * 1.8;
  const g = ctx.createRadialGradient(x, y, size / 2, x, y, r);
  g.addColorStop(0, applyFade(rgbColor, 0.5));
  g.addColorStop(1, applyFade(rgbColor, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawEmptyMessage(ctx, W, H, text) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);
  ctx.restore();
}

/**
 * Color for a given step in the sequence, depending on color mode.
 *   "single":  same color everywhere
 *   "rainbow": hue cycles 0..360 across the sequence
 *   "perStep": user-set color per sequence index (falls back to single)
 *
 * Returns "rgb(r,g,b)" so we can apply alpha-fade easily.
 */
export function colorForStep(style, seqIndex, seqLength) {
  if (style.colorMode === "rainbow") {
    const hue = (seqIndex / Math.max(1, seqLength)) * 360;
    return hslToRgb(hue, 0.9, 0.55);
  }
  if (style.colorMode === "perStep") {
    const c = style.perStepColors[seqIndex] || style.color;
    return hexToRgb(c);
  }
  return hexToRgb(style.color);
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "rgb(105,17,57)";
  return `rgb(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)})`;
}

function hslToRgb(h, s, l) {
  // h in 0..360, s+l in 0..1
  h = h / 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return `rgb(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)})`;
}

function applyFade(rgbColor, alpha) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(rgbColor);
  if (!m) return rgbColor;
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}
