"""Pytest configuration helpers.

Ensure the project's `src/` directory is on `sys.path` so imports like
`from gpr_overlay...` work during test collection.
"""
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    # Insert at front so tests prefer local package sources
    sys.path.insert(0, str(SRC))