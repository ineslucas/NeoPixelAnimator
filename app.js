/**
 * app.js. Main orchestrator.
 *
 * Wires up:
 *   - the four step screens (PLACE > SEQUENCE > STYLE > EXPORT)
 *   - the topbar (back, reset, dot indicator)
 *   - all step-specific buttons
 *
 * Each module owns its own concern. This file is just glue.
 */

import { store, resetState }       from "./modules/state.js";
import { hydrate, attachAutoSave, setSaveStatusEl, clear as clearStorage } from "./modules/storage.js";
import { setupCanvas, removeLastLed, clearLeds } from "./modules/canvas.js";
import { fillFromPlacement, clearSequence } from "./modules/sequence.js";
import { setupAnimation, colorForStep } from "./modules/animation.js";
import { generateArduinoCode } from "./modules/export.js";
import { PRESETS } from "./modules/presets.js";

// ---- Boot sequence ----
hydrate();
setSaveStatusEl(document.getElementById("autosave"));
attachAutoSave();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Step routing.
function showStep(n) {
  store.update(s => { s.step = n; });
  $$(".step").forEach(el => el.classList.toggle("active", +el.dataset.step === n));
  $$(".dot").forEach(el => {
    const d = +el.dataset.step;
    el.classList.toggle("active", d === n);
    el.classList.toggle("done", d < n);
  });
  const back = $("#back-btn");
  if (n > 1) back.removeAttribute("hidden");
  else back.setAttribute("hidden", "");
  // Each step has its own setup hook.
  const setup = stepSetups[n];
  if (setup) setup();
  window.scrollTo({ top: 0, behavior: "instant" });
}

$("#back-btn").addEventListener("click", () => {
  const cur = store.get().step;
  if (cur > 1) showStep(cur - 1);
});

$("#reset-btn").addEventListener("click", () => {
  if (!confirm("Reset everything? This will clear placed lights, sequence, and saved state.")) return;
  resetState();
  clearStorage();
  showStep(1);
});

// =================== STEP 1: PLACE ===================
let placeCanvasController = null;
const stepSetups = {};
stepSetups[1] = () => {
  const canvas = $("#canvas-place");
  if (placeCanvasController) placeCanvasController.destroy();
  placeCanvasController = setupCanvas(canvas, "place");
  canvas.parentElement.dataset.mode = "place";
  updatePlaceCounter();
};

store.subscribe(updatePlaceCounter);
function updatePlaceCounter() {
  const el = $("#led-count");
  if (el) el.textContent = store.get().leds.length;
  // Disable Next if no LEDs.
  $("#next-1").disabled = store.get().leds.length === 0;
}

$("#undo-btn").addEventListener("click", removeLastLed);
$("#clear-btn").addEventListener("click", () => {
  if (store.get().leds.length === 0) return;
  if (confirm("Clear all placed lights?")) clearLeds();
});
$("#next-1").addEventListener("click", () => showStep(2));

// =================== STEP 2: SEQUENCE ===================
let seqCanvasController = null;
stepSetups[2] = () => {
  const canvas = $("#canvas-seq");
  if (seqCanvasController) seqCanvasController.destroy();
  seqCanvasController = setupCanvas(canvas, "sequence");
  canvas.parentElement.dataset.mode = "sequence";
  updateSeqCounter();
};

store.subscribe(updateSeqCounter);
function updateSeqCounter() {
  const el = $("#seq-count");
  if (el) el.textContent = store.get().sequence.length;
  $("#next-2").disabled = store.get().sequence.length === 0;
}

$("#seq-fill-btn").addEventListener("click", fillFromPlacement);
$("#seq-clear-btn").addEventListener("click", clearSequence);
$("#next-2").addEventListener("click", () => showStep(3));

// =================== STEP 3: STYLE ===================
let animController = null;
stepSetups[3] = () => {
  buildStyleControls();
  buildPresetList();
  const canvas = $("#canvas-preview");
  if (animController) animController.destroy();
  animController = setupAnimation(canvas);
};

$("#preview-toggle").addEventListener("click", () => {
  store.update(s => { s.previewPlaying = !s.previewPlaying; });
  $("#preview-toggle").textContent = store.get().previewPlaying ? "Pause" : "Play";
});

$("#next-3").addEventListener("click", () => showStep(4));

