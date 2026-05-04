/**
 * canvas.js. Canvas rendering and interaction.
 *
 * Two modes:
 *   "place"    : tap empty space to add LED, drag existing LED to move
 *   "sequence" : tap LED to add or remove from the sequence
 *
 * Positions are stored in the store as normalized 0..1 coordinates so
 * the same data renders correctly at any canvas size (mobile, desktop,
 * resized window).
 */

import { store } from "./state.js";

const HIT_RADIUS = 18; // pixels. Slightly larger than the LED for easy tapping.
const DPR = () => Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

export function setupCanvas(canvasEl, mode) {
  const ctx = canvasEl.getContext("2d");

  // Sync the bitmap size to the CSS size × devicePixelRatio for crisp rendering.
  const resize = () => {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = DPR();
    canvasEl.width  = Math.round(rect.width  * dpr);
    canvasEl.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  };

  // ---- Drawing ----
  const draw = () => {
    const rect = canvasEl.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const { leds, sequence, style } = store.get();

    // Soft grid texture so the canvas doesn't look like a void.
    drawGrid(ctx, W, H);

    // Draw each LED. Sequence-mode shows a number badge for sequence position.
    leds.forEach(led => {
      const cx = led.x * W;
      const cy = led.y * H;
      const seqIndex = sequence.indexOf(led.id);
      const inSequence = seqIndex !== -1;
      drawLed(ctx, cx, cy, style.size, {
        active: inSequence,
        index:  inSequence ? seqIndex + 1 : null,
        mode,
      });
    });
  };

  function drawGrid(ctx, W, H) {
    // Sparse dot grid. A faint placeholder, low contrast.
    ctx.save();
    ctx.fillStyle = "rgba(14,15,18,0.06)";
    const step = 24;
    for (let x = step; x < W; x += step) {
      for (let y = step; y < H; y += step) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  function drawLed(ctx, x, y, size, opts) {
    ctx.save();
    if (opts.mode === "sequence" && !opts.active) {
      // Unselected LEDs in sequence-mode: outline only.
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(14,15,18,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Filled red dot.
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#691139";
      ctx.fill();
    }
    if (opts.index != null) {
      // Badge with sequence index.
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "white";
      ctx.fillText(String(opts.index), x, y);
    }
    ctx.restore();
  }

  // ---- Hit testing ----
  function hitTest(px, py) {
    const rect = canvasEl.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const { leds } = store.get();
    // Iterate in reverse so most recently placed LEDs win on overlap.
    for (let i = leds.length - 1; i >= 0; i--) {
      const led = leds[i];
      const cx = led.x * W;
      const cy = led.y * H;
      if (Math.hypot(px - cx, py - cy) <= HIT_RADIUS) return led;
    }
    return null;
  }

  function eventPos(e) {
    const rect = canvasEl.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x, y };
  }

  // ---- Place mode interaction ----
  let dragging = null;
  let dragMoved = false;

  const onPointerDown = (e) => {
    e.preventDefault();
    const { x, y } = eventPos(e);
    const hit = hitTest(x, y);

    if (mode === "place") {
      if (hit) {
        dragging = hit;
        dragMoved = false;
        canvasEl.parentElement.dataset.mode = "dragging";
      } else {
        // No hit + place mode: defer adding to onPointerUp so we can
        // distinguish a tap from the start of a drag-on-empty-space.
        // (Don't drag empty, but this avoids "ghost" placements during scroll.)
        dragging = "new";
        dragMoved = false;
      }
    } else if (mode === "sequence") {
      if (hit) toggleInSequence(hit.id);
    }
  };

  const onPointerMove = (e) => {
    if (!dragging || dragging === "new") return;
    e.preventDefault();
    const { x, y } = eventPos(e);
    const rect = canvasEl.getBoundingClientRect();
    dragMoved = true;
    store.update(s => {
      const led = s.leds.find(l => l.id === dragging.id);
      if (led) {
        led.x = clamp01(x / rect.width);
        led.y = clamp01(y / rect.height);
      }
    });
  };

  const onPointerUp = (e) => {
    if (dragging === "new") {
      // Place a new LED at the tap position.
      const { x, y } = eventPos(e);
      const rect = canvasEl.getBoundingClientRect();
      addLed(clamp01(x / rect.width), clamp01(y / rect.height));
    }
    dragging = null;
    canvasEl.parentElement.dataset.mode = mode;
  };

  // Pointer events for unified mouse/touch handling.
  canvasEl.addEventListener("pointerdown", onPointerDown);
  canvasEl.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  // ---- Lifecycle ----
  const ro = new ResizeObserver(resize);
  ro.observe(canvasEl);
  resize();

  // Re-render whenever state changes.
  const unsub = store.subscribe(draw);

  return {
    redraw: draw,
    destroy() {
      ro.disconnect();
      unsub();
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    },
  };
}

// ---- LED CRUD ----
export function addLed(x, y) {
  store.update(s => {
    s.leds.push({ id: s.nextId++, x, y });
  });
}

export function removeLastLed() {
  store.update(s => {
    const removed = s.leds.pop();
    if (removed) {
      // Also remove from sequence.
      s.sequence = s.sequence.filter(id => id !== removed.id);
    }
  });
}

export function clearLeds() {
  store.update(s => {
    s.leds = [];
    s.sequence = [];
    s.nextId = 0;
  });
}

// ---- Sequence helpers (also used by sequence.js) ----
export function toggleInSequence(ledId) {
  store.update(s => {
    const idx = s.sequence.indexOf(ledId);
    if (idx >= 0) s.sequence.splice(idx, 1);
    else s.sequence.push(ledId);
  });
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
