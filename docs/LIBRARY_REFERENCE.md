# Library reference

The full public API of the NeoPixel Planner codebase, module by module. Use this when extending the tool, swapping the export target, or just reading your way through the source.

Every module is in `modules/`. Import paths are relative to `app.js`.

## modules/state.js

The single source of truth. A small pub/sub store, no framework.

### `store`

Default-exported singleton. Three methods plus subscribe.

```js
import { store } from "./modules/state.js";

store.get();                 // returns the current state object
store.update(s => { ... });  // mutates state in place, then notifies
store.replace(newState);     // replaces state wholesale (used on hydrate)
const unsub = store.subscribe(state => { ... });
unsub();                     // call to remove subscriber
```

### `resetState()`

Resets the store to factory defaults. Used by the topbar Reset button.

### State shape

```js
{
  step: 1,                 // 1=place, 2=sequence, 3=style, 4=export
  leds: [{ id, x, y }],    // x, y are 0..1 normalized coordinates
  nextId: 0,
  sequence: [],            // array of LED ids in animation order
  style: {
    intervalMs:  120,      // ms between sequence steps
    trail:       3,        // 0..N fading tail length
    brightness:  200,      // 0..255 (applied at runtime on Arduino)
    size:        16,       // visual diameter on canvas (px)
    colorMode:   "single", // "single" | "rainbow" | "perStep"
    color:       "#691139",
    perStepColors: {},     // { sequenceIndex: "#rrggbb" } (v2)
  },
  export: {
    pin:  6,
    type: "NEO_GRB + NEO_KHZ800",
  },
  previewPlaying: true,
}
```

## modules/storage.js

Auto-save the state to `localStorage`, debounced.

```js
import { hydrate, attachAutoSave, setSaveStatusEl, save, load, clear }
  from "./modules/storage.js";

hydrate();                            // load saved state on app boot
setSaveStatusEl(domNode);             // optional, flashes "Saving…" / "Saved"
attachAutoSave();                     // subscribe to store, save on every change
save(state);                          // manually trigger a save
load();                               // returns saved state or null
clear();                              // wipe persisted state
```

Storage key: `neopixel-planner.v1`. Bump the suffix and add a migration if you change the state shape.

## modules/canvas.js

Renders LEDs on a `<canvas>`, handles pointer interactions for placement and sequencing.

### `setupCanvas(canvasEl, mode)`

Attaches the canvas controller. Returns a controller with `redraw()` and `destroy()`.

| Argument | Type | Description |
|----------|------|-------------|
| `canvasEl` | `HTMLCanvasElement` | The canvas to attach to. |
| `mode` | `"place"` or `"sequence"` | Determines tap/drag behavior. |

```js
const controller = setupCanvas(canvas, "place");
controller.redraw();   // force a re-render
controller.destroy();  // remove all listeners + observers (call before re-creating)
```

`"place"` mode: tap empty space to add an LED. Drag an existing LED to move.
`"sequence"` mode: tap an LED to add or remove from the animation sequence.

### CRUD helpers

```js
addLed(x, y);            // x, y in 0..1. Mutates store.
removeLastLed();         // Pops the most recently placed LED.
clearLeds();             // Removes all LEDs and clears sequence.
toggleInSequence(ledId); // Adds or removes the LED from sequence.
```

## modules/sequence.js

Helpers for the sequence array.

```js
import { fillFromPlacement, clearSequence, reverseSequence }
  from "./modules/sequence.js";

fillFromPlacement();  // sequence = leds.map(l => l.id)
clearSequence();      // sequence = []
reverseSequence();    // sequence.reverse()
```

## modules/animation.js

Live preview engine. Renders the chase-with-trail animation in a canvas at requestAnimationFrame rate.

### `setupAnimation(canvasEl)`

Returns a controller.

```js
const anim = setupAnimation(previewCanvas);
anim.resetHead();   // restart the animation from sequence index 0
anim.destroy();     // stop the loop, disconnect observers
```

The engine reads `state.previewPlaying`. Toggle that to pause/resume. The engine also reads `state.style.intervalMs` on every frame, so changing it during playback affects the next step.

### `colorForStep(style, seqIndex, seqLength)`

Returns an `"rgb(r,g,b)"` string for a given sequence position. Useful if you want to render LEDs somewhere outside the animation canvas (e.g., in a preview thumbnail, a timeline scrubber).

To **add a new color mode**, branch on `style.colorMode` here AND add the matching case in `modules/export.js`. Otherwise the preview and the Arduino output disagree.

## modules/presets.js

Default-exported array of preset objects. Each entry is a partial style applied via `Object.assign(state.style, preset.style)`.

```js
{
  name: "Chase",
  description: "Single dot walking forward",
  style: { trail: 0, intervalMs: 100, colorMode: "single", color: "#691139", brightness: 200 },
}
```

See `docs/ADD_PRESET.md` for guidance on contributing a new one.

## modules/export.js

Generates a complete Arduino sketch as a string.

### `generateArduinoCode(state)`

```js
import { generateArduinoCode } from "./modules/export.js";

const code = generateArduinoCode(store.get());
// → string. ~70 lines of valid C++ targeting Adafruit_NeoPixel.
```

Output is deterministic. Same input state produces the same output, so it's safe to render on every input change.

To **target a different LED library** (FastLED, NeoPixelBus, raw bit-banging), replace this module's template entirely. The signature stays `(state) -> string`, so callers don't change.

## app.js

Main orchestrator. Not intended to be imported by other modules. It wires DOM elements to module functions and handles step routing.

If you're hacking on it, the structure is:

1. Boot: `hydrate()`, `attachAutoSave()`, set up the save status indicator.
2. `showStep(n)` swaps which step section is `.active` and runs the step's setup hook.
3. Each step has a setup function in the `stepSetups` object that creates/destroys controllers (`setupCanvas`, `setupAnimation`).
4. Buttons in each step are wired with `addEventListener`.

## How to extend

A few common extensions and where to make changes.

### Add a new color mode

1. Add a case to `colorForStep()` in `modules/animation.js`.
2. Add the matching branch in `modules/export.js` so the Arduino code computes the same color.
3. Add a button to the segmented control in `app.js > buildStyleControls()`.
4. (Optional) Document it in `README.md` under "How the animation works".

### Add a preset

One entry in `modules/presets.js`. See `docs/ADD_PRESET.md`.

### Replace the Arduino target

Rewrite `modules/export.js` with the same `generateArduinoCode(state) -> string` signature. The rest of the app doesn't care what's inside.

### Persist additional state

Just add fields to the `initialState()` factory in `modules/state.js`. They'll auto-save and auto-hydrate. If the new field is required for the app to function, add a fallback in `modules/storage.js > load()` for users with older saved state.
