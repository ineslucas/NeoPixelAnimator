/**
 * storage.js. Persist state to localStorage with debounced writes.
 *
 * Save on every state change, but coalesce rapid changes into a single
 * write. Otherwise dragging a slider hits storage 60 times a second.
 */

import { store } from "./state.js";

const KEY = "neopixel-planner.v1";
const DEBOUNCE_MS = 250;

let saveTimer = null;
let saveStatus = null; // The DOM node that flashes "Saving…" / "Saved"

export function setSaveStatusEl(el) { saveStatus = el; }

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Sanity check. If the saved shape doesn't match what we expect,
    // discard it rather than crash. Migrations can be added later.
    if (typeof data !== "object" || !Array.isArray(data.leds)) return null;
    return data;
  } catch (err) {
    console.warn("Failed to load saved state:", err);
    return null;
  }
}

export function save(state) {
  if (saveStatus) saveStatus.classList.add("saving");
  if (saveStatus) saveStatus.textContent = "Saving…";

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      if (saveStatus) {
        saveStatus.classList.remove("saving");
        saveStatus.textContent = "Saved";
      }
    } catch (err) {
      console.error("Failed to save state:", err);
      if (saveStatus) saveStatus.textContent = "Save failed";
    }
  }, DEBOUNCE_MS);
}

export function clear() {
  try { localStorage.removeItem(KEY); }
  catch (err) { console.warn("Failed to clear saved state:", err); }
}

/** Wire up auto-save: subscribe to store, call save() on every change. */
export function attachAutoSave() {
  store.subscribe(state => save(state));
}

/** Hydrate the store from localStorage on startup. */
export function hydrate() {
  const saved = load();
  if (saved) store.replace(saved);
}
