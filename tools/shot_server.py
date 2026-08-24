"""Mini-Server: nimmt Canvas-Screenshots (dataURL) per POST an und speichert sie."""
import base64
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "_shots")
os.makedirs(OUT, exist_ok=True)
counter = [0]

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(n).decode("utf-8")
        name = self.path.strip("/").replace("..", "") or "shot"
        if "," in data:
            data = data.split(",", 1)[1]
        counter[0] += 1
        fp = os.path.join(OUT, f"{name}_{counter[0]:03d}.jpg")
        with open(fp, "wb") as f:
            f.write(base64.b64decode(data))
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(fp.encode())

HTTPServer(("127.0.0.1", 8138), H).serve_forever()
