"""Promote a user to admin role.

Usage:
    cd backend
    python -m scripts.promote_admin <username>
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running as plain script: `python scripts/promote_admin.py <username>`
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import get_db  # noqa: E402


def promote(username: str) -> int:
    with get_db() as db:
        row = db.execute("SELECT id, role FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            print(f"User '{username}' not found.")
            return 1
        if row["role"] == "admin":
            print(f"User '{username}' is already admin.")
            return 0
        db.execute("UPDATE users SET role = 'admin' WHERE username = ?", (username,))
    print(f"Promoted '{username}' to admin.")
    return 0


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.promote_admin <username>")
        sys.exit(2)
    sys.exit(promote(sys.argv[1]))


if __name__ == "__main__":
    main()
