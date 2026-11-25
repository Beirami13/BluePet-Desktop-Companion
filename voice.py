"""
Voice system for Blue Pet.

  microphone (always listening) -> speech-to-text (Google) -> event to JavaScript
  reply text -> Microsoft Edge neural voice (edge-tts) -> mp3 -> played by main.py
"""

import asyncio
import collections
import importlib.util
import json
import tempfile
import threading
import time
import uuid
from pathlib import Path

from PySide6.QtCore import QObject, Signal

# ---------------- Settings ----------------

VOICE_ENABLED = True            # False = no microphone at all
VOICE_LANGUAGE = "en"           # "en" or "fa"

LANGUAGES = {
    "en": {
        "stt": "en-US",                       # "en-GB", "en-IN"... also work
        "voice": "en-US-AnaNeural",           # try: "en-GB-MaisieNeural", "en-US-JennyNeural"
        "rate": "+5%",
        "pitch": "+15Hz",                     # raise for a squeakier voice, e.g. "+40Hz"
        "err_mic": "I can't find the microphone, or I'm not allowed to use it",
        "err_stt": "No internet, or the speech service isn't answering",
        "err_tts": "I couldn't make my voice (is the internet on?)",
    },
    "fa": {
        "stt": "fa-IR",
        "voice": "fa-IR-DilaraNeural",
        "rate": "+12%",
        "pitch": "+45Hz",
        "err_mic": "میکروفون پیدا نشد یا اجازهٔ دسترسی ندارم",
        "err_stt": "اینترنت وصل نیست یا سرویس تشخیص گفتار جواب نمی‌ده",
        "err_tts": "نتونستم صدا بسازم (اینترنت وصله؟)",
    },
}

L = LANGUAGES[VOICE_LANGUAGE]
STT_LANGUAGE = L["stt"]
TTS_VOICE = L["voice"]
TTS_RATE = L["rate"]
TTS_PITCH = L["pitch"]
PLAYBACK_RATE = 1.0             # 1.1 - 1.25 can make it squeakier (depends on Qt backend)

# Microphone sensitivity
SAMPLE_RATE = 16000
MIN_THRESHOLD = 350             # lower = more sensitive
MAX_THRESHOLD = 2500
THRESHOLD_FACTOR = 3.0          # speech must be this much louder than the room noise
SILENCE_END = 0.8               # seconds of silence that end a sentence
MAX_UTTERANCE = 10.0            # longest sentence in seconds
MIN_SPEECH = 0.35               # shorter sounds are ignored (clicks, coughs)
DEBUG_LEVELS = False            # True = print mic levels in the terminal to tune sensitivity


def _has(module_name):
    return importlib.util.find_spec(module_name) is not None


