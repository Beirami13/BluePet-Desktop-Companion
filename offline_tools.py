"""
Offline student tools for Blue Pet (no internet needed).

Everything is stored in a local SQLite database: data/bluepet.db (created automatically).

  - Notes            permanent notes with search
  - Tasks            to-do list with optional due date
  - Study tracker    study timer + daily / weekly report
  - Calculator       safe math evaluation (never uses eval)
  - Clipboard        history of copied text

Main.py exposes these methods to JavaScript through one bridge slot (see PUBLIC_API).
User mistakes raise ValueError with a readable message; the bridge turns it into an error reply.
"""

import ast
import math
import operator
import re
import sqlite3
import threading
import time
from datetime import date, datetime, timedelta, time as dtime
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DB_FILE = DATA_DIR / "bluepet.db"

MAX_TITLE = 200
MAX_NOTE_BODY = 100_000
MAX_TASK_TITLE = 300
MAX_SUBJECT = 80
MAX_CLIPS = 200                 # older copies are dropped
MAX_CLIP_LENGTH = 20_000        # longer text is not recorded
CLIP_PREVIEW = 500              # characters sent to the list view
RESUME_WINDOW = 120             # seconds: a study timer older than this was left by a closed app

# Methods JavaScript is allowed to call
PUBLIC_API = frozenset({
    "notes_list", "note_save", "note_delete",
    "tasks_list", "task_add", "task_toggle", "task_delete", "tasks_clear_done",
    "study_status", "study_start", "study_stop", "study_report",
    "calculate",
    "clipboard_list", "clipboard_activate", "clipboard_delete",
    "clipboard_clear", "clipboard_set_enabled",
})


# ======================================================================
#                              Calculator
# ======================================================================

MAX_EXPRESSION = 200


def _safe_pow(a, b):
    if isinstance(a, int) and isinstance(b, int) and b > 0 and a not in (0, 1, -1):
        if b * math.log10(abs(a)) > 300:
            raise ValueError("The number is too large")
    result = a ** b
    if isinstance(result, complex):
        raise ValueError("The result is not a real number")
    return result


def _factorial(n):
    if isinstance(n, float):
        if not n.is_integer():
            raise ValueError("Factorial needs a whole number")
        n = int(n)
    if n < 0 or n > 170:
        raise ValueError("Factorial works from 0 to 170")
    return math.factorial(n)


_BINARY = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: _safe_pow,
}
_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}

_FUNCTIONS = {
    "sqrt": math.sqrt, "abs": abs, "round": round,
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "asin": math.asin, "acos": math.acos, "atan": math.atan,
    "log": math.log10, "ln": math.log, "exp": math.exp,
    "floor": math.floor, "ceil": math.ceil,
    "radians": math.radians, "degrees": math.degrees,
    "factorial": _factorial, "min": min, "max": max,
}
_CONSTANTS = {"pi": math.pi, "e": math.e, "tau": math.tau}

