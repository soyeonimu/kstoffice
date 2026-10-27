# 게시판 이미지 최적화본 생성 — 원본은 절대 수정·삭제하지 않는다.
#   assets/img/board/<name>.png|jpg  (원본, 그대로 유지)
#   → assets/img/board/opt/<name>.webp        본문용: 가로 최대 1200px, 품질 82 (인포그래픽 글자 가독성 우선)
#   → assets/img/board/opt/thumb/<name>.webp  카드 썸네일용: 가로 640px, 품질 78
#   → _data/img_opt.json  { "<name>.<ext>": [원본 가로, 원본 세로] }  (img width/height 지정용)
# 사용: python scripts/optimize_images.py   (이미 최신인 파일은 건너뜀)
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'img', 'board')
OPT = os.path.join(SRC, 'opt')
THUMB = os.path.join(OPT, 'thumb')
MANIFEST = os.path.join(ROOT, '_data', 'img_opt.json')
os.makedirs(THUMB, exist_ok=True)

def save_webp(im, dest, max_w, quality):
    w, h = im.size
    if w > max_w:
        im = im.resize((max_w, round(h * max_w / w)), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=quality, method=6)

manifest, before, after, made = {}, 0, 0, 0
for name in sorted(os.listdir(SRC)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in ('.png', '.jpg', '.jpeg'):
        continue
    src = os.path.join(SRC, name)
    with Image.open(src) as im0:
        manifest[name] = list(im0.size)
        im = im0.convert('RGBA' if im0.mode in ('RGBA', 'LA', 'P') else 'RGB')
        body = os.path.join(OPT, base + '.webp')
        thumb = os.path.join(THUMB, base + '.webp')
        mt = os.path.getmtime(src)
        if not os.path.exists(body) or os.path.getmtime(body) < mt:
            save_webp(im, body, 1200, 82); made += 1
        if not os.path.exists(thumb) or os.path.getmtime(thumb) < mt:
            save_webp(im, thumb, 640, 78); made += 1
    before += os.path.getsize(src)
    after += os.path.getsize(body)

with open(MANIFEST, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=0, sort_keys=True)
print(f'images {len(manifest)}  generated {made}  original {before/1048576:.1f}MB  body-webp {after/1048576:.1f}MB  ({100-after*100/max(before,1):.0f}% smaller)')
