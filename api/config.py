"""
Configuration module for GPR Intelligence API.

Reads environment variables with defaults.
"""

import os
from pathlib import Path

# API configuration
GPR_SYNC_ENABLED = os.getenv("GPR_SYNC_ENABLED", "true").lower() == "true"
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Repo root — works whether run from repo root or api/ subdirectory
REPO_ROOT = Path(__file__).resolve().parent.parent
