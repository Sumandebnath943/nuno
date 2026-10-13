# Character art

Put your original pictures here, one folder per theme, then run:

```bash
npm run art
```

That makes small WebP copies in `src/generated/art/` (the only files the game
loads) and works out what each picture is from its name. It needs Python 3 with
Pillow (`pip install pillow`). Commit `src/generated/art/` — the deployed site
uses it as is, it doesn't run this step. The originals in this folder are
git-ignored (only `art.json` and this README are tracked), so keep your own copy.

```
src/assets/characters/
  naruto/
    Naruto BG.png                    → full-screen background
    Naruto Hero.png                  → title art above the logo on the menu
    Naruto bottom left sprite.png    → scenery in the bottom-left corner
    Naruto bottom right sprite.png   → scenery in the bottom-right corner
    characters/
      Naruto uzumaki.png             → a character
      ...
  mha/  onepiece/  aot/  demonslayer/  dbz/  classic/
```

How a picture is recognised: "BG" or "background" in the name is the
background, "hero" is the hero art, "sprite" plus "left"/"right" is corner
scenery, and anything inside `characters/` is a character.

The background and corner sprites also get a small, blurred copy
(`bg-soft.webp`, `left-soft.webp`, `right-soft.webp`): during a game the table
fades to those, so the cards stand out without phones blurring anything live.

## Characters

Each character becomes a bot opponent in that theme, an avatar you can pick, and
gets an anime-style cut-in (the whole picture slides in) when they play an action
card or shout NUNO. Their profile picture is a crop of their face.

Names and face crops live in `art.json`:

```json
"naruto": {
  "Naruto uzumaki": { "name": "Naruto", "full": "Naruto Uzumaki", "face": [0.5, 0.06, 0.085] }
}
```

- `name` is shown on seats, `full` on the cut-in.
- `face` is `[centre x, centre y, size]` as fractions of the picture (after its
  transparent border is trimmed): x of the width, y and size of the height.
- `erase` lists boxes `[x0, y0, x1, y1]` (fractions of the original) to wipe,
  for logos or signatures on empty background.
- `crop` keeps only `[x0, y0, x1, y1]` of the original, for marks that sit on
  the figure itself.

A character without an entry still works: it's named after the file and its
face is guessed from the top of the picture — add an entry to fine-tune it.

## Tips

- Transparent PNG or WebP works best for characters, sprites and hero art.
- Any size is fine; the script resizes and compresses everything.

## Rights

Official anime artwork belongs to its studios and publishers. Only use pictures
you have the right to use, especially if the game is deployed publicly.
