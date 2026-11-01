# Soda Swap Saga

**Play it:** https://scruff2.github.io/soda-swap-saga/

A match-3 saga game that follows the rules of Candy Crush Soda Saga. It is a plain HTML5/JavaScript web app with no build step, and it installs as a full-screen offline app (PWA). It is built for the Samsung Galaxy Tab A9+.

It is a sister project of [Sugar Swap Saga](https://github.com/scruff2/sugar-swap-saga) (the classic Saga rules).

## Soda rules

### Special candies

| Match | Special |
|---|---|
| 2×2 square | **Swedish Fish**: swims to a target, preferring the level goal (ice over bears, honey bears, jam, bottles) |
| 4 in a row | **Striped**: clears a row or column |
| L or T shape (5 candies) | **Wrapped**: explodes twice |
| L or T shape with 6 or more candies | **Coloring Candy**: paints every candy of one color into its own color |
| 5 in a row | **Color bomb** |

### Combos

- **Fish + fish**: three fish.
- **Fish + striped or wrapped**: the fish carries that special to its target.
- **Coloring Candy + candy**: repaints that candy's color.
- **Coloring Candy + special**: turns every candy of its color into that special.
- **Bomb or Coloring Candy + bomb or Coloring Candy**: clears the whole board.
- All the classic combos still work.

### Soda

Inside the soda, candies **float upward**, and new candies bubble up from the bottom. Clearing a **bottle** raises the soda.

### Level types

- **Soda**: raise the soda to free the gummy bears.
- **Ice**: break the ice to uncover the bears trapped under it.
- **Honey**: break the honey off the honey bears. Honey also traps single candies.
- **Jam**: spread jam onto every square. Matches and blasts that touch jam spread it further.
- **Score**: reach the target score.

### Also included

- Frosting and chocolate blockers.
- An end-of-level **Sugar Crush** in which leftover moves become Swedish fish.
- Callouts from "Sweet!" up to "Sodalicious!".

### Saga features

- 60 levels across 4 episodes.
- Stars, lives and boosters.
- Saved progress, kept separate from the Saga game.

## Install

### On an Android phone or tablet (recommended)

1. Open **https://scruff2.github.io/soda-swap-saga/** in Chrome.
2. Tap **Install**, or use ⋮ → *Add to Home screen* → *Install*.

Soda Swap Saga installs as a full-screen app that works offline, and it updates itself when the game changes. This works on iPads and PCs too.

### Or download the APK

1. Download the latest `.apk` from **[Releases](https://github.com/scruff2/soda-swap-saga/releases/latest)** on the device.
2. Open the file. If Android asks, allow your browser to **install unknown apps**, then tap **Install**.

New APK versions install over the old one and keep your progress.

### For development

To run the game from this computer on a tablet connected over Wi-Fi debugging, serve the folder:

```bash
python3 -m http.server 8766 --bind 0.0.0.0
```

Then forward the port so the tablet can reach it:

```bash
adb reverse tcp:8766 tcp:8766
```

On the tablet, open `http://localhost:8766`.

## Releasing a new APK

Tag a version and push the tag:

```bash
git tag v1.1.0
```

```bash
git push origin v1.1.0
```

GitHub Actions then packages the game with Capacitor, signs it, and attaches it to a new release. Bump `VERSION` in `sw.js` whenever the game files change, so installed web copies update.

Signing uses two repository secrets, `ANDROID_KEYSTORE_B64` and `ANDROID_KEYSTORE_PASSWORD`. Every release must use the same key, otherwise updates won't install over existing copies.

## Development

- `node tools/sim.js [runs] [from] [to]` runs a headless bot that plays the levels and reports win rates.
- Levels are defined in `js/levels.js`, with the grid legend at the top. Levels 1–20 are hand-made. The rest are generated.
- When you change files, bump `VERSION` in `sw.js` so installed copies update.
