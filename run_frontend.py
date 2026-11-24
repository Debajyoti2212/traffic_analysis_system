"""
Standalone Frontend Web Server.
Serves the `frontend/` folder on http://localhost:3000
Connects to the FastAPI backend running on http://localhost:8000
"""
import os
import sys
import http.server
import socketserver
import webbrowser

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
SNAPSHOTS_DIR = os.path.join(BASE_DIR, "snapshots")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def translate_path(self, path):
        # Route /snapshots/ requests directly to project snapshots directory
        clean_path = path.split('?', 1)[0].split('#', 1)[0]
        if clean_path.startswith("/snapshots/"):
            rel_path = clean_path[len("/snapshots/"):]
            return os.path.join(SNAPSHOTS_DIR, rel_path)
        return super().translate_path(path)

    def end_headers(self):
        # Enable CORS and caching headers for frontend assets
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

if __name__ == "__main__":
    os.chdir(FRONTEND_DIR)
    print("=" * 70)
    print("🚦 AI SMART TRAFFIC & ROAD SAFETY ANALYSER - FRONTEND SERVER")
    print(f"   Frontend URL : http://localhost:{PORT}")
    print(f"   Backend API  : http://localhost:8000")
    print("=" * 70)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving frontend from: {FRONTEND_DIR}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down frontend server.")
