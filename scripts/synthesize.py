"""One chapter per invocation; audio is written incrementally with bounded memory."""
import json
import os
import sys
# Stop CPU work if the owning Node worker is killed on Linux.
if sys.platform == "linux":
    import ctypes
    import signal
    parent = os.getppid()
    ctypes.CDLL(None).prctl(1, signal.SIGTERM)
    if os.getppid() != parent:
        raise SystemExit(1)
import re
import wave
from piper import PiperVoice

model, source, output = sys.argv[1:]
voice = PiperVoice.load(model)
with open(source, encoding="utf-8") as file:
    text = file.read()
# Bound each synthesis call, including manuscripts with very long paragraphs.
parts = re.findall(r"[\s\S]{1,1500}(?:\s+|$)|[\s\S]{1,1500}", text)
with wave.open(output, "wb") as audio:
    first = True
    for part in parts:
        if part.strip():
            voice.synthesize_wav(part.strip(), audio, set_wav_format=first)
            first = False
with wave.open(output, "rb") as audio:
    if audio.getnframes() == 0:
        raise ValueError("Narration produced empty audio")
    print(json.dumps({"duration": audio.getnframes() / audio.getframerate()}))
