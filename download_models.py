"""
Downloads the small OFFLINE speech models (Vosk) so voice commands work without internet.

    python download_models.py          # downloads English and Persian
    python download_models.py en       # only English
    python download_models.py piper    # only the natural offline English voice (pet's own voice)
    python download_models.py fa       # only Persian

Models are saved to models/en/ and models/fa/ (about 40 MB and 60 MB).
You need the internet only for this download. If a link ever fails, get the model from
https://alphacephei.com/vosk/models and unzip it into models/<language>/ yourself.
"""

import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
BASE_URL = "https://alphacephei.com/vosk/models/"
MODELS = {
    "en": "vosk-model-small-en-us-0.15",
    "fa": "vosk-model-small-fa-0.5",
}

# Natural offline English voice for the pet (Piper, about 63 MB)
PIPER_NAME = "en_US-lessac-medium"
PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/"


def download(lang):
    name = MODELS[lang]
    target = MODELS_DIR / lang
    if target.is_dir() and any(target.iterdir()):
        print(f"[{lang}] already installed in {target}")
        return True

    url = f"{BASE_URL}{name}.zip"
    print(f"[{lang}] downloading {url}")
    try:
        with tempfile.TemporaryDirectory() as tmp:
            zip_path = Path(tmp) / f"{name}.zip"

            def progress(blocks, block_size, total):
                if total > 0:
                    percent = min(100, blocks * block_size * 100 // total)
                    print(f"\r    {percent:3d}%", end="", flush=True)

            urllib.request.urlretrieve(url, zip_path, progress)
            print()

            target.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path) as archive:
                archive.extractall(target)
    except Exception as error:
        print(f"[{lang}] failed: {error}")
        shutil.rmtree(target, ignore_errors=True)
        print(f"    Download it by hand from https://alphacephei.com/vosk/models "
              f"and unzip it into {target}")
        return False

    print(f"[{lang}] ready: {target}")
    return True


def download_piper():
    target = MODELS_DIR / "piper"
    model = target / f"{PIPER_NAME}.onnx"
    if model.exists() and Path(str(model) + ".json").exists():
        print(f"[piper] already installed in {target}")
        return True

    target.mkdir(parents=True, exist_ok=True)
    for suffix in (".onnx.json", ".onnx"):
        url = f"{PIPER_BASE}{PIPER_NAME}{suffix}"
        print(f"[piper] downloading {url}")
        try:
            urllib.request.urlretrieve(url, target / f"{PIPER_NAME}{suffix}")
        except Exception as error:
            print(f"[piper] failed: {error}")
            shutil.rmtree(target, ignore_errors=True)
            return False
    print(f"[piper] ready: {target}")
    return True


def main():
    args = sys.argv[1:]
    langs = [a for a in args if a in MODELS]
    want_piper = "piper" in args or not args
    wanted = langs or ([] if "piper" in args else list(MODELS))
    results = [download(lang) for lang in wanted]
    if want_piper:
        results.append(download_piper())
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
