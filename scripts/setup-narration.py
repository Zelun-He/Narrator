"""Download and verify the free English voice. Run after pip install."""
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import shutil

folder = Path(os.environ.get("NARRATOR_MODEL_DIR", "models"))
folder.mkdir(parents=True, exist_ok=True)
base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ljspeech/medium/"
name = "en_US-ljspeech-medium.onnx"
expected = "6f52a751e2349abe7a76735eb09dc1875298c77ea2342ffd2fef79ff81b87f22"
def download(filename, destination):
    with urllib.request.urlopen(base + filename, timeout=30) as response, open(destination, "wb") as output:
        shutil.copyfileobj(response, output)

model = folder / name
if not model.exists() or hashlib.sha256(model.read_bytes()).hexdigest() != expected:
    temporary = folder / (name + ".download")
    download(name, temporary)
    if hashlib.sha256(temporary.read_bytes()).hexdigest() != expected:
        temporary.unlink(missing_ok=True)
        raise RuntimeError("Voice checksum mismatch")
    temporary.replace(model)
for filename in [name + ".json", "MODEL_CARD"]:
    if not (folder / filename).exists():
        download(filename, folder / filename)
if hashlib.sha256((folder / (name + ".json")).read_bytes()).hexdigest() != "141d612cc0a95ed7efc1ca936b845c2364967f2e9217c5dbfcf69fc4d6c65860":
    raise RuntimeError("Voice configuration checksum mismatch")
config = json.loads((folder / (name + ".json")).read_text())
assert config["audio"]["sample_rate"] == 22050
print("LJ voice ready.")