class VoiceEngine(QObject):
    # (event type, JSON payload) -> sent to JavaScript by main.py
    event = Signal(str, str)
    # path of a finished mp3 reply -> played by main.py
    audioReady = Signal(str)

    def __init__(self, media_ok=True, parent=None):
        super().__init__(parent)

        self.problems = []

        missing = [
            package
            for module, package in (
                ("sounddevice", "sounddevice"),
                ("numpy", "numpy"),
                ("speech_recognition", "SpeechRecognition"),
            )
            if not _has(module)
        ]
        if missing:
            self.problems.append("pip install " + " ".join(missing))

        self.stt_ok = VOICE_ENABLED and not missing

        if not _has("edge_tts"):
            self.problems.append("pip install edge-tts")
        if not media_ok:
            self.problems.append("PySide6 QtMultimedia is not available")
        self.tts_ok = VOICE_ENABLED and media_ok and _has("edge_tts")

        for problem in self.problems:
            print("[voice] missing:", problem)

        self._running = False
        self._speaking = False
        self._ignore_until = 0.0
        self._speak_token = 0
        self._last_error_at = 0.0

    # ---------- public ----------

    def status(self):
        return {
            "stt": self.stt_ok,
            "tts": self.tts_ok,
            "lang": VOICE_LANGUAGE,
            "problems": self.problems if VOICE_ENABLED else [],
        }

    def start(self):
        if self.stt_ok and not self._running:
            self._running = True
            threading.Thread(target=self._listen_loop, daemon=True).start()

    def stop(self):
        self._running = False
        self._speak_token += 1

    def set_speaking(self, flag):
        """While the pet talks, the microphone is ignored (so it doesn't hear itself)."""
        self._speaking = flag
        if not flag:
            self._ignore_until = time.time() + 0.6

    # ---------- helpers ----------

    def _emit(self, kind, **payload):
        self.event.emit(kind, json.dumps(payload))

    def _error(self, message):
        now = time.time()
        if now - self._last_error_at > 30:
            self._last_error_at = now
            self._emit("error", message=message)

    # ---------- microphone ----------

    def _listen_loop(self):
        import numpy as np
        import sounddevice as sd

        block = int(SAMPLE_RATE * 0.03)          # 30 ms
        block_sec = block / SAMPLE_RATE

        def level_of(data):
            return float(np.sqrt(np.mean(data.astype(np.float32) ** 2)))

        while self._running:
            try:
                self._listen_session(sd, np, block, block_sec, level_of)
            except Exception as error:
                print("[voice] microphone error:", error)
                self._error(L["err_mic"])
                time.sleep(5)

    def _listen_session(self, sd, np, block, block_sec, level_of):
        pre = collections.deque(maxlen=10)       # ~0.3 s before speech starts
        frames = []
        started = False
        hot = 0
        silence = 0.0
        spoken = 0.0
        floor = None
        last_debug = 0.0

        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1,
                            dtype="int16", blocksize=block) as stream:
            while self._running:
                data, _ = stream.read(block)
                level = level_of(data)
                now = time.time()

                # Don't listen while the pet is talking
                if self._speaking or now < self._ignore_until:
                    started = False
                    hot = 0
                    frames = []
                    pre.clear()
                    silence = 0.0
                    spoken = 0.0
                    continue

                if floor is None:
                    floor = level
                threshold = min(max(MIN_THRESHOLD, floor * THRESHOLD_FACTOR), MAX_THRESHOLD)

                if DEBUG_LEVELS and now - last_debug > 1.0:
                    last_debug = now
                    print(f"[voice] level={level:.0f}  noise={floor:.0f}  threshold={threshold:.0f}")

                if not started:
                    pre.append(data.copy())
                    if level > threshold:
                        hot += 1
                        if hot >= 2:                      # 2 loud blocks in a row
                            started = True
                            frames = list(pre)
                            spoken = len(frames) * block_sec
                            silence = 0.0
                            self._emit("speech_start")
                    else:
                        hot = 0
                        floor = floor * 0.97 + level * 0.03   # learn the room noise
                else:
                    frames.append(data.copy())
                    spoken += block_sec
                    silence = 0.0 if level > threshold * 0.7 else silence + block_sec

                    if silence >= SILENCE_END or spoken >= MAX_UTTERANCE:
                        voiced = spoken - silence
                        pcm = np.concatenate(frames).tobytes()

                        started = False
                        hot = 0
                        frames = []
                        pre.clear()
                        silence = 0.0
                        spoken = 0.0

                        if voiced >= MIN_SPEECH:
                            threading.Thread(
                                target=self._recognize, args=(pcm,), daemon=True
                            ).start()
                        else:
                            self._emit("cancelled")

    # ---------- speech to text ----------

    def _recognize(self, pcm):
        import speech_recognition as sr

        self._emit("processing")

        recognizer = sr.Recognizer()
        audio = sr.AudioData(pcm, SAMPLE_RATE, 2)

        try:
            text = recognizer.recognize_google(audio, language=STT_LANGUAGE)
        except sr.UnknownValueError:
            self._emit("not_understood")
            return
        except sr.RequestError as error:
            print("[voice] speech service error:", error)
            self._error(L["err_stt"])
            self._emit("cancelled")
            return
        except Exception as error:
            print("[voice] recognition error:", error)
            self._emit("cancelled")
            return

        text = (text or "").strip()
        if text:
            self._emit("heard", text=text)
        else:
            self._emit("not_understood")

    # ---------- text to speech ----------

    def speak(self, text):
        text = (text or "").strip()
        if not text or not self.tts_ok:
            return

        self._speak_token += 1
        token = self._speak_token
        threading.Thread(target=self._tts_job, args=(text, token), daemon=True).start()

    def cancel_speaking(self):
        self._speak_token += 1

    def _tts_job(self, text, token):
        import edge_tts

        path = Path(tempfile.gettempdir()) / f"bluepet_{uuid.uuid4().hex}.mp3"

        async def synthesize():
            communicate = edge_tts.Communicate(
                text, TTS_VOICE, rate=TTS_RATE, pitch=TTS_PITCH
            )
            await communicate.save(str(path))

        try:
            asyncio.run(synthesize())
        except Exception as error:
            print("[voice] TTS error:", error)
            self._error(L["err_tts"])
            return

        if token != self._speak_token:       # a newer reply (or "be quiet") replaced this one
            path.unlink(missing_ok=True)
            return

        self.audioReady.emit(str(path))