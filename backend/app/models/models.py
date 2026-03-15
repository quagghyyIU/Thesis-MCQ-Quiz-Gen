"""
Database is managed via raw sqlite3 in app.database.
This module defines status constants.
"""


class JobStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
