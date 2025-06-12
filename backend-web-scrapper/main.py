print("[DEBUG] THIS IS THE CORRECT main.py")
# --- Environment Variable Loading (should be at the very top) ---
import os
import sys
from dotenv import load_dotenv

# Determine the base path for resources, accommodating PyInstaller
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Running in a PyInstaller bundle, .env is at the root of _MEIPASS
    env_path = os.path.join(sys._MEIPASS, '.env') # Corrected path for frozen app
    # Runtime debug for --onefile build to list contents of _MEIPASS
    try:
        print("[DEBUG] Files in _MEIPASS:", os.listdir(sys._MEIPASS))
    except Exception as e:
        print(f"[DEBUG] Error listing files in _MEIPASS: {e}")
else:
    # Running as a script, .env is in the same directory as main.py (backend-web-scrapper)
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')

# User-requested debug logs
print("[DEBUG] CONFIRM env_path is:", env_path)
print("[DEBUG] Is frozen?", getattr(sys, 'frozen', False))
print("[DEBUG] Source file path:", __file__)
# End of user-requested debug logs

print(f"[DEBUG] main.py: Attempting to load .env from: {env_path}")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
    print(f"[DEBUG] main.py: Successfully loaded .env from {env_path}")
else:
    print(f"[DEBUG] main.py: .env file NOT FOUND at {env_path}. Keygen credentials might be missing if not set in environment.")
# --- End of Environment Variable Loading ---

import asyncio # Added for to_thread
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from pathlib import Path
import uuid # Added for session IDs
import pandas as pd # Added for DataFrame conversion
import logging # Added for logging
import webbrowser # For opening the browser
import threading # For opening browser after server starts
import os # For path joining
import sys # For checking if running in PyInstaller bundle
import requests # Added for static scraping
from bs4 import BeautifulSoup # Added for static scraping

from dynamic_web_scrapper import DynamicWebScraper, scrape_dynamic_data, scrape_dynamic_with_pagination, set_scraper_status, get_scraper_status # Removed scrape_data
import log_manager # Import the new log manager
import keygen_service # Import the new keygen service
import activation_service # Import the new activation service
import asyncio # Ensure asyncio is imported for to_thread

# Configure logging for main.py
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Static Scrape Function ---
def scrape_data(url: str):
    """Performs a simple static scrape of the given URL."""
    logger.info(f"Static scrape_data called for URL: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.title.string if soup.title else "No title found"
        
        # Extract all text, trying to be somewhat clean
        texts = soup.stripped_strings
        all_text = "\n".join(list(texts)[:50]) # Limit to first 50 strings to keep it manageable

        return {
            "url": url,
            "title": title,
            "content_preview": all_text[:1000] + "..." if len(all_text) > 1000 else all_text
        }
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error during static scrape for {url}: {e}")
        return {"error": f"HTTP error: {e.response.status_code} - {e.response.reason}", "url": url}
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error during static scrape for {url}: {e}")
        return {"error": f"Request error: {str(e)}", "url": url}
    except Exception as e:
        logger.error(f"Unexpected error during static scrape for {url}: {e}", exc_info=True)
        return {"error": f"An unexpected error occurred: {str(e)}", "url": url}

app = FastAPI()

# Global store for interactive WebDriver sessions
# Format: { "session_id": {"driver": WebDriver_instance, "scraper_instance": DynamicWebScraper_instance} }
interactive_sessions: Dict[str, Dict[str, Any]] = {}

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",  # Assuming your frontend runs on port 3000
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Determine static files path (for bundled app) ---
def get_static_folder_path():
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        # Running in a PyInstaller bundle (onefile)
        return os.path.join(sys._MEIPASS, 'static_frontend')
    elif getattr(sys, 'frozen', False):
        # Running in a PyInstaller bundle (onedir)
        return os.path.join(os.path.dirname(sys.executable), 'static_frontend')
    else:
        # Running as a script
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'front-end-react', 'dist')

STATIC_FILES_DIR = get_static_folder_path()
INDEX_HTML_PATH = os.path.join(STATIC_FILES_DIR, "index.html")


# --- Pydantic Models for Logging ---
class LogPathPayload(BaseModel):
    path: str

