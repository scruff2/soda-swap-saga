# Soda Swap Saga

A match-3 saga game that follows the rules of Candy Crush Soda Saga. It is a plain HTML5/JavaScript web app with no build step, and it installs as a full-screen offline app (PWA). It is built for the Samsung Galaxy Tab A9+.

It is a sister project of [Candy_Crush_Clone](https://github.com/scruff2/Candy_Crush_Clone) (the classic Saga rules).

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

## Play on the tablet

Serve the folder, then open it in Chrome on the tablet.

```bash
python3 -m http.server 8766 --bind 0.0.0.0
```

With Wireless debugging on, run:

```bash
adb reverse tcp:8766 tcp:8766
```

Then open `http://localhost:8766` on the tablet and use **⋮ → Add to Home screen → Install**.

It uses port 8766, so it installs as a separate app from the Saga clone, which uses port 8765.

## Development

- `node tools/sim.js [runs] [from] [to]` runs a headless bot that plays the levels and reports win rates.
- Levels are defined in `js/levels.js`, with the grid legend at the top. Levels 1–20 are hand-made. The rest are generated.
- When you change files, bump `VERSION` in `sw.js` so installed copies update.
