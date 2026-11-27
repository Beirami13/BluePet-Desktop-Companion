"""
Voice system for Blue Pet.

  microphone (always listening) -> speech-to-text (Google) -> event to JavaScript
  reply text -> Microsoft Edge neural voice (edge-tts) -> mp3 -> played by main.py
"""

import asyncio
import collections
import importlib.util
import json
import socket
import tempfile
import threading
import time
import uuid
from pathlib import Path

from PySide6.QtCore import QObject, Signal

# ---------------- Settings ----------------

VOICE_ENABLED = True            # False = no microphone at all
VOICE_LANGUAGE = "en"           # "en" or "fa"

# Speech recognition engine:
#   "auto"    = Google when the internet works, offline (Vosk) when it doesn't   <- recommended
#   "offline" = always offline (Vosk). Needs a model, see README.md
#   "online"  = Google only
RECOGNITION_MODE = "auto"

# Voice of the pet:
#   "auto"    = Edge neural voice when the internet works, offline voice when it doesn't   <- recommended
#   "offline" = always offline (Piper if installed, else the computer's own voice)
#   "online"  = Edge only
TTS_MODE = "auto"
MODELS_DIR = Path(__file__).parent / "models"    # models/en/  and  models/fa/

LANGUAGES = {
    "en": {
        "stt": "en-US",                       # "en-GB", "en-IN"... also work
        "voice": "en-US-AnaNeural",           # try: "en-GB-MaisieNeural", "en-US-JennyNeural"
        "rate": "+5%",
        "pitch": "+15Hz",                     # raise for a squeakier voice, e.g. "+40Hz"
        "err_mic": "I can't find the microphone, or I'm not allowed to use it",
        "err_stt": "No internet, or the speech service isn't answering",
        "err_tts": "I couldn't make my voice (is the internet on?)",
        "err_offline": "No internet, and no offline voice model yet (see README: Vosk)",
    },
    "fa": {
        "stt": "fa-IR",
        "voice": "fa-IR-DilaraNeural",
        "rate": "+12%",
        "pitch": "+45Hz",
        "err_mic": "میکروفون پیدا نشد یا اجازهٔ دسترسی ندارم",
        "err_stt": "اینترنت وصل نیست یا سرویس تشخیص گفتار جواب نمی‌ده",
        "err_tts": "نتونستم صدا بسازم (اینترنت وصله؟)",
        "err_offline": "اینترنت نیست و مدل صوتی آفلاین هم نصب نشده (README، بخش Vosk)",
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


_online_cache = [0.0, True]


def internet_ok():
    """True if the internet seems to work (checked at most every 15 seconds)."""
    now = time.time()
    if now - _online_cache[0] < 15:
        return _online_cache[1]
    try:
        socket.create_connection(("www.google.com", 443), timeout=1.5).close()
        ok = True
    except OSError:
        ok = False
    _online_cache[0], _online_cache[1] = now, ok
    return ok


def find_vosk_model(lang):
    """models/<lang>/ may hold the model itself or one extracted model folder."""
    base = MODELS_DIR / lang
    if not base.is_dir():
        return None
    candidates = [base] + sorted(p for p in base.iterdir() if p.is_dir())
    for folder in candidates:
        if (folder / "am").is_dir() or (folder / "conf").is_dir():
            return folder
    return None


def find_piper_model(lang):
    """models/piper/<lang>_*.onnx (+ its .onnx.json), e.g. en_US-lessac-medium.onnx"""
    base = MODELS_DIR / "piper"
    if not base.is_dir():
        return None
    for model in sorted(base.glob(lang + "_*.onnx")):
        if Path(str(model) + ".json").exists():
            return model
    return None


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
        if missing == ["SpeechRecognition"] and RECOGNITION_MODE != "online" \
                and _has("vosk") and find_vosk_model(VOICE_LANGUAGE):
            self.stt_ok = VOICE_ENABLED         # offline recognition does not need it
            self.problems = [p for p in self.problems if "SpeechRecognition" not in p]

        self.vosk_ok = _has("vosk") and find_vosk_model(VOICE_LANGUAGE) is not None
        self._vosk_model = None
        self._vosk_lock = threading.Lock()
        if RECOGNITION_MODE != "online" and not self.vosk_ok:
            print("[voice] offline recognition is not set up "
                  "(pip install vosk + put a model in models/%s, see README)" % VOICE_LANGUAGE)

        self.piper_ok = _has("piper") and find_piper_model(VOICE_LANGUAGE) is not None
        self._piper_voice = None
        self._piper_lock = threading.Lock()

        if not _has("edge_tts") and not _has("pyttsx3") and not self.piper_ok:
            self.problems.append("pip install edge-tts pyttsx3")
        if not media_ok:
            self.problems.append("PySide6 QtMultimedia is not available")
        self.tts_ok = VOICE_ENABLED and media_ok and (
            _has("edge_tts") or _has("pyttsx3") or self.piper_ok)

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
            "offline": self.vosk_ok,
            "offline_tts": self.piper_ok,
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

    def _recognize_offline(self, pcm):
        """Vosk: works without internet. Returns text ('' = nothing understood)."""
        from vosk import KaldiRecognizer, Model, SetLogLevel

        with self._vosk_lock:
            if self._vosk_model is None:
                SetLogLevel(-1)
                self._vosk_model = Model(str(find_vosk_model(VOICE_LANGUAGE)))
            model = self._vosk_model

        recognizer = KaldiRecognizer(model, SAMPLE_RATE)
        recognizer.AcceptWaveform(pcm)
        return (json.loads(recognizer.FinalResult()).get("text") or "").strip()

    def _recognize_online(self, pcm):
        import speech_recognition as sr

        recognizer = sr.Recognizer()
        audio = sr.AudioData(pcm, SAMPLE_RATE, 2)
        return recognizer.recognize_google(audio, language=STT_LANGUAGE)

    def _recognize(self, pcm):
        self._emit("processing")

        use_online = RECOGNITION_MODE != "offline" and _has("speech_recognition") \
            and (RECOGNITION_MODE == "online" or internet_ok())
        text = None

        try:
            if use_online:
                try:
                    text = self._recognize_online(pcm)
                except Exception as error:
                    import speech_recognition as sr
                    if isinstance(error, sr.UnknownValueError):
                        self._emit("not_understood")
                        return
                    if not isinstance(error, sr.RequestError):
                        raise
                    print("[voice] speech service error:", error)
                    _online_cache[0], _online_cache[1] = time.time(), False
                    if RECOGNITION_MODE == "online" or not self.vosk_ok:
                        self._error(L["err_stt"])
                        self._emit("cancelled")
                        return
                    # the internet failed: fall through to the offline engine
            if text is None:
                if not self.vosk_ok:
                    self._error(L["err_offline"])
                    self._emit("cancelled")
                    return
                text = self._recognize_offline(pcm)
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

    def _tts_piper(self, text, path):
        """Piper: a natural offline voice. Returns False if it fails (the system voice is tried next)."""
        try:
            import wave
            from piper import PiperVoice

            with self._piper_lock:
                if self._piper_voice is None:
                    self._piper_voice = PiperVoice.load(str(find_piper_model(VOICE_LANGUAGE)))
                voice = self._piper_voice

            with wave.open(str(path), "wb") as wav_file:
                if hasattr(voice, "synthesize_wav"):       # piper-tts 1.3+
                    voice.synthesize_wav(text, wav_file)
                else:                                       # older piper-tts
                    voice.synthesize(text, wav_file)
            return path.exists() and path.stat().st_size > 44
        except Exception as error:
            print("[voice] Piper error:", error)
            return False

    def _tts_offline(self, text, path):
        """pyttsx3 (the computer's own voices). Returns False if no voice fits the language."""
        import pyttsx3

        engine = pyttsx3.init()
        wanted = ("persian", "farsi") if VOICE_LANGUAGE == "fa" else ("english",)
        for voice in engine.getProperty("voices") or []:
            label = (voice.name + " " + " ".join(map(str, getattr(voice, "languages", [])))).lower()
            if any(w in label for w in wanted) or label.find(VOICE_LANGUAGE) >= 0:
                engine.setProperty("voice", voice.id)
                break
        else:
            if VOICE_LANGUAGE == "fa":
                return False            # no Persian voice installed: the bubble still shows the text
        engine.save_to_file(text, str(path))
        engine.runAndWait()
        return path.exists() and path.stat().st_size > 0

    def _tts_job(self, text, token):
        use_online = (_has("edge_tts") and TTS_MODE != "offline"
                      and (TTS_MODE == "online" or internet_ok()))
        extension = "mp3" if use_online else "wav"
        path = Path(tempfile.gettempdir()) / f"bluepet_{uuid.uuid4().hex}.{extension}"

        async def synthesize():
            import edge_tts
            communicate = edge_tts.Communicate(
                text, TTS_VOICE, rate=TTS_RATE, pitch=TTS_PITCH
            )
            await communicate.save(str(path))

        try:
            if use_online:
                asyncio.run(synthesize())
            elif self.piper_ok and self._tts_piper(text, path):
                pass                                # natural offline voice
            elif _has("pyttsx3"):
                if not self._tts_offline(text, path):
                    path.unlink(missing_ok=True)
                    return
            else:
                return
        except Exception as error:
            print("[voice] TTS error:", error)
            path.unlink(missing_ok=True)
            if use_online:
                self._error(L["err_tts"])
            return

        if token != self._speak_token:       # a newer reply (or "be quiet") replaced this one
            path.unlink(missing_ok=True)
            return

        self.audioReady.emit(str(path))