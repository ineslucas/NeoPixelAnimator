# Add your own preset

A preset is a one-tap shortcut that fills in the style sliders with a known-good combination.

## The data shape

Each preset is one entry in the array exported from `modules/presets.js`:

```js
{
  name:        "Your name here",
  description: "One-line summary",
  style: {
    intervalMs:  100,        // ms between sequence steps
    trail:       3,          // 0..N (LEDs of fading tail)
    brightness:  200,        // 0..255
    colorMode:   "single",   // "single" | "rainbow" | "perStep"
    color:       "#8A2B4E",  // base color when colorMode === "single"
  }
}
```

You don't have to specify every field. Only the ones that matter for your preset. The rest stay at whatever the user already set. So for a "fast" preset, you can write just `{ intervalMs: 40 }`.

## Step by step

1. Open `modules/presets.js`.
2. Add a new entry to the `PRESETS` array. Example:

   ```js
   {
     name: "Heartbeat",
     description: "Two quick pulses, then a pause",
     style: {
       intervalMs: 90,
       trail: 8,
       brightness: 220,
       colorMode: "single",
       color: "#ff3366",
     },
   },
   ```

3. Save and reload the page. Your preset shows up in step 3 under "Or pick a preset".

## Picking values that feel good

A few rules of thumb:

- `intervalMs` < 60 feels twitchy. > 300 feels meditative. 80-150 is the sweet spot for most chases.
- `trail` ≈ sequence length / 4 gives a comet feel without filling the strip.
- `brightness` of 255 is rarely the right answer. LEDs hit "white-hot" perceptually around 180-200 and consume way less power.
- Rainbow mode looks best with longer sequences (15+ LEDs) and a moderate trail.

## Sharing your preset

If you've found a combo you like, open a PR adding it to `presets.js`. Include in the PR description:

- A short screen recording or GIF of the preset running on real hardware (or in the in-browser preview).
- The sequence length you tested at.
- Any quirks ("looks weird below 8 LEDs" or "needs trail ≥ 4").

A handful of well-chosen presets will help newcomers far more than dozens of similar ones, so prefer "this is genuinely different" over "this is a small tweak."

## Why no per-LED-position presets?

Because the LED layout is what *you* are designing. It's the user's contribution. Presets here are about the *animation*, applied to whatever layout the user has built. Position and animation are intentionally decoupled.

If you want to ship a layout (e.g., "a cheetah with 200 dots placed for you"), that'd be a separate feature: saving and loading a layout JSON. Open an issue if you want to work on it.
