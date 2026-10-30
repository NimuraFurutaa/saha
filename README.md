# جهانِ کوچکِ ما

A Persian, right-to-left interactive gift site. Plain HTML, CSS and JavaScript; no build step or runtime dependencies.

## Run

From the repository directory:

```sh
python3 -m http.server 3000
```

Open the served page in a browser. You can also open `index.html` directly, although browser storage behavior for local files varies.

## Experiences

- Animated SVG illustration: two cats, a rainy window, plants and tea.
- Drawing canvas with pen, heart, flower, mirror, watercolor, rainbow, star, moon, cat and eraser tools; custom color, opacity, undo/redo, recoverable clear and PNG download.
- Additive heart, floral wreath and sky templates, four paper colors, drawing replay and creative prompts.
- Export a framed postcard with a personal caption. Existing saved drawings remain compatible.
- Tap-to-plant garden and an eight-star constellation puzzle.
- Hidden moon surprise, folded letter, date ideas and a wish bottle.
- Locally generated stereo rain, filtered droplets and leaf rustle; three presets, independent volume controls and smooth start/stop.

Drawings and flowers remain in this browser's local storage when available. They are not synchronized between people or devices. Wishes are neither saved nor sent. Audio starts only after pressing play. Motion respects the device's reduced-motion setting.

## Files

- `index.html`: page structure and illustration.
- `style.css`: layout, responsive styles and animations.
- `app.js`: drawing, garden, constellation, dialogs, local persistence and Web Audio synthesis.

No API keys, external fonts or audio downloads are required. To publish, serve these three files together using any static web host.

## Pixel cats, music and mini-game

`extras.js` adds original pixel cats that cuddle when petted, a shuffled four-pair memory game, and a user-initiated official Apple Music preview of Cuco's Audiotree live recording of Lover Is a Day. The full-recording link opens Apple Music; service access may be required. No song files are hosted in this repository.

`site-texts.txt` contains categorized editable copy, source locations, and dynamic placeholders. Edit the entries and use them to update the referenced source strings; the inventory is not a runtime translation file. Regenerate it with `python3 scripts/export-texts.py` after source changes.
