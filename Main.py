import json
import sys
import tempfile
from pathlib import Path

from PySide6.QtCore import (
    Qt, QUrl, QObject, Slot, QTimer, QPoint, QPropertyAnimation, QEasingCurve
)
from PySide6.QtGui import QColor, QCursor
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout
from PySide6.QtWebEngineCore import QWebEnginePage
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebChannel import QWebChannel

try:
    from PySide6.QtMultimedia import QAudioOutput, QMediaPlayer
    HAS_MEDIA = True
except Exception as error:
    print("[audio] QtMultimedia not available:", error)
    HAS_MEDIA = False

from voice import VoiceEngine, PLAYBACK_RATE

STATE_FILE = Path(__file__).parent / "pet_state.json"


class DebugPage(QWebEnginePage):
    """Prints JavaScript errors/messages in the terminal."""

    def javaScriptConsoleMessage(self, level, message, line, source):
        print(f"[JS] {message} (line {line})")


class PetBridge(QObject):
    def __init__(self, window):
        super().__init__()
        self.window = window

    @Slot()
    def startMove(self):
        handle = self.window.windowHandle()
        if handle:
            handle.startSystemMove()

    @Slot(result=str)
    def loadState(self):
        try:
            return STATE_FILE.read_text(encoding="utf-8")
        except Exception:
            return "{}"

    @Slot(str)
    def saveState(self, data):
        try:
            json.loads(data)  # make sure it is valid JSON
            tmp = STATE_FILE.with_suffix(".tmp")
            tmp.write_text(data, encoding="utf-8")
            tmp.replace(STATE_FILE)
        except Exception as error:
            print("Could not save pet state:", error)

    # ----- voice -----

    @Slot(result=str)
    def voiceStatus(self):
        return json.dumps(self.window.voice.status())

    @Slot(str)
    def speak(self, text):
        self.window.voice.speak(text)

    @Slot()
    def stopSpeaking(self):
        self.window.stop_speaking()

    # ----- movement by voice -----

    @Slot()
    def moveToCursor(self):
        print("[move] moveToCursor called from JavaScript")
        self.window.come_to_cursor()

    @Slot()
    def goHome(self):
        print("[move] goHome called from JavaScript")
        self.window.go_home()


class BluePetWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Blue Pet")
        self.resize(260, 280)

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        self.browser = QWebEngineView(self)
        self.browser.setPage(DebugPage(self.browser))
        self.browser.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        self.browser.setStyleSheet("background: transparent;")
        self.browser.page().setBackgroundColor(QColor(0, 0, 0, 0))

        # Python <-> JavaScript
        self.bridge = PetBridge(self)
        self.channel = QWebChannel(self.browser.page())
        self.channel.registerObject("bridge", self.bridge)
        self.browser.page().setWebChannel(self.channel)

        html_path = Path(__file__).parent / "web" / "index.html"
        if not html_path.exists():
            raise FileNotFoundError(f"HTML file not found: {html_path}")

        self.page_loaded = False
        self.browser.loadFinished.connect(self._on_loaded)
        self.browser.load(QUrl.fromLocalFile(str(html_path.resolve())))

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.browser)

        screen = QApplication.primaryScreen()
        area = screen.availableGeometry()
        self.home_pos = QPoint(
            area.right() - self.width() - 30,
            area.bottom() - self.height() - 30,
        )
        self.move(self.home_pos)

        # Moving by voice
        self.move_anim = None
        self._move_id = 0

        # Global cursor tracking (works even outside the window)
        self.last_key = None
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._track_cursor)
        self.timer.start(16)

        # ----- voice -----
        self._clean_old_audio()

        self.player = None
        self.current_audio = None
        if HAS_MEDIA:
            self.audio_output = QAudioOutput(self)
            self.audio_output.setVolume(0.9)
            self.player = QMediaPlayer(self)
            self.player.setAudioOutput(self.audio_output)
            self.player.mediaStatusChanged.connect(self._on_media_status)
            self.player.errorOccurred.connect(self._on_media_error)

        self.voice = VoiceEngine(media_ok=HAS_MEDIA)
        self.voice.event.connect(self._send_voice_event)
        self.voice.audioReady.connect(self._play_audio)
        self.voice.start()

    # ---------- page / cursor ----------

    def _on_loaded(self, ok):
        self.page_loaded = ok

    def _track_cursor(self):
        if not self.page_loaded:
            return

        global_pos = QCursor.pos()

        # Also resend when the WINDOW moved (the cursor is then at a new
        # position relative to the pet even if the mouse didn't move)
        key = (global_pos.x(), global_pos.y(), self.x(), self.y())
        if key == self.last_key:
            return
        self.last_key = key

        local = self.browser.mapFromGlobal(global_pos)
        self.browser.page().runJavaScript(
            f"window.lookAt && window.lookAt({local.x()}, {local.y()});"
        )

    # ---------- voice events -> JavaScript ----------

    def _send_voice_event(self, kind, payload):
        if not self.page_loaded:
            return
        self.browser.page().runJavaScript(
            f"window.voiceEvent && window.voiceEvent({json.dumps(kind)}, {payload});"
        )

    # ---------- playing the pet's voice ----------

    @staticmethod
    def _clean_old_audio():
        for old in Path(tempfile.gettempdir()).glob("bluepet_*.mp3"):
            try:
                old.unlink()
            except Exception:
                pass

    def _release_audio(self):
        if self.player is not None:
            self.player.stop()
            self.player.setSource(QUrl())
        if self.current_audio:
            try:
                Path(self.current_audio).unlink(missing_ok=True)
            except Exception:
                pass
            self.current_audio = None

    def _play_audio(self, path):
        if self.player is None:
            Path(path).unlink(missing_ok=True)
            return

        self._release_audio()
        self.current_audio = path
        self.player.setSource(QUrl.fromLocalFile(path))
        self.player.setPlaybackRate(PLAYBACK_RATE)
        self.player.play()

        self.voice.set_speaking(True)
        self._send_voice_event("speaking", "{}")

    def _finish_speaking(self):
        was_playing = self.current_audio is not None
        self._release_audio()
        self.voice.set_speaking(False)
        if was_playing:
            self._send_voice_event("speaking_done", "{}")

    def _on_media_status(self, status):
        if status in (
            QMediaPlayer.MediaStatus.EndOfMedia,
            QMediaPlayer.MediaStatus.InvalidMedia,
        ):
            self._finish_speaking()

    def _on_media_error(self, error, message):
        print("[audio] player error:", message)
        self._finish_speaking()

    def stop_speaking(self):
        self.voice.cancel_speaking()
        self._finish_speaking()

    # ---------- moving by voice ----------

    def _animate_to(self, target):
        start = self.pos()
        print(f"[move] from ({start.x()}, {start.y()}) to ({target.x()}, {target.y()})")

        self._move_id += 1
        my_id = self._move_id

        self.move_anim = QPropertyAnimation(self, b"pos", self)
        self.move_anim.setDuration(750)
        self.move_anim.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self.move_anim.setStartValue(start)
        self.move_anim.setEndValue(target)
        self.move_anim.start()

        # Safety net: if the animation didn't get there, jump to the target
        QTimer.singleShot(1200, lambda: self._ensure_at(my_id, target))

    def _ensure_at(self, move_id, target):
        if move_id != self._move_id:
            return  # a newer move replaced this one
        if (self.pos() - target).manhattanLength() > 3:
            print("[move] animation did not arrive, moving directly")
            self.move(target)

    def come_to_cursor(self):
        pos = QCursor.pos()
        screen = QApplication.screenAt(pos) or QApplication.primaryScreen()
        area = screen.availableGeometry()
        print(f"[move] cursor at ({pos.x()}, {pos.y()})")

        # Stand next to the cursor (not under it)
        x = pos.x() - self.width() - 40
        if x < area.left():
            x = pos.x() + 40
        y = pos.y() - self.height() // 2

        x = max(area.left(), min(x, area.right() - self.width()))
        y = max(area.top(), min(y, area.bottom() - self.height()))

        self._animate_to(QPoint(x, y))

    def go_home(self):
        self._animate_to(self.home_pos)

    def closeEvent(self, event):
        self.voice.stop()
        self._release_audio()
        super().closeEvent(event)


if __name__ == "__main__":
    app = QApplication(sys.argv)

    pet = BluePetWindow()
    pet.show()

    sys.exit(app.exec())