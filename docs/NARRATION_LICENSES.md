# Narration dependencies and assets

- Piper runtime: [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0. `requirements.txt` pins `piper-tts` 1.8.0. Docker redistribution must satisfy the upstream GPL license, including corresponding source for the redistributed version.
- English voice: [en_US-ljspeech-medium](https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/ljspeech/medium). The model card identifies the training dataset as public domain. The setup script verifies the model and configuration hashes before use and retains the downloaded model card.
- Dataset: [LJ Speech](https://keithito.com/LJ-Speech-Dataset/), public domain.
- `public/samples/lj.wav` was generated with that model from original sample text: “Every story begins with a possibility. Beyond the last familiar street, a new chapter was waiting to be written.” It contains no uploaded author manuscript.
- FFmpeg: use the license of the installed distribution and enabled codecs when redistributing binaries. The supplied Dockerfile installs Debian’s FFmpeg package with libmp3lame support.

The runtime is independent of the historical `tools/piper` Windows distribution and Lessac model. Those original files remain in the repository but are not used by the backend.