_DIGITS = {ord(c): str(i) for i, c in enumerate("۰۱۲۳۴۵۶۷۸۹")}
_DIGITS.update({ord(c): str(i) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩")})
_SYMBOLS = {
    ord("×"): "*", ord("÷"): "/", ord("−"): "-", ord("–"): "-",
    ord("٫"): ".", ord("٬"): "", ord("π"): "pi", ord("^"): "**",
}


def _normalize_expression(text):
    text = str(text or "").translate(_DIGITS).translate(_SYMBOLS)
    text = re.sub(r"(?<=\d)\s*[xX]\s*(?=\d)", "*", text)   # "2 x 3"
    return text.strip().rstrip("=").strip()


def _evaluate(node):
    if isinstance(node, ast.Expression):
        return _evaluate(node.body)

    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise ValueError("Only numbers are allowed")
        return node.value

    if isinstance(node, ast.Name):
        if node.id in _CONSTANTS:
            return _CONSTANTS[node.id]
        raise ValueError(f"Unknown name: {node.id}")

    if isinstance(node, ast.BinOp):
        operation = _BINARY.get(type(node.op))
        if operation is None:
            raise ValueError("That operator is not supported")
        return operation(_evaluate(node.left), _evaluate(node.right))

    if isinstance(node, ast.UnaryOp):
        operation = _UNARY.get(type(node.op))
        if operation is None:
            raise ValueError("That operator is not supported")
        return operation(_evaluate(node.operand))

    if isinstance(node, ast.Call):
        if (not isinstance(node.func, ast.Name) or node.keywords
                or node.func.id not in _FUNCTIONS):
            raise ValueError("Unknown function")
        args = [_evaluate(arg) for arg in node.args]
        try:
            return _FUNCTIONS[node.func.id](*args)
        except TypeError:
            raise ValueError("Wrong number of arguments") from None
        except (ValueError, OverflowError, ZeroDivisionError):
            raise ValueError("Math error (check the function input)") from None

    raise ValueError("Unsupported expression")


def _format_number(value):
    if isinstance(value, int):
        return str(value) if abs(value) < 10 ** 15 else f"{value:.12g}"
    if math.isnan(value) or math.isinf(value):
        raise ValueError("The result is not a finite number")
    if value == int(value) and abs(value) < 1e15:
        return str(int(value))
    return f"{value:.12g}"


def evaluate_expression(text):
    """Safely evaluates a math expression. Raises ValueError with a readable message."""
    expression = _normalize_expression(text)
    if not expression:
        raise ValueError("Type an expression first")
    if len(expression) > MAX_EXPRESSION:
        raise ValueError("The expression is too long")

    try:
        tree = ast.parse(expression, mode="eval")
        return _format_number(_evaluate(tree))
    except ZeroDivisionError:
        raise ValueError("Division by zero") from None
    except OverflowError:
        raise ValueError("The number is too large") from None
    except (SyntaxError, RecursionError, MemoryError):
        raise ValueError("That is not a valid expression") from None


# ======================================================================
#                              Database
# ======================================================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    due          TEXT,
    done         INTEGER NOT NULL DEFAULT 0,
    created_at   REAL NOT NULL,
    completed_at REAL
);
CREATE TABLE IF NOT EXISTS study_sessions (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    subject  TEXT NOT NULL DEFAULT '',
    start_ts REAL NOT NULL,
    end_ts   REAL,
    last_ts  REAL
);
CREATE TABLE IF NOT EXISTS clipboard (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def _escape_like(text):
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _clean_due(due):
    due = (due or "").strip() if isinstance(due, str) or due is None else str(due)
    if not due:
        return None
    try:
        return date.fromisoformat(due).isoformat()
    except ValueError:
        raise ValueError("The due date is not valid") from None


class OfflineTools:
    def __init__(self, db_file=DB_FILE):
        db_file = Path(db_file)
        db_file.parent.mkdir(parents=True, exist_ok=True)

        self._lock = threading.RLock()
        self._db = sqlite3.connect(str(db_file), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        with self._lock, self._db:
            self._db.executescript(SCHEMA)
        self._recover_sessions()

    def close(self):
        """Called when the app closes: stops a running study timer and closes the database."""
        with self._lock:
            try:
                self.study_stop()
                self._db.close()
            except Exception as error:
                print("[tools] close error:", error)

    # ------------------------------------------------------------------
    #                              Notes
    # ------------------------------------------------------------------

    def notes_list(self, query=""):
        query = (query or "").strip()
        sql = "SELECT * FROM notes"
        params = []
        if query:
            like = "%" + _escape_like(query) + "%"
            sql += " WHERE title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\'"
            params = [like, like]
        sql += " ORDER BY updated_at DESC, id DESC"
        with self._lock:
            return [dict(row) for row in self._db.execute(sql, params)]

    def note_save(self, note_id, title, body):
        """Creates a note (note_id empty) or updates one. Returns the saved note."""
        title = (title or "").strip()
        body = body or ""
        if len(body) > MAX_NOTE_BODY:
            raise ValueError("The note is too long")
        if not title and not body.strip():
            raise ValueError("The note is empty")
        if not title:                                    # title from the first line
            title = body.strip().splitlines()[0][:40]
        title = title[:MAX_TITLE]
        now = time.time()

        with self._lock, self._db:
            if note_id:
                cursor = self._db.execute(
                    "UPDATE notes SET title=?, body=?, updated_at=? WHERE id=?",
                    (title, body, now, int(note_id)),
                )
                if cursor.rowcount == 0:
                    raise ValueError("That note no longer exists")
            else:
                cursor = self._db.execute(
                    "INSERT INTO notes (title, body, created_at, updated_at) VALUES (?,?,?,?)",
                    (title, body, now, now),
                )
                note_id = cursor.lastrowid
            row = self._db.execute("SELECT * FROM notes WHERE id=?", (int(note_id),)).fetchone()
        return dict(row)

    def note_delete(self, note_id):
        with self._lock, self._db:
            self._db.execute("DELETE FROM notes WHERE id=?", (int(note_id),))
        return True

    # ------------------------------------------------------------------
    #                              Tasks
    # ------------------------------------------------------------------

    def tasks_list(self):
        sql = """
            SELECT * FROM tasks
            ORDER BY done ASC,
                     CASE WHEN done = 0 THEN COALESCE(due, '9999-12-31') END ASC,
                     completed_at DESC,
                     id ASC
        """
        with self._lock:
            return [dict(row) for row in self._db.execute(sql)]

    def task_add(self, title, due=None):
        title = (title or "").strip()
        if not title:
            raise ValueError("Write the task first")
        title = title[:MAX_TASK_TITLE]
        due = _clean_due(due)

        with self._lock, self._db:
            cursor = self._db.execute(
                "INSERT INTO tasks (title, due, created_at) VALUES (?,?,?)",
                (title, due, time.time()),
            )
            row = self._db.execute("SELECT * FROM tasks WHERE id=?", (cursor.lastrowid,)).fetchone()
        return dict(row)

    def task_toggle(self, task_id):
        """Marks a task done / not done. Returns the updated task."""
        with self._lock, self._db:
            row = self._db.execute("SELECT * FROM tasks WHERE id=?", (int(task_id),)).fetchone()
            if row is None:
                raise ValueError("That task no longer exists")
            done = 0 if row["done"] else 1
            self._db.execute(
                "UPDATE tasks SET done=?, completed_at=? WHERE id=?",
                (done, time.time() if done else None, row["id"]),
            )
            row = self._db.execute("SELECT * FROM tasks WHERE id=?", (row["id"],)).fetchone()
        return dict(row)

    def task_delete(self, task_id):
        with self._lock, self._db:
            self._db.execute("DELETE FROM tasks WHERE id=?", (int(task_id),))
        return True

    def tasks_clear_done(self):
        with self._lock, self._db:
            cursor = self._db.execute("DELETE FROM tasks WHERE done=1")
        return cursor.rowcount

    # ------------------------------------------------------------------
    #                           Study tracker
    # ------------------------------------------------------------------

    def _active_session(self):
        return self._db.execute(
            "SELECT * FROM study_sessions WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1"
        ).fetchone()

    def _recover_sessions(self):
        """
        A timer left running by a closed or crashed app is ended at its last heartbeat,
        so the studied time is kept but the hours the app was closed are not counted.
        A timer that was alive a moment ago (quick restart) keeps running.
        """
        now = time.time()
        with self._lock, self._db:
            rows = self._db.execute(
                "SELECT * FROM study_sessions WHERE end_ts IS NULL ORDER BY id"
            ).fetchall()
            for index, row in enumerate(rows):
                last = row["last_ts"] or row["start_ts"]
                is_newest = index == len(rows) - 1
                if is_newest and now - last <= RESUME_WINDOW:
                    continue
                self._db.execute(
                    "UPDATE study_sessions SET end_ts=? WHERE id=?",
                    (max(row["start_ts"], last), row["id"]),
                )

    def heartbeat(self):
        """Called every few seconds by Main.py while the app runs."""
        with self._lock, self._db:
            self._db.execute(
                "UPDATE study_sessions SET last_ts=? WHERE end_ts IS NULL", (time.time(),)
            )

    def study_status(self):
        with self._lock:
            row = self._active_session()
        if row is None:
            return {"active": False, "subject": "", "start_ts": 0, "elapsed": 0}
        return {
            "active": True,
            "subject": row["subject"],
            "start_ts": row["start_ts"],
            "elapsed": max(0, time.time() - row["start_ts"]),
        }

    def study_start(self, subject=""):
        subject = (subject or "").strip()[:MAX_SUBJECT]
        with self._lock, self._db:
            if self._active_session() is not None:
                status = self.study_status()
                status["already"] = True
                return status
            now = time.time()
            self._db.execute(
                "INSERT INTO study_sessions (subject, start_ts, last_ts) VALUES (?,?,?)",
                (subject, now, now),
            )
        status = self.study_status()
        status["already"] = False
        return status

    def study_stop(self):
        with self._lock, self._db:
            row = self._active_session()
            if row is None:
                return {"stopped": False, "seconds": 0, "subject": ""}
            now = time.time()
            self._db.execute("UPDATE study_sessions SET end_ts=? WHERE id=?", (now, row["id"]))
        return {
            "stopped": True,
            "seconds": int(max(0, now - row["start_ts"])),
            "subject": row["subject"],
        }

    def study_report(self, days=7):
        """Study time per day and per subject for today and the last `days` days."""
        days = max(1, min(int(days), 60))
        now_dt = datetime.now()
        now = now_dt.timestamp()
        today = now_dt.date()
        day_list = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
        bounds = {
            d: (
                datetime.combine(d, dtime.min).timestamp(),
                datetime.combine(d + timedelta(days=1), dtime.min).timestamp(),
            )
            for d in day_list
        }

        with self._lock:
            rows = self._db.execute(
                "SELECT subject, start_ts, COALESCE(end_ts, ?) AS end_ts FROM study_sessions "
                "WHERE start_ts < ? AND COALESCE(end_ts, ?) > ?",
                (now, now, now, bounds[day_list[0]][0]),
            ).fetchall()
            active = self._active_session() is not None

        per_day = {d: 0.0 for d in day_list}
        range_subjects = {}
        today_subjects = {}

        def add(table, subject, seconds):
            key = subject.casefold()
            entry = table.setdefault(key, [subject, 0.0])
            entry[1] += seconds

        for row in rows:
            for d in day_list:
                low, high = bounds[d]
                overlap = min(row["end_ts"], high) - max(row["start_ts"], low)
                if overlap <= 0:
                    continue
                per_day[d] += overlap
                add(range_subjects, row["subject"], overlap)
                if d == today:
                    add(today_subjects, row["subject"], overlap)

        def listing(table):
            items = [{"subject": s, "seconds": int(sec)} for s, sec in table.values()]
            return sorted((i for i in items if i["seconds"] > 0),
                          key=lambda i: i["seconds"], reverse=True)

        return {
            "active": active,
            "today": {"seconds": int(per_day[today]), "subjects": listing(today_subjects)},
            "range": {
                "seconds": int(sum(per_day.values())),
                "days": [{"date": d.isoformat(), "seconds": int(per_day[d])} for d in day_list],
                "subjects": listing(range_subjects),
            },
        }

    # ------------------------------------------------------------------
    #                            Calculator
    # ------------------------------------------------------------------

    def calculate(self, expression):
        return {"expression": str(expression or "").strip(),
                "result": evaluate_expression(expression)}

    # ------------------------------------------------------------------
    #                         Clipboard history
    # ------------------------------------------------------------------

    def _setting(self, key, default):
        row = self._db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return row["value"] if row else default

    def clipboard_enabled(self):
        with self._lock:
            return self._setting("clipboard_enabled", "1") == "1"

    def clipboard_set_enabled(self, enabled):
        with self._lock, self._db:
            self._db.execute(
                "INSERT INTO settings (key, value) VALUES ('clipboard_enabled', ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                ("1" if enabled else "0",),
            )
        return bool(enabled)

    def clipboard_add(self, text):
        """Records copied text (called by Main.py). Returns True if the history changed."""
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_CLIP_LENGTH:
            return False
        with self._lock, self._db:
            if self._setting("clipboard_enabled", "1") != "1":
                return False
            self._db.execute("DELETE FROM clipboard WHERE text=?", (text,))   # move to the top
            self._db.execute(
                "INSERT INTO clipboard (text, created_at) VALUES (?,?)", (text, time.time())
            )
            self._db.execute(
                "DELETE FROM clipboard WHERE id NOT IN "
                "(SELECT id FROM clipboard ORDER BY id DESC LIMIT ?)", (MAX_CLIPS,)
            )
        return True

    def clipboard_list(self, query=""):
        query = (query or "").strip()
        sql = ("SELECT id, substr(text, 1, ?) AS text, length(text) AS length, created_at "
               "FROM clipboard")
        params = [CLIP_PREVIEW]
        if query:
            sql += " WHERE text LIKE ? ESCAPE '\\'"
            params.append("%" + _escape_like(query) + "%")
        sql += " ORDER BY id DESC"
        with self._lock:
            items = [dict(row) for row in self._db.execute(sql, params)]
            enabled = self._setting("clipboard_enabled", "1") == "1"
        return {"enabled": enabled, "items": items}

    def clipboard_activate(self, clip_id):
        """Returns the full text of an item so Main.py can put it back on the clipboard."""
        with self._lock, self._db:
            row = self._db.execute(
                "SELECT text FROM clipboard WHERE id=?", (int(clip_id),)
            ).fetchone()
            if row is None:
                raise ValueError("That item no longer exists")
            self._db.execute("DELETE FROM clipboard WHERE id=?", (int(clip_id),))
            self._db.execute(
                "INSERT INTO clipboard (text, created_at) VALUES (?,?)",
                (row["text"], time.time()),
            )
        return row["text"]

    def clipboard_delete(self, clip_id):
        with self._lock, self._db:
            self._db.execute("DELETE FROM clipboard WHERE id=?", (int(clip_id),))
        return True

    def clipboard_clear(self):
        with self._lock, self._db:
            cursor = self._db.execute("DELETE FROM clipboard")
        return cursor.rowcount
