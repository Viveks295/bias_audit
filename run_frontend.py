#!/usr/bin/env python3
"""
Script to run both the React frontend and Python backend for the AI Bias Audit Framework.
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def run_command(command, cwd=None, shell=False):
    """Run a command and return the process."""
    print(f"Running: {command}")
    if shell:
        return subprocess.Popen(command, shell=True, cwd=cwd)
    else:
        return subprocess.Popen(command.split(), cwd=cwd)

def main():
    # Get the project root directory
    project_root = Path(__file__).parent
    frontend_dir = project_root / "bias-audit-frontend"
    webapp_dir = project_root / "webapp"
    
    # Check if directories exist
    if not frontend_dir.exists():
        print("Error: React frontend directory not found!")
        print("Please make sure you're in the project root directory.")
        sys.exit(1)
    
    if not webapp_dir.exists():
        print("Error: Webapp directory not found!")
        print("Please make sure you're in the project root directory.")
        sys.exit(1)
    
    print("Starting AI Bias Audit Framework...")
    print("=" * 50)
    
    # Start the Python backend
    print("Starting Python backend...")
    backend_process = run_command("python app.py", cwd=webapp_dir)
    
    # Wait a moment for backend to start
    time.sleep(3)
    
    # Start the React frontend
    print("Starting React frontend...")
    frontend_process = run_command("npm start", cwd=frontend_dir)
    
    # Wait a moment for frontend to start
    time.sleep(5)
    
    # Open browser
    print("Opening browser...")
    webbrowser.open("http://localhost:3000")
    
    print("=" * 50)
    print("AI Bias Audit Framework is running!")
    print("Frontend: http://localhost:3000")
    print("Backend API: http://localhost:5000")
    print("Press Ctrl+C to stop both servers")
    print("=" * 50)
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Servers stopped.")

if __name__ == "__main__":
    main() 