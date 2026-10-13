"""
Prepares the character and scenery pictures for the game.

    npm run art          (or: python scripts/build-art.py)

Reads the originals in src/assets/characters/<theme>/ and writes small WebP
copies plus a manifest to src/generated/art/. The game only loads the copies,
so the originals can be as big as you like. Needs Python 3 with Pillow
(`pip install pillow`).

What each original is, from its name or folder:
  *BG* / *background*      -> full-screen background
  *hero*                   -> big picture on the main menu
  *left* + *sprite*        -> scenery in the bottom-left corner
  *right* + *sprite*       -> scenery in the bottom-right corner
  characters/<anything>    -> a character (bot, avatar, cut-in)

Character names, the face crop used for their profile picture, and logos to
erase come from src/assets/characters/art.json. Characters without an entry
get a name from the file and a face guessed from the top of the picture.
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src' / 'assets' / 'characters'
OUT = ROOT / 'src' / 'generated' / 'art'
THEMES = ['classic', 'naruto', 'mha', 'onepiece', 'aot', 'demonslayer', 'dbz']
EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.jfif', '.avif', '.gif', '.bmp'}

CHAR_MAX_H = 960  # full picture for the cut-in
CHAR_MAX_W = 900
FACE_PX = 192  # profile picture
BG_MAX_W = 1672
SPRITE_MAX = 1000
HERO_MAX_H = 1200


def slug(name: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return s or 'x'


def pretty(name: str) -> str:
    name = re.sub(r'^\d+[\s._-]*', '', name)
    name = re.sub(r'\b(png|jpe?g|webp|free|download|image)\b', '', name, flags=re.I)
    name = re.sub(r'[_-]+', ' ', name)
    return re.sub(r'\s+', ' ', name).strip().title() or 'Character'


def load(path: Path) -> Image.Image:
    im = Image.open(path)
    im.load()
    im = im.convert('RGBA')
    # Huge originals (4K+) only slow everything down: nothing is shown that big.
    if max(im.size) > 2400:
        s = 2400 / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im


def trim(im: Image.Image) -> Image.Image:
    alpha = im.getchannel('A').point(lambda v: 255 if v > 12 else 0)
    box = alpha.getbbox()
    return im.crop(box) if box else im


def fit(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    s = min(1.0, max_w / im.width, max_h / im.height)
    if s >= 1.0:
        return im
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def cut_edges(im: Image.Image) -> dict:
    """Which edges of the trimmed picture are cut off (solid pixels touching the edge)."""
    a = im.getchannel('A')
    w, h = a.size

    def solid(points):
        pts = list(points)
        return sum(1 for p in pts if a.getpixel(p) > 200) / max(1, len(pts)) > 0.25

    step_x = max(1, w // 120)
    step_y = max(1, h // 120)
    return {
        'top': solid((x, 0) for x in range(0, w, step_x)),
        'bottom': solid((x, h - 1) for x in range(0, w, step_x)),
        'left': solid((0, y) for y in range(0, h, step_y)),
        'right': solid((w - 1, y) for y in range(0, h, step_y)),
    }


def guess_face(im: Image.Image) -> list:
    """No curated face: a square at the top of the opaque area."""
    w, h = im.size
    side = min(w, h) * 0.5
    return [0.5, (side / 2) / h + 0.02, side / h]


def face_crop(im: Image.Image, face: list) -> Image.Image:
    w, h = im.size
    cx, cy, size = face
    side = max(8, round(size * h))
    x0 = round(cx * w - side / 2)
    y0 = round(cy * h - side / 2)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im.crop((x0, y0, x0 + side, y0 + side)), (0, 0))
    return canvas.resize((FACE_PX, FACE_PX), Image.LANCZOS)


def save(im: Image.Image, path: Path, quality: int, alpha: bool = True):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not alpha:
        im = im.convert('RGB')
    im.save(path, 'WEBP', quality=quality, method=5)
    return path.stat().st_size


def role(path: Path) -> str | None:
    if path.parent.name.lower() == 'characters':
        return 'character'
    n = path.stem.lower()
    if 'sprite' in n or n.startswith('_left') or n.startswith('_right'):
        if 'left' in n:
            return 'left'
        if 'right' in n:
            return 'right'
    if 'hero' in n:
        return 'hero'
    if re.search(r'(^|[\s_-])bg($|[\s_-])', n) or 'background' in n or n.startswith('_backdrop'):
        return 'backdrop'
    return None


def main():
    config = json.loads((SRC / 'art.json').read_text(encoding='utf-8')) if (SRC / 'art.json').exists() else {}
    if OUT.exists():
        shutil.rmtree(OUT)
    manifest = {}
    total = 0
    for theme in THEMES:
        folder = SRC / theme
        if not folder.exists():
            continue
        files = sorted(p for p in folder.rglob('*') if p.is_file() and p.suffix.lower() in EXTS)
        if not files:
            continue
        entry = {'characters': []}
        notes = config.get(theme, {})
        for path in files:
            kind = role(path)
            if kind is None:
                print(f'  ? skipped {path.relative_to(SRC)} (not a BG, hero, sprite or characters/ file)')
                continue
            im = load(path)
            if kind == 'backdrop':
                out = fit(im, BG_MAX_W, 2000)
                size = save(out, OUT / theme / 'bg.webp', 76, alpha=False)
                entry['backdrop'] = {'file': 'bg.webp', 'w': out.width, 'h': out.height}
            elif kind in ('hero', 'left', 'right'):
                out = trim(im)
                out = fit(out, SPRITE_MAX if kind != 'hero' else 2000, HERO_MAX_H if kind == 'hero' else SPRITE_MAX)
                size = save(out, OUT / theme / f'{kind}.webp', 80)
                entry[kind] = {'file': f'{kind}.webp', 'w': out.width, 'h': out.height}
            else:
                note = notes.get(path.stem, {})
                if note.get('crop'):
                    x0, y0, x1, y1 = note['crop']
                    W, H = im.size
                    im = im.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
                for box in note.get('erase', []):
                    x0, y0, x1, y1 = box
                    W, H = im.size
                    im.paste((0, 0, 0, 0), (round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
                im = trim(im)
                face = note.get('face') or guess_face(im)
                cut = cut_edges(im)
                full = fit(im, CHAR_MAX_W, CHAR_MAX_H)
                sid = slug(path.stem)
                size = save(full, OUT / theme / f'c-{sid}.webp', 82)
                size += save(face_crop(im, face), OUT / theme / f'f-{sid}.webp', 84)
                entry['characters'].append(
                    {
                        'id': f'{theme}/{sid}',
                        'name': note.get('name') or pretty(path.stem),
                        'full': note.get('full') or note.get('name') or pretty(path.stem),
                        'file': f'c-{sid}.webp',
                        'face': f'f-{sid}.webp',
                        'w': full.width,
                        'h': full.height,
                        # The source size, so small pictures aren't blown up too far.
                        'srcW': im.width,
                        'srcH': im.height,
                        'cut': cut,
                    }
                )
            total += size
            print(f'  {theme:12s} {kind:9s} {path.name:52s} {size / 1024:7.0f} KB', flush=True)
        manifest[theme] = entry
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1), encoding='utf-8')
    print(f'\nWrote {OUT.relative_to(ROOT)} — {total / 1024 / 1024:.1f} MB in total.')


if __name__ == '__main__':
    sys.exit(main())
