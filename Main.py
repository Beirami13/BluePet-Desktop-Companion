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
from offline_tools import OfflineTools, PUBLIC_API

STATE_FILE = Path(__file__).parent / "pet_state.json"

PET_SIZE = (260, 280)       # window size with only the pet
DESK_SIZE = (700, 540)      # window size while the Student Desk panel is open


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

    # ----- Student Desk (offline tools) -----

    @Slot(str, str, result=str)
    def callTool(self, name, args_json):
        return self.window.run_tool(name, args_json)

    @Slot(bool)
    def setDeskOpen(self, is_open):
        self.window.set_desk_open(is_open)


class BluePetWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Blue Pet")
        self.resize(*PET_SIZE)

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

        self.home_pos = self._compute_home()
        self.move(self.home_pos)

        # Student Desk: offline tools (SQLite) + clipboard history
        self.desk_open = False
        try:
            self.tools = OfflineTools()
        except Exception as error:
            print("[tools] could not open the database:", error)
            self.tools = None

        self.clipboard = QApplication.clipboard()
        self.clipboard.dataChanged.connect(self._on_clipboard_changed)

        # Keeps a running study timer safe if the app is killed
        self.heartbeat_timer = QTimer(self)
        self.heartbeat_timer.timeout.connect(self._heartbeat)
        self.heartbeat_timer.start(20000)

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
        for old in Path(tempfile.gettempdir()).glob("bluepet_*.*"):
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

    def _compute_home(self):
        area = QApplication.primaryScreen().availableGeometry()
        return QPoint(
            area.right() - self.width() - 30,
            area.bottom() - self.height() - 30,
        )

    def go_home(self):
        self.home_pos = self._compute_home()      # the window size changes with the desk
        self._animate_to(self.home_pos)

    # ---------- Student Desk ----------

    def set_desk_open(self, is_open):
        """Grows the window (to the left and up) for the panel, or shrinks it back."""
        is_open = bool(is_open)
        if is_open == self.desk_open:
            return
        self.desk_open = is_open

        self._move_id += 1                        # cancel a pending "safety net" move
        if self.move_anim is not None:
            self.move_anim.stop()

        geo = self.geometry()
        screen = QApplication.screenAt(geo.center()) or QApplication.primaryScreen()
        area = screen.availableGeometry()

        new_w, new_h = DESK_SIZE if is_open else PET_SIZE
        new_w = min(new_w, area.width())
        new_h = min(new_h, area.height())

        # Keep the bottom-right corner (where the pet stands) in place
        x = geo.x() + geo.width() - new_w
        y = geo.y() + geo.height() - new_h
        x = max(area.left(), min(x, area.right() - new_w + 1))
        y = max(area.top(), min(y, area.bottom() - new_h + 1))
        self.setGeometry(x, y, new_w, new_h)

        if is_open:
            self.raise_()
            self.activateWindow()
            self.browser.setFocus()

    def run_tool(self, name, args_json):
        """Runs one offline tool for JavaScript. Always returns a JSON string."""
        def reply(ok, **fields):
            return json.dumps({"ok": ok, **fields}, ensure_ascii=False)

        if self.tools is None:
            return reply(False, error="The offline tools could not open their database")
        if name not in PUBLIC_API:
            return reply(False, error="Unknown tool")

        try:
            args = json.loads(args_json or "[]")
            if not isinstance(args, list):
                raise ValueError("Bad arguments")

            if name == "clipboard_activate":
                text = self.tools.clipboard_activate(*args)
                self.clipboard.setText(text)
                return reply(True, data=True)

            return reply(True, data=getattr(self.tools, name)(*args))
        except ValueError as error:               # readable mistakes (empty note, bad date...)
            return reply(False, error=str(error))
        except Exception as error:
            print(f"[tools] {name} failed:", error)
            return reply(False, error="Something went wrong")

    def _send_desk_event(self, kind):
        if not self.page_loaded:
            return
        self.browser.page().runJavaScript(
            f"window.deskEvent && window.deskEvent({json.dumps(kind)});"
        )

    def _on_clipboard_changed(self):
        if self.tools is None:
            return
        try:
            mime = self.clipboard.mimeData()
            if mime is None or not mime.hasText():
                return
            if mime.hasFormat("x-kde-passwordManagerHint"):   # password managers mark secrets
                return
            if self.tools.clipboard_add(mime.text()):
                self._send_desk_event("clipboard")
        except Exception as error:
            print("[clipboard] could not read the clipboard:", error)

    def _heartbeat(self):
        if self.tools is not None:
            try:
                self.tools.heartbeat()
            except Exception as error:
                print("[tools] heartbeat error:", error)

    def closeEvent(self, event):
        if self.tools is not None:
            self.tools.close()
        self.voice.stop()
        self._release_audio()
        super().closeEvent(event)


if __name__ == "__main__":
    app = QApplication(sys.argv)

    pet = BluePetWindow()
    pet.show()

    sys.exit(app.exec())