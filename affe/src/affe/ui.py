"""
Simple web UI for AFFE: text input and push-to-talk voice.
Serves a single page and POST /api/message for sending messages.
"""
from __future__ import annotations

import os

from flask import Flask, jsonify, request, send_from_directory
from affe.manager import handle

_here = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    static_folder=os.path.join(_here, "web_ui", "static"),
    template_folder=os.path.join(_here, "web_ui", "templates"),
)


@app.route("/")
def index():
    return send_from_directory(app.template_folder, "index.html")


@app.route("/api/message", methods=["POST"])
def api_message():
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"reply": "Please type or say something."}), 400
    try:
        reply = handle(text)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": f"Error: {e}"}), 500


def main():
    import os
    port = int(os.environ.get("AFFE_UI_PORT", 5050))
    print(f"AFFE UI: http://127.0.0.1:{port}")
    print("Close with Ctrl+C.")
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
