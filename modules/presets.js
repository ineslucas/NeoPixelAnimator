/**
 * presets.js. Built-in style presets.
 *
 * Each preset is a partial style object that gets merged into state.style
 * when the user picks it. Adding a new preset is one entry in this array.
 * See docs/ADD_PRESET.md for guidance on adding your own.
 *
 * Names and feel borrowed from the Adafruit NeoPixel example sketches
 * (chase, theater chase, rainbow). Because there's no point reinventing
 * a vocabulary the LED community already shares.
 */

export const PRESETS = [
  {
    name: "Chase",
    description: "Single dot walking forward",
    style: { trail: 0, intervalMs: 100, colorMode: "single", color: "#691139", brightness: 200 },
  },
  {
    name: "Comet",
    description: "Long fading tail",
    style: { trail: 6, intervalMs: 60, colorMode: "single", color: "#00d4ff", brightness: 220 },
  },
  {
    name: "Theater",
    description: "Slow march, bright head",
    style: { trail: 1, intervalMs: 220, colorMode: "single", color: "#ffaa00", brightness: 180 },
  },
  {
    name: "Rainbow flow",
    description: "Hue cycles across sequence",
    style: { trail: 4, intervalMs: 80, colorMode: "rainbow", brightness: 200 },
  },
  {
    name: "Slow pulse",
    description: "Long trail, gentle pace",
    style: { trail: 12, intervalMs: 180, colorMode: "single", color: "#9d6cff", brightness: 160 },
  },
  {
    name: "Strobe",
    description: "Fast hop, no trail",
    style: { trail: 0, intervalMs: 40, colorMode: "single", color: "#ffffff", brightness: 255 },
  },
];
