"""
Launcher for FastAPI Backend & Modern Web Dashboard.
Starts server at http://localhost:8000
"""
import uvicorn

if __name__ == "__main__":
    print("=" * 65)
    print("🚦 STARTING AI SMART TRAFFIC & ROAD SAFETY ANALYSER")
    print("   FastAPI Backend + Modern Glassmorphic Web Dashboard")
    print("   Open your browser at: http://localhost:8000")
    print("=" * 65)
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
