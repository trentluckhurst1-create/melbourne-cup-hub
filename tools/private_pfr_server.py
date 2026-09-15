from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, os, sys

HOST = "127.0.0.1"
PORT = int(os.environ.get("MCH_PFR_PORT", "8765"))
DATA = Path(os.environ.get("MCH_PFR_DATA", str(Path.home() / "Documents" / "MelbourneCupHubPrivate" / "pfr-private.json"))).expanduser().resolve()
ALLOWED_ORIGINS = {
    "https://trentluckhurst1-create.github.io",
    "http://localhost",
    "http://127.0.0.1",
}

class Handler(BaseHTTPRequestHandler):
    def _origin(self):
        origin = self.headers.get("Origin", "")
        if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
            return origin
        return origin if origin in ALLOWED_ORIGINS else ""

    def _headers(self, status=200, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        origin = self._origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()

    def do_OPTIONS(self):
        origin = self._origin()
        if not origin:
            self._headers(403)
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._headers(200)
            self.wfile.write(json.dumps({"ok": True, "dataExists": DATA.is_file()}).encode())
            return
        if self.path != "/pfr-private.json":
            self._headers(404)
            self.wfile.write(b'{"error":"not found"}')
            return
        if not DATA.is_file():
            self._headers(404)
            self.wfile.write(json.dumps({"error": "private PFR data missing", "expected": str(DATA)}).encode())
            return
        try:
            payload = json.loads(DATA.read_text(encoding="utf-8"))
            if not isinstance(payload, dict) or not isinstance(payload.get("horses"), dict):
                raise ValueError("expected JSON object containing horses")
            body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            self._headers(200)
            self.wfile.write(body)
        except Exception as exc:
            self._headers(500)
            self.wfile.write(json.dumps({"error": str(exc)}).encode())

    def log_message(self, fmt, *args):
        pass

if __name__ == "__main__":
    print(f"Private PFR service: http://{HOST}:{PORT}")
    print(f"Data: {DATA}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
