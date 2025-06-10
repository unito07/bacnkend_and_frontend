import sqlite3
import logging
import os
from datetime import datetime, timezone
import json

logger = logging.getLogger(__name__)

DATABASE_NAME = "activations.db"
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DATABASE_NAME)

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row # Access columns by name
    return conn

def initialize_db():
    """Initializes the database and creates the activations table if it doesn't exist."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activations (
                machine_fingerprint TEXT PRIMARY KEY,
                license_key TEXT NOT NULL,
                license_id_from_keygen TEXT,
                activated_at TEXT NOT NULL,
                expires_at TEXT,
                last_validated_at TEXT,
                metadata TEXT 
            )
        """)
        conn.commit()
        logger.info(f"Database initialized successfully at {DATABASE_PATH}")
    except sqlite3.Error as e:
        logger.error(f"Error initializing database: {e}", exc_info=True)
    finally:
        if conn:
            conn.close()

def store_activation(machine_fingerprint: str, license_key: str, license_id_from_keygen: str = None, expires_at: str = None, metadata: dict = None) -> bool:
    """Stores or updates an activation record for a given machine fingerprint."""
    activated_at = datetime.now(timezone.utc).isoformat()
    last_validated_at = activated_at
    metadata_json = json.dumps(metadata) if metadata else None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO activations (machine_fingerprint, license_key, license_id_from_keygen, activated_at, expires_at, last_validated_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(machine_fingerprint) DO UPDATE SET
                license_key = excluded.license_key,
                license_id_from_keygen = excluded.license_id_from_keygen,
                activated_at = excluded.activated_at, 
                expires_at = excluded.expires_at,
                last_validated_at = excluded.last_validated_at,
                metadata = excluded.metadata
        """, (machine_fingerprint, license_key, license_id_from_keygen, activated_at, expires_at, last_validated_at, metadata_json))
        conn.commit()
        logger.info(f"Activation stored/updated for fingerprint: {machine_fingerprint[:8]}...")
        return True
    except sqlite3.Error as e:
        logger.error(f"Error storing activation for fingerprint {machine_fingerprint[:8]}...: {e}", exc_info=True)
        return False
    finally:
        if conn:
            conn.close()

def get_activation_by_fingerprint(machine_fingerprint: str) -> dict:
    """Retrieves an activation record by machine fingerprint."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM activations WHERE machine_fingerprint = ?", (machine_fingerprint,))
        record = cursor.fetchone()
        if record:
            logger.debug(f"Activation record found for fingerprint: {machine_fingerprint[:8]}...")
            # Convert row to dict
            return dict(record)
        logger.debug(f"No activation record found for fingerprint: {machine_fingerprint[:8]}...")
        return None
    except sqlite3.Error as e:
        logger.error(f"Error retrieving activation for fingerprint {machine_fingerprint[:8]}...: {e}", exc_info=True)
        return None
    finally:
        if conn:
            conn.close()

def is_machine_activated(machine_fingerprint: str) -> tuple[bool, dict | None]:
    """
    Checks if a machine is currently considered activated.
    Returns a tuple: (is_activated_bool, activation_record_dict_or_None)
    """
    record = get_activation_by_fingerprint(machine_fingerprint)
    if not record:
        return False, None

    # Basic check: is there a record?
    # More advanced: check expires_at, potentially re-validate with Keygen.sh if last_validated_at is old.
    # For now, if a record exists, we consider it activated.
    # Expiry check (if expires_at is stored and is a valid ISO date string)
    if record.get("expires_at"):
        try:
            expiry_date = datetime.fromisoformat(record["expires_at"])
            if expiry_date < datetime.now(timezone.utc):
                logger.info(f"Activation for fingerprint {machine_fingerprint[:8]}... has expired on {record['expires_at']}.")
                return False, record # Expired
        except ValueError:
            logger.warning(f"Invalid expires_at format for fingerprint {machine_fingerprint[:8]}...: {record['expires_at']}")
            # Treat as if no expiry or handle as error based on policy

    logger.info(f"Machine with fingerprint {machine_fingerprint[:8]}... is considered activated based on local DB.")
    return True, record

def remove_activation(machine_fingerprint: str) -> bool:
    """Removes an activation record."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM activations WHERE machine_fingerprint = ?", (machine_fingerprint,))
        conn.commit()
        if cursor.rowcount > 0:
            logger.info(f"Activation removed for fingerprint: {machine_fingerprint[:8]}...")
            return True
        logger.info(f"No activation found to remove for fingerprint: {machine_fingerprint[:8]}...")
        return False
    except sqlite3.Error as e:
        logger.error(f"Error removing activation for fingerprint {machine_fingerprint[:8]}...: {e}", exc_info=True)
        return False
    finally:
        if conn:
            conn.close()

def deactivate_machine(machine_fingerprint: str) -> bool:
    """
    Deactivates a machine by removing its activation record.
    This is currently an alias for remove_activation.
    """
    logger.info(f"Deactivating machine (removing record) for fingerprint: {machine_fingerprint[:8]}...")
    return remove_activation(machine_fingerprint)

# Initialize the database when the module is loaded
initialize_db()
