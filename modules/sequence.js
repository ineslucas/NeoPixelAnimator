/**
 * sequence.js. Helpers for managing the animation order.
 *
 * The sequence is just an array of LED ids in the order they should
 * fire during animation. Stored in state.sequence.
 */

import { store } from "./state.js";

/** Auto-fill the sequence with every placed LED in placement order. */
export function fillFromPlacement() {
  store.update(s => {
    s.sequence = s.leds.map(led => led.id);
  });
}

/** Remove everything from the sequence. LEDs stay placed. */
export function clearSequence() {
  store.update(s => { s.sequence = []; });
}

/** Reverse the current sequence order. */
export function reverseSequence() {
  store.update(s => { s.sequence.reverse(); });
}
