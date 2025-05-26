import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

CONFIG_FILE_PATH = Path(__file__).parent / "log_folder_config.txt"
DEFAULT_LOGS_DIR_NAME = "scraper_logs"

def get_log_storage_path() -> Path:
    """
    Retrieves the configured log storage path.
    If not configured, uses a default directory 'scraper_logs' inside the script's parent directory.
    """
    if CONFIG_FILE_PATH.exists():
        with open(CONFIG_FILE_PATH, "r") as f:
            path_str = f.read().strip()
            if path_str:
                return Path(path_str)
    
    # Default path if not configured or file is empty
    default_path = Path(__file__).parent.parent / DEFAULT_LOGS_DIR_NAME
    if not default_path.exists():
        default_path.mkdir(parents=True, exist_ok=True)
    return default_path

def set_log_storage_path(path_str: str) -> Dict[str, Any]:
    """
    Sets and saves the log storage path.
    Creates the directory if it doesn't exist.
    """
    try:
        path = Path(path_str)
        if not path.is_dir():
            path.mkdir(parents=True, exist_ok=True)
        
        with open(CONFIG_FILE_PATH, "w") as f:
            f.write(str(path.resolve()))
        return {"message": "Log storage path updated successfully.", "path": str(path.resolve())}
    except Exception as e:
        return {"error": f"Failed to set log storage path: {str(e)}"}

def _generate_log_id() -> str:
    return f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"

def _get_log_file_path(log_id: str) -> Path:
    return get_log_storage_path() / f"{log_id}.json"

def create_log_entry(log_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Creates a new log entry and saves it as a JSON file.
    'log_data' should contain all necessary fields for the log.
    """
    logs_dir = get_log_storage_path()
    if not logs_dir.exists():
        logs_dir.mkdir(parents=True, exist_ok=True)

    log_id = _generate_log_id()
    log_entry = {
        "id": log_id,
        "timestamp": datetime.now().isoformat(),
        **log_data  # Merge provided data
    }
    
    file_path = _get_log_file_path(log_id)
    try:
        with open(file_path, "w") as f:
            json.dump(log_entry, f, indent=4)
        return log_entry
    except Exception as e:
        return {"error": f"Failed to create log entry: {str(e)}"}

def get_all_log_entries() -> List[Dict[str, Any]]:
    """Retrieves all log entries."""
    logs_dir = get_log_storage_path()
    if not logs_dir.exists():
        return []
    
    log_entries = []
    for log_file in logs_dir.glob("*.json"):
        try:
            with open(log_file, "r") as f:
                log_entries.append(json.load(f))
        except Exception:
            # Skip corrupted or unreadable files
            continue 
    # Sort by timestamp, newest first
    log_entries.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return log_entries

def get_log_entry(log_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a specific log entry by its ID."""
    file_path = _get_log_file_path(log_id)
    if file_path.exists():
        try:
            with open(file_path, "r") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def delete_log_entry(log_id: str) -> bool:
    """Deletes a specific log entry by its ID."""
    file_path = _get_log_file_path(log_id)
    if file_path.exists():
        try:
            file_path.unlink()
            return True
        except Exception:
            return False
    return False

def clear_all_logs() -> Dict[str, Any]:
    """Deletes all log files from the storage directory."""
    logs_dir = get_log_storage_path()
    deleted_count = 0
    errors = []
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.json"):
            try:
                log_file.unlink()
                deleted_count += 1
            except Exception as e:
                errors.append(f"Failed to delete {log_file.name}: {str(e)}")
    
    if errors:
        return {"message": f"Cleared {deleted_count} log(s) with some errors.", "errors": errors}
    return {"message": f"Successfully cleared {deleted_count} log(s)."}

if __name__ == '__main__':
    # Example Usage (for testing)
    print(f"Current log storage path: {get_log_storage_path()}")
    
    # Set a custom path (creates directory if not exists)
    # custom_path_result = set_log_storage_path("./my_custom_scraper_logs")
    # print(custom_path_result)
    # print(f"Updated log storage path: {get_log_storage_path()}")

    # Create a sample log
    sample_log_data = {
        "scrapeType": "Static",
        "targetUrl": "https://example.com",
        "status": "Success",
        "dataPreview": "<html>...</html>",
        "dataFilePath": None,
        "errorMessage": None
    }
    # created_log = create_log_entry(sample_log_data)
    # print(f"Created log: {created_log}")

    # if "id" in created_log:
    #     log_id_to_test = created_log["id"]
        
        # Get the created log
        # retrieved_log = get_log_entry(log_id_to_test)
        # print(f"Retrieved log: {retrieved_log}")

        # Get all logs
        # all_logs = get_all_log_entries()
        # print(f"All logs ({len(all_logs)}):")
        # for log in all_logs:
        #     print(f"  - {log.get('id')} @ {log.get('timestamp')}")

        # Delete the created log
        # delete_status = delete_log_entry(log_id_to_test)
        # print(f"Delete status for {log_id_to_test}: {delete_status}")

    # Clear all logs (use with caution)
    # clear_result = clear_all_logs()
    # print(clear_result)
    
    # Reset to default path for subsequent tests if needed
    # if CONFIG_FILE_PATH.exists():
    #     CONFIG_FILE_PATH.unlink()
    # print(f"Log path after reset (should be default): {get_log_storage_path()}")
    pass