class LogEntryResponse(BaseModel):
    id: str
    timestamp: str
    scrapeType: str
    targetUrl: str
    status: str
    dataPreview: Optional[str] = None
    dataFilePath: Optional[str] = None
    errorMessage: Optional[str] = None
    requestPayload: Optional[Dict[str, Any]] = None
    scrapedData: Optional[Any] = None # Added to store actual scraped data


# --- Logging Endpoints ---
@app.post("/logs/config/path", summary="Set Log Storage Path")
async def set_log_path(payload: LogPathPayload):
    result = await asyncio.to_thread(log_manager.set_log_storage_path, payload.path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/logs/config/path", summary="Get Log Storage Path", response_model=Dict[str, str])
async def get_log_path():
    path = await asyncio.to_thread(log_manager.get_log_storage_path)
    return {"path": str(path)}

@app.get("/logs", summary="Get All Log Entries", response_model=List[LogEntryResponse])
async def get_all_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None  # Added status filter
):
    # Pass start_date, end_date, and status directly to the log_manager
    logs = await asyncio.to_thread(log_manager.get_all_log_entries, start_date, end_date, status)
    return logs

@app.get("/logs/{log_id}", summary="Get Specific Log Entry", response_model=Optional[LogEntryResponse])
async def get_log(log_id: str):
    log_entry = await asyncio.to_thread(log_manager.get_log_entry, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
    if "error" in log_entry: # Should not happen with current get_log_entry logic but good practice
        raise HTTPException(status_code=500, detail=log_entry["error"])
    return log_entry

@app.delete("/logs/clear", summary="Clear All Log Entries")
async def clear_logs(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None
):
    result = await asyncio.to_thread(log_manager.clear_all_logs, start_date, end_date, status)
    # The result from clear_all_logs now includes "deleted_count", which is good for the client.
    # If "errors" are present in the result and it's significant, consider raising HTTPException.
    # For now, returning the full result dictionary.
    if "errors" in result and result["errors"]:
        # Potentially log this on the server side as well or handle more gracefully
        # For now, we'll still return 200 but with error details.
        # If a more severe error (e.g., directory not accessible) occurred,
        # log_manager might need to raise an exception that gets caught here.
        pass
    return result

@app.delete("/logs/{log_id}", summary="Delete Specific Log Entry")
async def delete_log(log_id: str):
    success = await asyncio.to_thread(log_manager.delete_log_entry, log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Log entry not found or could not be deleted")
    return {"message": "Log entry deleted successfully"}

# --- Pydantic Model for Dynamic Scrape Payload ---
class DynamicScrapeField(BaseModel):
    name: str
    selector: str
    id: Optional[str] = None # id from frontend, not strictly needed by backend logic

class DynamicScrapePayload(BaseModel):
    url: str
    container_selector: str
    custom_fields: List[DynamicScrapeField]
    enable_scrolling: Optional[bool] = False
    max_scrolls: Optional[int] = 5
    scroll_to_end_page: Optional[bool] = False
    enable_pagination: Optional[bool] = False
    start_page: Optional[int] = 1
    end_page: Optional[int] = 5
    pagination_type: Optional[str] = "Next Button"
    page_param: Optional[str] = "page"
    next_button_selector: Optional[str] = None
    pre_scrape_interactions: Optional[List[str]] = Field(default_factory=list)


# --- Pydantic Models for Interactive Mode ---
class InteractiveStartPayload(BaseModel):
    start_url: Optional[str] = None
    user_data_dir: Optional[str] = None
    profile_directory: Optional[str] = None

# --- Pydantic Models for Enhanced License Activation ---
class LicenseActivateRequest(BaseModel):
    license_key: str
    machine_fingerprint: str

class LicenseActivationResponse(BaseModel): # Renamed from LicenseValidationResponse
    activated: bool # Changed from 'valid' to 'activated' for clarity
    message: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None # From Keygen if applicable
    license_details: Optional[Dict[str, Any]] = None # Details from Keygen about the license
    activation_record: Optional[Dict[str, Any]] = None # Details from local DB record

class LicenseStatusRequest(BaseModel):
    machine_fingerprint: str

class LicenseStatusResponse(BaseModel):
    is_active: bool
    message: Optional[str] = None
    license_key_hint: Optional[str] = None # e.g., last 4 chars of activated key
    # Potentially add more details from the stored activation record if needed


class InteractiveStartResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    message: str
    current_url: Optional[str] = None # Optionally return the URL if driver.get was called

class InteractiveScrapePayload(BaseModel):
    session_id: str
    container_selector: str
    custom_fields: List[DynamicScrapeField]
    # No URL needed, scrapes current page
    # No pre-scrape interactions needed, user does this manually

class InteractiveStopPayload(BaseModel):
    session_id: str

class InteractiveStopResponse(BaseModel):
    success: bool
    message: str


# --- Interactive Mode Endpoints ---
@app.post("/interactive/start-browser", response_model=InteractiveStartResponse)
async def start_interactive_browser(payload: InteractiveStartPayload):
    session_id = str(uuid.uuid4())
    logger.info(f"Attempting to start interactive browser session: {session_id}")
    
    if session_id in interactive_sessions:
        logger.warning(f"Session ID {session_id} somehow already exists. This should not happen.")
        # Or, decide if we want to allow reconnecting to an existing session_id if passed by client
        # For now, assume new session_id is always unique.
        return InteractiveStartResponse(success=False, message="Session ID conflict, try again.")

    scraper_instance = DynamicWebScraper(timeout=60) # Longer timeout for interactive use
    
    try:
        # Setup driver in non-headless mode.
        # User data dir and profile directory are now passed from the payload.
        # If not provided or empty, dynamic_web_scrapper.py handles using a temporary profile.
        user_data_dir_to_use = payload.user_data_dir if payload.user_data_dir and payload.user_data_dir.strip() else None
        profile_directory_to_use = payload.profile_directory if payload.profile_directory and payload.profile_directory.strip() else None

        if user_data_dir_to_use:
            logger.info(f"Attempting to use Chrome profile: UserDataDir='{user_data_dir_to_use}', ProfileDirectory='{profile_directory_to_use or 'Default'}'")
        else:
            logger.info("No custom Chrome profile specified by user. Selenium will use a temporary profile.")

        await asyncio.to_thread(
            scraper_instance.setup_driver,
            headless_mode=False,
            user_data_dir=user_data_dir_to_use,
            profile_directory=profile_directory_to_use
        )
        
        if payload.start_url:
            logger.info(f"Interactive session {session_id}: Navigating to start_url: {payload.start_url}")
            try:
                await asyncio.to_thread(scraper_instance.driver.get, payload.start_url)
            except Exception as e:
                logger.error(f"Interactive session {session_id}: Error navigating to start_url '{payload.start_url}': {e}")
                # Decide if this is fatal or if we should proceed with a blank browser
                await asyncio.to_thread(scraper_instance.driver.quit)
                return InteractiveStartResponse(success=False, message=f"Browser started but failed to load start URL: {e}")
        
        interactive_sessions[session_id] = {
            "driver": scraper_instance.driver,
            "scraper_instance": scraper_instance # Store the instance
        }
        current_url = await asyncio.to_thread(lambda: scraper_instance.driver.current_url)
        logger.info(f"Interactive browser session {session_id} started successfully. Current URL: {current_url}")
        return InteractiveStartResponse(
            success=True, 
            session_id=session_id, 
            message="Interactive browser session started.",
            current_url=current_url
        )
    except Exception as e:
        logger.error(f"Failed to start interactive browser session {session_id}: {e}")
        if scraper_instance.driver:
            await asyncio.to_thread(scraper_instance.driver.quit)
        return InteractiveStartResponse(success=False, message=f"Failed to start interactive browser: {e}")

@app.post("/interactive/scrape-active-page")
async def scrape_interactive_page(payload: InteractiveScrapePayload):
    logger.info(f"Received scrape request for interactive session: {payload.session_id}")
    session_data = interactive_sessions.get(payload.session_id)

    if not session_data or not session_data.get("driver"):
        logger.error(f"Interactive session {payload.session_id} not found or driver missing.")
        raise HTTPException(status_code=404, detail="Interactive session not found or invalid.")

    scraper_instance = session_data["scraper_instance"]
    # Ensure the driver is still alive (basic check)
    try:
        _ = scraper_instance.driver.current_url # Simple check to see if driver is responsive
    except Exception as e:
        logger.error(f"Interactive session {payload.session_id} driver seems unresponsive: {e}")
        # Clean up this dead session
        if payload.session_id in interactive_sessions:
            del interactive_sessions[payload.session_id]
        raise HTTPException(status_code=500, detail="Interactive browser session driver is unresponsive. Please start a new session.")

    log_payload = {
        "scrapeType": "Interactive",
        "targetUrl": "User-prepared page (URL not logged for this type)", # Or try to get current URL
        "status": "Pending",
        "requestPayload": payload.model_dump(),
        "scrapedData": None,
        "interactiveSessionId": payload.session_id
    }
    
    try:
        current_page_url = await asyncio.to_thread(lambda: scraper_instance.driver.current_url)
        log_payload["targetUrl"] = current_page_url # Log the actual URL being scraped
    except Exception:
        logger.warning(f"Could not get current URL for session {payload.session_id} for logging.")


    actual_scraped_results = None
    error_message_from_scraper = None
    
    try:
        set_scraper_status(True) # Ensure scraper can run

        # Use the new method in DynamicWebScraper
        # This method should run synchronously within the to_thread call
        df_results, error_message_from_scraper = await asyncio.to_thread(
            scraper_instance.scrape_current_page_interactive,
            container_selector=payload.container_selector,
            custom_fields=[field.model_dump() for field in payload.custom_fields]
        )
        
        actual_scraped_results = df_results.to_dict(orient="records") if df_results is not None else []

        if error_message_from_scraper:
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = error_message_from_scraper
            logger.warning(f"Interactive scrape for session {payload.session_id} failed: {error_message_from_scraper}")
            # Decide on HTTPException based on error type
            status_code = 400 if "selector" in error_message_from_scraper.lower() else 500
            if "cancelled" in error_message_from_scraper.lower():
                log_payload["status"] = "Cancelled"
                status_code = 499
            raise HTTPException(status_code=status_code, detail=error_message_from_scraper)
        
        log_payload["status"] = "Success"
        return {"results": actual_scraped_results, "message": "Successfully scraped active page."}

    except HTTPException as http_exc:
        if not log_payload["errorMessage"]: # If not already set by scraper error
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = http_exc.detail
        raise
    except Exception as e:
        logger.error(f"Unexpected error during interactive scrape for session {payload.session_id}: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        actual_scraped_results = [] # Ensure it's an empty list on error
        raise HTTPException(status_code=500, detail=f"Unexpected server error during interactive scrape: {str(e)}")
    finally:
        log_payload["scrapedData"] = actual_scraped_results
        await asyncio.to_thread(log_manager.create_log_entry, log_payload)


@app.post("/interactive/stop-browser", response_model=InteractiveStopResponse)
async def stop_interactive_browser(payload: InteractiveStopPayload):
    session_id = payload.session_id
    logger.info(f"Attempting to stop interactive browser session: {session_id}")
    session_data = interactive_sessions.pop(session_id, None) # Remove and get

    if not session_data or not session_data.get("driver"):
        logger.warning(f"Interactive session {session_id} not found or already stopped.")
        # Return success=True because the desired state (session stopped) is achieved.
        return InteractiveStopResponse(success=True, message="Interactive session not found or already stopped.")
    
    driver = session_data["driver"]
    try:
        await asyncio.to_thread(driver.quit)
        logger.info(f"Interactive browser session {session_id} stopped and cleaned up successfully.")
        return InteractiveStopResponse(success=True, message="Interactive browser session stopped successfully.")
    except Exception as e:
        logger.error(f"Error stopping interactive browser session {session_id}: {e}")
        # Even if quit fails, the session is removed from our tracking.
        return InteractiveStopResponse(success=False, message=f"Error stopping browser session: {e}")

# --- Enhanced License Activation Endpoints ---

@app.post("/api/v1/license/activate", response_model=LicenseActivationResponse, summary="Activate License Key for a Machine")
async def activate_license(payload: LicenseActivateRequest):
    logger.info(f"Received license activation request for key: {payload.license_key[:4]}..., fingerprint: {payload.machine_fingerprint[:8]}...")

    if not payload.license_key or not payload.license_key.strip():
        logger.warning("Activation attempt with empty license key.")
        raise HTTPException(status_code=400, detail="License key cannot be empty.")
    if not payload.machine_fingerprint or not payload.machine_fingerprint.strip():
        logger.warning("Activation attempt with empty machine fingerprint.")
        raise HTTPException(status_code=400, detail="Machine fingerprint cannot be empty.")

    # 1. Validate the license key with Keygen.sh
    # As noted before, keygen_service.validate_license_key uses sync `requests` inside async def.
    # This should be refactored in keygen_service.py or called with to_thread if it were sync.
    # For now, direct await, acknowledging the blocking nature.
    # Pass the machine_fingerprint to Keygen for scoped validation
    keygen_validation_result = await keygen_service.validate_license_key(
        license_key=payload.license_key,
        fingerprint=payload.machine_fingerprint
    )

    if not keygen_validation_result.get("valid"):
        error_message = keygen_validation_result.get("error", "License key validation failed with Keygen.")
        error_code = keygen_validation_result.get("error_code")
        logger.warning(f"Keygen validation failed for key {payload.license_key[:4]}...: {error_message} (Code: {error_code})")
        # Return a 200 OK response with activated: false, and details from Keygen
        return LicenseActivationResponse(
            activated=False,
            error=error_message,
            error_code=error_code,
            license_details=keygen_validation_result.get("meta") # Keygen's meta often has useful failure details
        )

    # 2. If Keygen validation is successful, store/update the activation in the local DB
    license_data_from_keygen = keygen_validation_result.get("data", {}) # This is the license object from Keygen
    license_id_from_keygen = license_data_from_keygen.get("id")
    
    # Extract expiry from Keygen's license data if available
    # Keygen license object usually has an 'expiry' attribute or similar in `attributes`.
    # Example: license_data_from_keygen.get("attributes", {}).get("expiry")
    # This needs to match the actual structure of Keygen's license object.
    # For now, assuming it might be in `license_data_from_keygen.get("attributes", {}).get("expiry")`
    # or `license_data_from_keygen.get("expiry")`
    # Let's assume `keygen_validation_result.meta.expiry` or `keygen_validation_result.data.attributes.expiry`
    # For simplicity, we'll pass None for now if not easily found.
    # A more robust way would be to inspect the actual Keygen license object structure.
    # Keygen's `meta` usually contains `ts` (timestamp of validation), `code`, `detail`, `valid`.
    # The actual license object is in `data`.
    # `data.attributes.expiry` is a common pattern.
    # Also, Keygen might return `scope` in `meta` if fingerprint was used, e.g., `meta.scope.fingerprint`
    keygen_license_attributes = license_data_from_keygen.get("attributes", {})
    expires_at_str = keygen_license_attributes.get("expiry") # This should be an ISO 8601 string if present

    # Use asyncio.to_thread for database operations as they are blocking
    success_storing = await asyncio.to_thread(
        activation_service.store_activation,
        machine_fingerprint=payload.machine_fingerprint,
        license_key=payload.license_key,
        license_id_from_keygen=license_id_from_keygen,
        expires_at=expires_at_str, # Pass expiry if found
        metadata=license_data_from_keygen # Store the whole Keygen license object as metadata
    )

    if not success_storing:
        logger.error(f"Failed to store activation record for fingerprint {payload.machine_fingerprint[:8]}... after successful Keygen validation.")
        # Keygen validation was OK, but local DB failed. This is a server-side issue.
        raise HTTPException(status_code=500, detail="Activation successful with provider, but failed to save record locally.")

    logger.info(f"License key {payload.license_key[:4]}... successfully activated for fingerprint {payload.machine_fingerprint[:8]}...")
    
    # Retrieve the newly stored/updated record to return it
    activation_record = await asyncio.to_thread(activation_service.get_activation_by_fingerprint, payload.machine_fingerprint)

    return LicenseActivationResponse(
        activated=True,
        message="License activated successfully.",
        license_details=license_data_from_keygen, # Send back the full license details from Keygen
        activation_record=activation_record # Send back the local DB record
    )


@app.post("/api/v1/license/status", response_model=LicenseStatusResponse, summary="Check Machine Activation Status")
async def check_license_status(payload: LicenseStatusRequest):
    logger.info(f"Received license status check for fingerprint: {payload.machine_fingerprint[:8]}...")
    if not payload.machine_fingerprint or not payload.machine_fingerprint.strip():
        logger.warning("License status check with empty machine fingerprint.")
        raise HTTPException(status_code=400, detail="Machine fingerprint cannot be empty.")

    # Use asyncio.to_thread for database operations
    is_active, activation_record = await asyncio.to_thread(
        activation_service.is_machine_activated,
        payload.machine_fingerprint
    )
    
    # Optional: Implement periodic re-validation with Keygen.sh here
    # For example, if `activation_record.last_validated_at` is older than X days,
    # re-validate `activation_record.license_key` with `keygen_service.validate_license_key`.
    # If it fails (e.g., revoked, expired on Keygen's side), then update local DB and set is_active = False.
    # This is an advanced step not implemented for brevity here.

    # --- ENHANCEMENT: Re-validate with Keygen.sh on status check ---
    if is_active and activation_record:
        stored_license_key = activation_record.get("license_key")
        if stored_license_key:
            logger.info(f"Re-validating license {stored_license_key[:4]}... for fingerprint {payload.machine_fingerprint[:8]}... with Keygen.")
            keygen_revalidation_result = await keygen_service.validate_license_key(
                license_key=stored_license_key,
                fingerprint=payload.machine_fingerprint
            )

            if not keygen_revalidation_result.get("valid"):
                logger.warning(f"Keygen re-validation failed for active local record. License: {stored_license_key[:4]}..., Fingerprint: {payload.machine_fingerprint[:8]}.... Error: {keygen_revalidation_result.get('error_code')} - {keygen_revalidation_result.get('error')}")
                # License is no longer valid according to Keygen, update local DB
                await asyncio.to_thread(
                    activation_service.deactivate_machine, # Assuming such a function exists or we mark it inactive
                    payload.machine_fingerprint
                )
                return LicenseStatusResponse(
                    is_active=False,
                    message=f"License no longer valid: {keygen_revalidation_result.get('error', 'Validation failed with Keygen.')} (Code: {keygen_revalidation_result.get('error_code')})"
                )
            else:
                logger.info(f"Keygen re-validation successful for license {stored_license_key[:4]}..., fingerprint {payload.machine_fingerprint[:8]}...")
                # Optionally, update a 'last_validated_at_keygen' timestamp in the local DB here.
                # For now, just confirm it's still active.
                return LicenseStatusResponse(
                    is_active=True,
                    message="Machine is activated and license is current with Keygen.",
                    license_key_hint=f"...{stored_license_key[-4:]}"
                )
        else:
            # Should not happen if record is active, but handle defensively
            logger.error(f"Active record found for fingerprint {payload.machine_fingerprint[:8]} but no license key stored.")
            return LicenseStatusResponse(is_active=False, message="Activation record inconsistent (missing key).")
            
    # Original logic for when not initially active or no record found
    logger.info(f"Fingerprint {payload.machine_fingerprint[:8]}... is not active based on initial local check or re-validation failure.")
    message = "Machine not activated."
    if activation_record and not is_active: # Record exists but was deemed inactive (e.g. expired locally)
        message = "License previously activated but may have expired or changed."
    return LicenseStatusResponse(is_active=False, message=message)


# --- Modified Scraper Endpoints with Logging ---
@app.get("/scrape")
async def scrape(url: str):
    logger.info(f"Received scrape request for URL: {url}")
    log_payload = {
        "scrapeType": "Static",
        "targetUrl": url,
        "status": "Pending",
        "errorMessage": None,
        "dataPreview": None,
        "scrapedData": None  # Initialize scrapedData
    }
    actual_scraped_data = None
    try:
        actual_scraped_data = await asyncio.to_thread(scrape_data, url) # Ensure async call if scrape_data is sync

        if isinstance(actual_scraped_data, dict) and "error" in actual_scraped_data:
            error_message_str = str(actual_scraped_data["error"])
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = error_message_str
            
            status_code_for_exception = 500 # Default
            if "404" in error_message_str:
                status_code_for_exception = 404
            elif "403" in error_message_str:
                status_code_for_exception = 403
            elif "401" in error_message_str:
                status_code_for_exception = 401
            # Add other specific HTTP error codes if needed
            
            # actual_scraped_data (the error dict) will be logged in finally block.
            # Raise HTTPException to make the endpoint return an error status.
            raise HTTPException(status_code=status_code_for_exception, detail=error_message_str)
        else:
            # No "error" key in the returned dict, or not a dict, assume success
            log_payload["status"] = "Success"
            # log_payload["dataPreview"] = str(actual_scraped_data)[:200] + "..." if actual_scraped_data else None
        
        return actual_scraped_data # This line is reached only on success

    except HTTPException: # Re-raise if it's an HTTPException (e.g., from our check above)
        raise
    except Exception as e: # Catch other unexpected errors
        logger.error(f"Unexpected error during static scraping for {url}: {e}", exc_info=True)
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        actual_scraped_data = {"error": f"Unexpected server error: {str(e)}"} # Ensure error is logged
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
    finally:
        log_payload["scrapedData"] = actual_scraped_data # Store the actual data or error dict
        await asyncio.to_thread(log_manager.create_log_entry, log_payload)


@app.post("/scrape-dynamic")
async def scrape_dynamic(payload: DynamicScrapePayload):
    log_payload = {
        "scrapeType": "Dynamic",
        "targetUrl": payload.url,
        "status": "Pending",
        "errorMessage": None,
        "dataPreview": None,
        "requestPayload": payload.model_dump(), # Log the entire incoming payload
        "scrapedData": None
    }
    actual_scraped_results = None
    try:
        set_scraper_status(True)  # Reset flag for new scrape
        error_message_from_scraper = None # Initialize

        if payload.enable_pagination:
            log_payload["scrapeType"] = "Dynamic (Paginated)"
            log_payload["paginationDetails"] = {
                "start_page": payload.start_page, "end_page": payload.end_page,
                "pagination_type": payload.pagination_type, "page_param": payload.page_param,
                "next_button_selector": payload.next_button_selector, "scroll_to_end_page": payload.scroll_to_end_page
            }

            data_from_scraper_df, error_message_from_scraper = await asyncio.to_thread(
                scrape_dynamic_with_pagination,
                url=payload.url,
                container_selector=payload.container_selector,
                custom_fields=[field.model_dump() for field in payload.custom_fields],
                start_page=payload.start_page,
                end_page=payload.end_page,
                pagination_type=payload.pagination_type,
                page_param=payload.page_param,
                next_button_selector=payload.next_button_selector,
                enable_scrolling=payload.enable_scrolling,
                max_scrolls=payload.max_scrolls,
                scroll_to_end_page=payload.scroll_to_end_page,
                pre_scrape_interactions=payload.pre_scrape_interactions
            )
            actual_scraped_results = data_from_scraper_df.to_dict(orient="records") if data_from_scraper_df is not None else []
        else:
            actual_scraped_results, error_message_from_scraper = await asyncio.to_thread(
                scrape_dynamic_data,
                url=payload.url,
                container_selector=payload.container_selector,
                custom_fields=[field.model_dump() for field in payload.custom_fields],
                enable_scrolling=payload.enable_scrolling,
                max_scrolls=payload.max_scrolls,
                scroll_to_end_page=payload.scroll_to_end_page,
                pre_scrape_interactions=payload.pre_scrape_interactions
            )

        operation_status = "completed" # Default
        
        if error_message_from_scraper:
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = error_message_from_scraper
            logger.warning(f"Dynamic scraping for {payload.url} failed with error: {error_message_from_scraper}")
            status_code = 500
            if "invalid argument" in error_message_from_scraper.lower() or "timeout" in error_message_from_scraper.lower():
                status_code = 400
            elif "cancelled" in error_message_from_scraper.lower():
                log_payload["status"] = "Cancelled"
                operation_status = "cancelled"
                status_code = 499
            
            if log_payload["status"] == "Failed":
                user_friendly_detail = "An error occurred during scraping. Please check the URL or parameters."
                if "Stacktrace:" not in error_message_from_scraper:
                    if "invalid argument" in error_message_from_scraper.lower():
                        user_friendly_detail = "Invalid URL or parameters provided."
                    elif "timeout" in error_message_from_scraper.lower():
                        user_friendly_detail = "The page took too long to load (timeout)."
                raise HTTPException(status_code=status_code, detail=user_friendly_detail)

        if not get_scraper_status() and log_payload["status"] != "Failed":
            log_payload["status"] = "Cancelled"
            operation_status = "cancelled"
            logger.info(f"Dynamic scraping for {payload.url} was cancelled by explicit stop signal.")
        
        if log_payload["status"] == "Pending":
             log_payload["status"] = "Success"
        
        return {"results": actual_scraped_results, "operation_status": operation_status, "message": error_message_from_scraper if error_message_from_scraper else "Operation successful"}

    except HTTPException as http_exc:
        if not log_payload["errorMessage"]:
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = http_exc.detail
        raise
    except Exception as e:
        logger.error(f"Unexpected error during dynamic scraping endpoint for {payload.url}: {e}", exc_info=True)
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        actual_scraped_results = []
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
    finally:
        log_payload["scrapedData"] = actual_scraped_results
        await asyncio.to_thread(log_manager.create_log_entry, log_payload)

@app.post("/stop-scraper")
async def stop_scraper_endpoint():
    """Endpoint to signal the scraper to stop."""
    set_scraper_status(False) # This sets the global flag
    # Log this attempt? Maybe not, as it's an action, not a scrape result.
    return {"status": "stop signal sent"}

# --- Serve Static Frontend ---
# Serve static assets (js, css, images, etc.)
# The path "/assets" here must match the base path used in your index.html for assets
# If Vite builds assets to `front-end-react/dist/assets`, then this should work.
# Check your `front-end-react/dist/index.html` to see how asset paths are referenced.
# If they are relative like "./assets/...", then this mount path might need adjustment
# or your index.html might need to be served differently.
# Common setup is that index.html uses absolute paths like /assets/file.js
if os.path.exists(os.path.join(STATIC_FILES_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_FILES_DIR, "assets")), name="static-assets")
else:
    logger.warning(f"Frontend assets directory not found at {os.path.join(STATIC_FILES_DIR, 'assets')}. Static assets may not load.")

# Serve other static files from the root of static_frontend (e.g., favicon.ico, manifest.json)
# This loop will mount any top-level files and directories (excluding 'assets' and 'index.html')
if os.path.exists(STATIC_FILES_DIR):
    for item in os.listdir(STATIC_FILES_DIR):
        item_path = os.path.join(STATIC_FILES_DIR, item)
        if os.path.isfile(item_path) and item != "index.html":
            app.mount(f"/{item}", StaticFiles(directory=STATIC_FILES_DIR, html=True, check_dir=False), name=f"static-root-{item.split('.')[0]}")
            logger.info(f"Mounted static file: /{item}")
        # If you have other top-level directories with static content (besides 'assets'), mount them similarly.

@app.get("/{full_path:path}", response_class=FileResponse, include_in_schema=False)
async def serve_react_app(full_path: str):
    """
    Serves the index.html for any path not caught by other routes.
    This is crucial for client-side routing in React.
    """
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH)
    else:
        logger.error(f"Frontend index.html not found at {INDEX_HTML_PATH}")
        raise HTTPException(status_code=404, detail="Frontend not found. Please build the frontend.")


def open_browser():
    """Opens the default web browser to the application's URL."""
    # Wait a couple of seconds for the server to be ready
    import time
    time.sleep(2) 
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    import uvicorn
    # Start the browser opening in a separate thread so it doesn't block Uvicorn
    # Only do this if not running in a way that Uvicorn's reload or multiple workers are active
    # For a frozen app, this should be fine.
    if not os.environ.get("UVICORN_RELOAD") and not os.environ.get("UVICORN_WORKERS"):
         # Check if we are likely the main process of a frozen app
        is_frozen_main_process = getattr(sys, 'frozen', False)
        if is_frozen_main_process: # Only open browser if frozen
            threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(app, host="0.0.0.0", port=8000)
