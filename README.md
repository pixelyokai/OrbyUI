# OrbyUI

![OrbyUI](public/og.png)

Design animated WebGL orbs in the browser, then export them as drop-in snippets
with **no runtime dependencies**.

Pick a style, material and mood, tune the shader by hand, and copy a
self-contained component straight into your project. Nothing to install, no
package to track. The export is a single file.

---

## What it does

- **Four orb styles** — Volume, Halo, Plasma, Iris
- **Nine materials** — Energy, Grain, Glass, Frost, Metal, Silk, Liquid, Dither, ASCII
- **Eight presets** — Lumen, Nova, Aurora, Ember, Tide, Prism, Void, Pulse
- **Four states** — Idle, Listen, Think, Speak, each with its own tempo that you can configure
- **Direct shader control** — glow, glass, bloom, chromatic aberration, refraction,
  dispersion, fresnel, noise algorithm, iridescence, pointer follow
- **Motion control** — speed, rotation, distortion, noise speed
- **Your settings persist** to `localStorage` and rehydrate on return

### Export formats

| Format | File | Notes |
| --- | --- | --- |
| React | `AiOrb.tsx` | One component, `react` as the only peer |
| JavaScript | `ai-orb.js` | Mount on any element, zero dependencies |
| HTML | `orb.html` | Open locally or drop on any static host |
| TypeScript | `ai-orb.d.ts` | Typings to sit beside the JS or React file |

Every export is generated in the browser from your current configuration, with
the shader inlined. There is no build step and nothing to `npm install`.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm test             # node:test
npm run lint         # eslint
```

Works on Windows, macOS and Linux. `dev`, `build` and `preview` all route
through `scripts/with-app-env.mjs`, which merges `.grok/app-env.json` into the
environment so the dev server and the build can never disagree about a flag.

---

## How it's built

| | |
| --- | --- |
| Framework | TanStack Start · React 19 |
| Styling | Tailwind v4, design tokens in `src/styles.css` |
| Rendering | Custom WebGL renderer — no three.js |
| State | Zustand, persisted to `localStorage` |
| Scrolling | Lenis |

```
src/
  components/studio/    the studio UI — panel, canvas, export dialog
  components/ui/        dialog, tooltip, slider primitives
  lib/orb/              renderer, shaders, presets, codegen, store
  lib/highlight.ts      dependency-free syntax tokeniser
  lib/theme.ts          theme, read from the DOM rather than context
```

Two deliberate choices worth knowing about:

**The orb runs entirely client-side.** No API, no database, no user input
reaches a server. The shader executes on the visitor's GPU.

**No syntax-highlighting library.** The export dialog colours code with a small
in-repo tokeniser (`src/lib/highlight.ts`). Pulling in Shiki or Prism to
decorate a snippet whose whole pitch is "no extra packages" felt like the wrong
trade.

### Design system

The interface is ported from a [Paper](https://paper.design) file. Colours,
spacing, radii and typography live as CSS custom properties in
`src/styles.css`, mapped to Tailwind v4 `@theme` tokens so light and dark stay
in lockstep.

> **Tailwind v4 note.** `translate-*`, `rotate-*` and `scale-*` compile to the
> standalone `translate` / `rotate` / `scale` CSS properties, **not** to
> `transform`. Any hand-written keyframe or transition touching them must use
> those same properties — mixing in `transform` applies the offset twice.

---

## Notes on dependencies

- **`agentation`** is a dev-only dependency used for annotating the UI during
  development. It is licensed under **PolyForm Shield 1.0.0**, which is
  source-available rather than OSI open source. It never ships — production
  builds strip it entirely — but automated license scanners will flag it, so
  it's called out here rather than discovered.
- The icon glyphs in `src/components/studio/glyphs.tsx` were traced from the
  project's own Paper design file. Their original provenance is unverified.

---

## License

[MIT](LICENSE) © pixelyokai

The license covers the code in this repository. Dependencies carry their own
terms — see the note above.
