# Blue Pet

A small desktop pet that lives on your screen. It follows your cursor, has moods, grows up over time, **talks and listens** (English or Persian, online or offline), and comes with a **Student Desk**: notes, tasks, a study timer, a calculator and clipboard history, all stored locally.

[فارسی](README.fa.md)

## Features

- **A pet with feelings.** Happy, sad, shy, curious, sleepy, angry... It reacts to your cursor and to clicks (click it too much and it gets annoyed), gets sleepy at night, and remembers you between sessions.
- **It grows.** Baby, Teen, Grown-up. Its personality (attached, friendly, neutral, distant) depends on how much you spend time with it.
- **Voice control, English and Persian.** Always listening, no button. Say "come here", "go to sleep", "tell me a joke"...
- **Works without internet.** Offline speech recognition ([Vosk](https://alphacephei.com/vosk/)) and an offline voice ([Piper](https://github.com/rhasspy/piper)).
- **Student Desk** (press **P**): Notes, Tasks, Study tracker, Calculator, Clipboard history. All of it is also controlled by voice.
- **Talks back.** Reacts when you say you are sad, tired, stressed or happy, tells jokes and facts, and plays small games.

## Install

You need Python 3.10 or newer.

```bash
git clone <your-repo-url>
cd BluePet
python -m venv .venv
.venv\Scripts\activate           # Windows   (macOS / Linux: source .venv/bin/activate)
pip install -r requirements.txt
python Main.py
```

On Linux you may also need PortAudio for the microphone: `sudo apt install libportaudio2`.

Developed and used on Windows. macOS and Linux should work but are less tested.

### Voice without internet (optional, one-time download)

```bash
python download_models.py
```

This downloads the offline speech models into `models/` (about 100 MB): English and Persian recognition, and a natural English voice for the pet. After that the pet works with no connection at all.

If your network blocks the download sites, use a VPN/proxy (`set HTTPS_PROXY=http://127.0.0.1:PORT`), or download the files yourself and install them:

| File | Install |
|---|---|
| `vosk-model-small-en-us-0.15.zip` | `python download_models.py en path\to\file.zip` |
| `vosk-model-small-fa-0.5.zip` | `python download_models.py fa path\to\file.zip` |
| `en_US-lessac-medium.onnx` + `.onnx.json` | `python download_models.py piper file.onnx file.onnx.json` |

Sources: <https://alphacephei.com/vosk/models> and <https://huggingface.co/rhasspy/piper-voices>.
Or copy them by hand:

```
models/en/        extracted Vosk model (contains am/, conf/, graph/ ...)
models/fa/
models/piper/en_US-lessac-medium.onnx
models/piper/en_US-lessac-medium.onnx.json
```

## Using the pet

Say its name first if you like ("hey blue ..."), but you don't have to (unless `REQUIRE_WAKE_WORD` is on).

| Say | What happens |
|---|---|
| come here / go away | walks to your cursor / goes home |
| go to sleep / wake up | sleeps / wakes |
| how are you, what time is it, who are you | small talk |
| smile, cry, be angry... | shows that mood |
| help | tells you what it understands |
| I'm sad, I'm tired, I have an exam, motivate me, I'm bored | comforts and cheers you up |
| tell me a joke, fun fact, what day is it | fun |
| flip a coin, roll a dice, rock paper scissors, guess the number, play a game | games |

If you say something that sounds like you are in real distress, the pet answers kindly and suggests talking to someone you trust or a professional.

Keyboard (when the pet window has focus): `S` status, `W` annoy it, `2`-`9`, `0`, `Q`, `E` show a mood (for testing).

## Student Desk

Press **P** to open the panel and **Esc** to close it (or say "open desk" / "close desk"). Drag its header to move the window.

| Tab | What it does | By voice |
|---|---|---|
| **Notes** | Write, search and edit notes. `Ctrl+Enter` saves. | "take a note buy milk" |
| **Tasks** | Tasks with an optional due date. Overdue and due-today tasks are highlighted. | "add task read chapter 3", "show my tasks" |
| **Study** | Study timer with a subject, today's total, 7-day chart. Can show the timer on the pet. | "start studying calculus", "stop studying", "start focus 25 minutes", "how long have I studied" |
| **Calc** | Keypad calculator. Safe parser, no `eval`. `+ - * / // % ^`, `sqrt sin cos tan log ln abs round factorial`, `pi`, `e`. Trig uses radians: `sin(radians(30))`. | "calculate 12 times 7" |
| **Clipboard** | History of copied text. Click an item to copy it again. Delete, clear all, or pause recording. | "show clipboard" |

When you start studying by voice, the pet asks **"Do you want me to show the timer?"** Answer yes or no. "show timer" / "hide timer" work any time.

Clipboard history skips anything a password manager marks as secret, but records everything else you copy while it is on. Pause it before copying sensitive text.

## Configuration

Voice settings are at the top of `voice.py`:

| Setting | Meaning |
|---|---|
| `VOICE_LANGUAGE` | `"en"` or `"fa"` |
| `RECOGNITION_MODE` | `"auto"` Google when online, Vosk offline; `"offline"` always Vosk; `"online"` Google only |
| `TTS_MODE` | `"auto"` Edge voice online, offline voice otherwise; `"offline"`; `"online"` |
| `OFFLINE_PITCH` | Pitch of the offline voice. `1.0` normal, `1.25` default, `1.4` squeaky |
| `MIN_THRESHOLD`, `SILENCE_END` | Microphone sensitivity and how long a pause ends a sentence |

Behaviour settings are at the top of `web/script.js`: `SHOW_BUBBLES`, `VOICE_REPLY`, `SHOW_HEARD`, `REQUIRE_WAKE_WORD`, `REPLY_TO_UNKNOWN`, and `STAGES` (how the pet behaves as it grows).

## Project structure

```
Main.py            window, Python <-> JavaScript bridge, clipboard watcher
voice.py           microphone, speech recognition (online + offline), the pet's voice
offline_tools.py   SQLite tools: notes, tasks, study tracker, calculator, clipboard
download_models.py downloads / installs the offline voice models
web/               the interface: index.html, style.css, script.js
data/              database (created automatically)
models/            offline voice models (after download_models.py)
```

## Your data

- Notes, tasks, study sessions and clipboard history: `data/bluepet.db` (SQLite, never leaves your computer).
- The pet's mood, growth and bond: `pet_state.json`.
- Both are ignored by git. Back them up if you care about them.
- A running study timer stops when you close the app. If the app is killed, the timer ends at its last heartbeat (every 20 seconds).

Online voice sends your sentences to Google (recognition) and Microsoft (the Edge voice). Set `RECOGNITION_MODE = "offline"` and `TTS_MODE = "offline"` to keep everything on your machine.

## Troubleshooting

- **The pet doesn't hear me.** Check the terminal for `[voice]` messages. Allow microphone access for your terminal/IDE. Lower `MIN_THRESHOLD` in `voice.py`, or set `DEBUG_LEVELS = True` to see mic levels.
- **"No internet, and no offline voice model yet".** Run `python download_models.py` (see above).
- **No sound from the pet.** Make sure `edge-tts` or `piper-tts` (or `pyttsx3`) is installed. There is no Persian offline voice unless your system has one; replies still appear in the bubble.
- **`pip install piper-tts` fails.** It depends on your Python version. The pet still falls back to your system voice (`pyttsx3`).
- **The offline voice sounds too deep or too high.** Change `OFFLINE_PITCH` in `voice.py`.
