import os

from flask import Flask, jsonify, request, Response, render_template
from flask_cors import CORS
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
import yt_dlp

app = Flask(__name__)
CORS(app)


@app.get("/")
def index():
    return render_template("index.html")


def _extract_audio(url: str) -> dict:
    ydl_opts = {
        "format": "bestaudio/best",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    return {
        "title": info.get("title"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "webpage_url": info.get("webpage_url"),
        "audio_url": info.get("url"),
    }


@app.post("/api/resolve")
def resolve_audio():
    data = request.get_json(silent=True) or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "Missing url"}), 400

    try:
        payload = _extract_audio(url)
        return jsonify(payload)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.get("/api/proxy")
def proxy_audio():
    # Use only when direct audio_url is blocked by CORS.
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "Missing url"}), 400

    try:
        upstream = urlopen(url)
        content_type = upstream.headers.get("Content-Type", "audio/mpeg")

        def generate():
            while True:
                chunk = upstream.read(64 * 1024)
                if not chunk:
                    break
                yield chunk

        return Response(generate(), content_type=content_type)
    except (HTTPError, URLError) as exc:
        return jsonify({"error": str(exc)}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
