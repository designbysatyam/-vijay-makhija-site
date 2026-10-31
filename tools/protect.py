#!/usr/bin/env python3
"""Encrypts PDF notes into the website's private vault.

Put your PDFs in:   source/<Level>/<Folder>/<NN Title>.pdf
    e.g.  source/CAF/Indian Partnership Act, 1932/01 Unit 1 - Nature of Partnership.pdf
Run:                python tools/protect.py
Result:             vault/  (encrypted pages, stored as base64 text)  and  catalog.json  -> upload both to the website.

Never upload the source/ folder. It holds the original, readable PDFs.

Needs:  Python 3.9+,  pip install cryptography pillow,  and poppler (the `pdftoppm` command).
  Windows: install poppler and add it to PATH.   Mac: brew install poppler.   Linux: apt install poppler-utils

How the protection works
  * every PDF page is turned into an image and encrypted with AES-256-GCM
  * every level has a random master key; each password (PBKDF2-SHA256, 600,000 rounds) only wraps that master key,
    so passwords can be added, removed or changed later without re-encrypting any page (the admin panel does this)
  * the website decrypts pages in the visitor's browser only after the right password is typed
"""
import argparse, base64, datetime, getpass, glob, hashlib, io, json, os, re, shutil, subprocess, sys, tempfile
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITER = 600000


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def title_of(fname):
    stem = os.path.splitext(fname)[0]
    stem = re.sub(r"^\d+[\s._-]+", "", stem)
    return stem.replace(" - ", ": ").strip()


def derive(password, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(password.encode("utf-8"))


def render(pdf, cache_dir, width, quality):
    """pdf -> list of JPEG bytes (cached so that changing the password is fast)"""
    h = hashlib.sha256(open(pdf, "rb").read()).hexdigest()[:16]
    d = os.path.join(cache_dir, f"{h}_{width}_{quality}")
    if not os.path.isdir(d) or not glob.glob(d + "/*.jpg"):
        os.makedirs(d, exist_ok=True)
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=92", "-scale-to-x", str(width), "-scale-to-y", "-1", pdf, os.path.join(tmp, "p")], check=True)
            for i, f in enumerate(sorted(glob.glob(tmp + "/p-*.jpg")), 1):
                im = Image.open(f).convert("RGB")
                im.save(os.path.join(d, f"{i:04d}.jpg"), "JPEG", quality=quality, optimize=True, progressive=True)
    return h, [open(f, "rb").read() for f in sorted(glob.glob(d + "/*.jpg"))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default=os.path.join(ROOT, "source"))
    ap.add_argument("--out", default=ROOT)
    ap.add_argument("--password", help="password for every level (or set VAULT_PASSWORD, or you will be asked)")
    ap.add_argument("--group-password", action="append", default=[], metavar="LEVEL=PASSWORD", help='different password for one level, e.g. "CA Inter=secret"')
    ap.add_argument("--width", type=int, default=1400)
    ap.add_argument("--quality", type=int, default=62)
    a = ap.parse_args()

    default_pw = a.password or os.environ.get("VAULT_PASSWORD") or getpass.getpass("Vault password: ")
    if len(default_pw) < 10:
        print("Warning: use at least 10 characters (a few words and a number is best).", file=sys.stderr)
    gpw = dict(x.split("=", 1) for x in a.group_password)

    folders = json.load(open(os.path.join(ROOT, "tools", "folders.json"), encoding="utf-8"))
    old = {}
    try:
        old = {d["id"]: d for d in json.load(open(os.path.join(a.out, "catalog.json"), encoding="utf-8")).get("docs", [])}
    except Exception:
        pass

    found = []
    for pdf in sorted(glob.glob(os.path.join(a.source, "*", "*", "*.pdf"))):
        rel = os.path.relpath(pdf, a.source).split(os.sep)
        level, folder = rel[0], rel[1]
        if not any(f["level"] == level and f["name"] == folder for f in folders):
            folders.append({"level": level, "name": folder})
        found.append((level, folder, pdf))
    if not found:
        sys.exit("No PDFs found in " + a.source)

    levels = sorted({l for l, _, _ in found}, key=lambda x: [f["level"] for f in folders].index(x) if any(f["level"] == x for f in folders) else 99)
    groups, keys = {}, {}
    for lv in levels:
        master = os.urandom(32)
        salt = os.urandom(16)
        iv = os.urandom(12)
        kek = derive(gpw.get(lv, default_pw), salt)
        keys[lv] = master
        groups[lv] = {"wraps": [{"id": "w1", "label": "Main password", "salt": base64.b64encode(salt).decode(), "iter": ITER,
                                  "wrap": base64.b64encode(iv + AESGCM(kek).encrypt(iv, master, None)).decode()}]}

    vault = os.path.join(a.out, "vault")
    shutil.rmtree(vault, ignore_errors=True)
    os.makedirs(vault)
    cache = os.path.join(ROOT, ".cache")
    docs, today = [], datetime.date.today().isoformat()
    for level, folder, pdf in found:
        title = title_of(os.path.basename(pdf))
        h, pages = render(pdf, cache, a.width, a.quality)
        doc_id = slug(f"{level} {folder} {title}")[:60] + "-" + h[:6]
        out = os.path.join(vault, doc_id)
        os.makedirs(out)
        ar, total = [], 0
        for i, jpg in enumerate(pages, 1):
            w, hgt = Image.open(io.BytesIO(jpg)).size
            ar.append(round(w / hgt, 4))
            iv = os.urandom(12)
            blob = base64.b64encode(iv + AESGCM(keys[level]).encrypt(iv, jpg, None)).decode()
            total += len(blob)
            open(os.path.join(out, f"{i:03d}.txt"), "w").write(blob)
        prev = old.get(doc_id, {})
        docs.append({"id": doc_id, "title": title, "level": level, "folder": folder, "pages": len(pages), "ar": ar[0] if len(set(ar)) == 1 else ar,
                     "size": total, "added": prev.get("added", today)})
        print(f"{level} / {folder} / {title}: {len(pages)} pages, {total/1e6:.1f} MB")

    catalog = {"version": 2, "groups": groups, "folders": folders, "docs": docs}
    json.dump(catalog, open(os.path.join(a.out, "catalog.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Done. Upload the vault/ folder and catalog.json to the website.")


if __name__ == "__main__":
    main()
