/**
 * state.js. A tiny pub/sub store.
 *
 * Why this exists: every module needs to read and react to the same data
 * (placed LEDs, sequence, style settings) without hard-coding references
 * to each other. This is the framework-free version of "the store". No
 * React, no Redux. Just one object and a Set of subscriber functions.
 *
 * Usage:
 *   import { store } from "./modules/state.js";
 *   store.subscribe(state => render(state));   // called on every change
 *   store.update(s => { s.leds.push(led); });  // mutate, then notify
 *   store.get();                               // read snapshot
 */

const initialState = () => ({
  // Step routing.
  step: 1, // 1=place, 2=sequence, 3=style, 4=export

  // Step 1: placed lights.
  // { id: number, x: 0..1, y: 0..1 }. Positions are normalized (0..1)
  // so the same data renders at any canvas size.
  leds: [],
  nextId: 0,

  // Step 2: animation sequence. Array of LED ids in click order.
  sequence: [],

  // Step 3: style/animation parameters.
  style: {
    intervalMs:   120,    // ms between sequence advances
    trail:        3,      // 0..N, fading tail behind the head
    brightness:   200,    // 0..255, applied at runtime on Arduino
    size:         16,     // visual diameter of each LED on canvas (px)
    colorMode:    "single",  // "single" | "rainbow" | "perStep"
    color:        "#691139", // base color when colorMode === "single"
    perStepColors: {},    // { sequenceIndex: "#rrggbb" } for "perStep" mode (v2)
  },

  // Step 4: export options.
  export: {
    pin:  6,
    type: "NEO_GRB + NEO_KHZ800",
  },

  // Misc.
  previewPlaying: true,
});

class Store {
  constructor(initial) {
    this._state = initial;
    this._subs = new Set();
  }

  get() {
    return this._state;
  }

  /**
   * Mutate state in place inside `mutator(state)`, then notify subscribers.
   * In-place mutation is fine here. There's only one store, no React, no
   * reconciliation. Subscribers re-render from the snapshot.
   */
  update(mutator) {
    mutator(this._state);
    this._notify();
  }

  /**
   * Replace the entire state (used by storage.load on app boot).
   */
  replace(newState) {
    this._state = newState;
    this._notify();
  }

  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn); // call this to unsubscribe
  }

  _notify() {
    for (const fn of this._subs) {
      try { fn(this._state); }
      catch (err) { console.error("Subscriber error:", err); }
    }
  }
}

export const store = new Store(initialState());

/** Reset state to factory defaults. Used by the topbar Reset button. */
export function resetState() {
  store.replace(initialState());
}
