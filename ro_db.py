"""Read-only connections to the bundled library databases, one per thread.

The server answers several requests at once on different threads. A single
SQLite connection shared between threads isn't safe: two requests using it at
the same moment fail with "bad parameter or other API misuse", and can crash
the whole server (which then shows 502 Bad Gateway until it restarts). So each
thread opens its own connection to each file and keeps it."""
import os
import sqlite3
import threading

_local = threading.local()


def connect(path, rows=True):
    """This thread's read-only connection to `path` (None if the file is missing)."""
    conns = getattr(_local, "conns", None)
    if conns is None:
        conns = _local.conns = {}
    key = (path, rows)
    c = conns.get(key)
    if c is None:
        if not os.path.exists(path):
            return None
        c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        # A small page cache each: there's one connection per thread per file.
        c.execute("PRAGMA cache_size = -512")
        if rows:
            c.row_factory = sqlite3.Row
        conns[key] = c
    return c