// Build the style sliders + color controls.
function buildStyleControls() {
  const container = $("#style-controls");
  container.innerHTML = "";

  const fields = [
    { key: "intervalMs", label: "Speed (ms / step)", min: 20,  max: 600, step: 5,  fmt: v => `${v} ms` },
    { key: "trail",      label: "Trail length",     min: 0,   max: 20,  step: 1,  fmt: v => v == 0 ? "single dot" : `${v}` },
    { key: "brightness", label: "Brightness",       min: 10,  max: 255, step: 1,  fmt: v => `${v}/255` },
    { key: "size",       label: "Dot size",         min: 6,   max: 40,  step: 1,  fmt: v => `${v}px` },
  ];

  for (const f of fields) {
    const c = document.createElement("div");
    c.className = "control";
    c.innerHTML = `
      <div class="control-head">
        <span class="control-label">${f.label}</span>
        <span class="control-value" data-val="${f.key}"></span>
      </div>
      <input type="range" min="${f.min}" max="${f.max}" step="${f.step}" data-key="${f.key}">
    `;
    container.appendChild(c);
    const input = c.querySelector("input");
    const out   = c.querySelector(".control-value");
    const sync = () => {
      input.value = store.get().style[f.key];
      out.textContent = f.fmt(store.get().style[f.key]);
    };
    sync();
    input.addEventListener("input", () => {
      const v = +input.value;
      store.update(s => { s.style[f.key] = v; });
      out.textContent = f.fmt(v);
    });
    store.subscribe(sync);
  }

  // Color mode segmented + color picker.
  const c = document.createElement("div");
  c.className = "control";
  c.innerHTML = `
    <div class="control-head">
      <span class="control-label">Color mode</span>
    </div>
    <div class="segmented" role="radiogroup">
      <button data-mode="single">Single</button>
      <button data-mode="rainbow">Rainbow</button>
    </div>
    <div style="margin-top: 12px;" id="color-picker-wrap">
      <input type="color" id="color-picker">
    </div>
  `;
  container.appendChild(c);

  const seg = c.querySelectorAll(".segmented button");
  const picker = c.querySelector("#color-picker");
  const pickerWrap = c.querySelector("#color-picker-wrap");

  const syncMode = () => {
    const mode = store.get().style.colorMode;
    seg.forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    // Hide picker for rainbow.
    pickerWrap.style.display = mode === "rainbow" ? "none" : "block";
    picker.value = store.get().style.color;
  };
  syncMode();
  seg.forEach(b => b.addEventListener("click", () => {
    store.update(s => { s.style.colorMode = b.dataset.mode; });
    syncMode();
  }));
  picker.addEventListener("input", () => {
    store.update(s => { s.style.color = picker.value; });
  });
  store.subscribe(syncMode);
}

function buildPresetList() {
  const list = $("#preset-list");
  list.innerHTML = "";
  for (const p of PRESETS) {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.type = "button";
    btn.innerHTML = `${p.name}<small>${p.description}</small>`;
    btn.addEventListener("click", () => {
      store.update(s => { Object.assign(s.style, p.style); });
    });
    list.appendChild(btn);
  }
}

// =================== STEP 4: EXPORT ===================
stepSetups[4] = () => {
  // Sync export options from state.
  $("#export-pin").value  = store.get().export.pin;
  $("#export-type").value = store.get().export.type;
  refreshCode();
};

$("#export-pin").addEventListener("input", e => {
  const v = parseInt(e.target.value, 10);
  if (Number.isFinite(v)) store.update(s => { s.export.pin = v; });
  refreshCode();
});
$("#export-type").addEventListener("change", e => {
  store.update(s => { s.export.type = e.target.value; });
  refreshCode();
});

function refreshCode() {
  const code = generateArduinoCode(store.get());
  $("#export-code").textContent = code;
}

$("#copy-btn").addEventListener("click", async () => {
  const code = $("#export-code").textContent;
  try {
    await navigator.clipboard.writeText(code);
    flashButton($("#copy-btn"), "Copied!");
  } catch {
    // Fallback for non-secure contexts.
    const ta = document.createElement("textarea");
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    flashButton($("#copy-btn"), "Copied!");
  }
});

$("#download-btn").addEventListener("click", () => {
  const code = $("#export-code").textContent;
  const blob = new Blob([code], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = "neopixel_animation.ino";
  a.click();
  URL.revokeObjectURL(url);
  flashButton($("#download-btn"), "Downloaded");
});

$("#back-to-style").addEventListener("click", () => showStep(3));

function flashButton(btn, text) {
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 1200);
}

// ---- Initial render ----
showStep(store.get().step || 1);
