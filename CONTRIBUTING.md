# Contributing

Thanks for considering a contribution. This is a small project. The bar is "does it make NeoPixel planning easier or the code clearer?"

## Ground rules

- No frameworks, no build step. Vanilla HTML/CSS/JS, ES modules. If you genuinely need a dependency, open an issue first to discuss.
- No tracking, no analytics. The tool runs entirely client-side and saves only to the user's own browser.
- Mobile-first. The canvas should work as well on a phone as on a laptop. Test both.
- Match preview to output. If you change how the preview renders an animation, change the Arduino template too. The contract is "what you see is what you flash."

## Getting set up

```bash
git clone https://github.com/ineslucas/NeoPixelAnimator
cd neopixel-planner
python3 -m http.server 8080
# Open http://localhost:8080
```

That's the entire dev environment. No `npm install`. The browser is the runtime.

For testing the generated Arduino code, you'll want:

- An Arduino IDE
- The Adafruit_NeoPixel library (Tools → Manage Libraries → search "Adafruit NeoPixel")
- A microcontroller and a NeoPixel strip. Any length works for testing.

## How to contribute

### Adding a preset

The friendliest contribution. See [docs/ADD_PRESET.md](docs/ADD_PRESET.md). One entry in `modules/presets.js` and a screenshot or recording in your PR.

### Reporting a bug

Open an issue with:

- What you did (steps to reproduce)
- What you expected
- What happened instead
- Browser + OS
- If relevant, the JSON of your saved state (DevTools → Application → Local Storage → `neopixel-planner.v1`)

### Submitting code

1. Fork and branch (`feat/short-description` or `fix/short-description`).
2. Keep changes focused. One feature or fix per PR.
3. Match the existing style: 2-space indent, single quotes for strings, semicolons. Codebase favors readability over cleverness.
4. Add or update comments where you change behavior. Comments explain *why*, not *what*.
5. If you change the animation algorithm, verify the Arduino sketch still produces matching behavior on real hardware. Or at least describe the test you did.
6. Open a PR with a short description and (if visual) a screenshot or screen recording.

### What I'm unlikely to merge

- Adding a JS framework or build tool.
- Tracking, analytics, or any form of telemetry.
- Server-side code (project is a static tool by design).
- Features that obscure the simple data model: placed LEDs, a sequence, and style parameters.

## License

By contributing you agree your contributions are licensed under the project's MIT license.
