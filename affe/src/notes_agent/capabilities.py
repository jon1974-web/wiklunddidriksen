"""
Notes subagent: list, read, add, search notes in ~/.affe/notes/.
"""
from __future__ import annotations

import os
import re


def _notes_dir() -> str:
    path = os.path.expanduser("~/.affe/notes")
    os.makedirs(path, exist_ok=True)
    return path


def list_notes() -> list[str]:
    """List note titles (filenames without .txt)."""
    d = _notes_dir()
    out = []
    for f in os.listdir(d):
        if f.endswith(".txt"):
            out.append(f[:-4])
    return sorted(out)


def read_note(title: str) -> str:
    """Read a note by title. Returns content or error message."""
    safe = re.sub(r"[^\w\s\-]", "", title).strip().replace(" ", "_") or "note"
    path = os.path.join(_notes_dir(), safe + ".txt")
    if not os.path.isfile(path):
        return f"No note named '{title}'."
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def add_note(title: str, content: str) -> str:
    """Create or overwrite a note. Returns confirmation."""
    safe = re.sub(r"[^\w\s\-]", "", title).strip().replace(" ", "_") or "note"
    path = os.path.join(_notes_dir(), safe + ".txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return f"Note '{safe}' saved."


def search_notes(query: str) -> list[tuple[str, str]]:
    """Search notes by content. Returns list of (title, snippet)."""
    query_lower = query.lower()
    out = []
    for name in list_notes():
        path = os.path.join(_notes_dir(), name + ".txt")
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            if query_lower in text.lower():
                idx = text.lower().index(query_lower)
                start = max(0, idx - 30)
                end = min(len(text), idx + 50)
                snippet = (text[start:end] + "…") if end - start == 80 else text[start:end]
                out.append((name, snippet.strip()))
        except Exception:
            continue
    return out
