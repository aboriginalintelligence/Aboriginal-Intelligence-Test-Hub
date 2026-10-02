# Historical studio backdrop filter (DRAFT)

**Status:** unpublished draft on branch `draft/historical-photo-filter`.  
**Not linked from the hub homepage. Not deployed as a live feature.**  
Public launch awaits explicit caller confirmation.

## What this is

A **client-side** browser tool:

1. You upload a photo of yourself (file input or drag-and-drop).
2. The browser removes the background (WASM via `@imgly/background-removal` from CDN; models download once and cache locally).
3. Your **cutout subject stays intact and recognizable** — face is not morphed; optional light historical tone (sepia / soft grain) only.
4. The background is replaced with an **1800s-era studio / period scenery** preset (PD studio photos and generated painted backdrops).
5. Download the composite as PNG or JPEG.

Processing of your photo stays in the browser. Backdrop image files are loaded from this folder; the background-removal library may fetch its model weights from a CDN on first use.

## What this is NOT

This tool is **not**:

- An AI costume or ethnicity transformer
- A “period Indigenous clothing,” headdress, or cultural-dress overlay
- Face morphing into stereotypes
- A “look like an 1800s Indian” (or any other ethnicity/stereotype) generator

Those ideas are **explicitly out of scope** and must not be added. Living people are not props. Use respectfully.

## Presets (backdrops)

Photography / studio scenery only — not cultural costume:

- Draped curtains (generated)
- Plain studio wall (generated)
- Painted pastoral landscape (generated)
- Classical columns (generated)
- Josef Seidel atelier (Wikimedia Commons photo)
- Beuren photo atelier (Wikimedia Commons photo)

See `backdrops/ATTRIBUTION.md`.

## Privacy

Your uploaded photo is processed in the browser for cutout + composite. It is not uploaded to this hub’s servers. The third-party background-removal package loads model assets from its CDN (IMG.LY / jsDelivr); see that package’s docs for details. Downloaded results leave your device only if you share them.

## Files

| Path | Role |
|------|------|
| `index.html` | UI, disclaimer, upload / download |
| `app.css` | Layout (hub mild palette) |
| `app.js` | Cutout, backdrop composite, optional tone, download |
| `backdrops/` | Backdrop JPEGs + attribution |
| `README.md` | This file |

## How to try locally

Open `tools/historical-photo-filter/index.html` via a **local static server** (ES modules + WASM need http(s), not always `file://`):

```bash
npx --yes serve -l 4173 .
# then visit /tools/historical-photo-filter/
```

Do **not** enable GitHub Pages for this path unless the caller asks. Do **not** merge to `main` or add a homepage feature link without confirmation.

## Suggested framing for callers

> This draft swaps a **neutral studio/period background** behind a **preserved subject cutout**. It is a photography-process / scenery tool, not a cultural costume or stereotype generator. It remains on a draft branch until someone confirms linking or publishing.
