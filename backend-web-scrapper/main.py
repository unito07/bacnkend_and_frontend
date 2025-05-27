import asyncio # Added for to_thread
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path

from dynamic_web_scrapper import scrape_data, scrape_dynamic_data, set_scraper_status, get_scraper_status # Added get_scraper_status
import log_manager # Import the new log manager

app = FastAPI()

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
    end_date: Optional[str] = None
):
    logs = await asyncio.to_thread(log_manager.get_all_log_entries, start_date, end_date)
    return logs

@app.get("/logs/{log_id}", summary="Get Specific Log Entry", response_model=Optional[LogEntryResponse])
async def get_log(log_id: str):
    log_entry = await asyncio.to_thread(log_manager.get_log_entry, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
    if "error" in log_entry: # Should not happen with current get_log_entry logic but good practice
        raise HTTPException(status_code=500, detail=log_entry["error"])
    return log_entry

@app.delete("/logs/{log_id}", summary="Delete Specific Log Entry")
async def delete_log(log_id: str):
    success = await asyncio.to_thread(log_manager.delete_log_entry, log_id)
    if not success:
        raise HTTPException(status_code=404, detail="Log entry not found or could not be deleted")
    return {"message": "Log entry deleted successfully"}

@app.delete("/logs/clear", summary="Clear All Log Entries")
async def clear_logs():
    result = await asyncio.to_thread(log_manager.clear_all_logs)
    return result


# --- Modified Scraper Endpoints with Logging ---
@app.get("/scrape")
async def scrape(url: str):
    print(f"Received scrape request for URL: {url}")
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
        print(f"Unexpected error during static scraping: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        actual_scraped_data = {"error": f"Unexpected server error: {str(e)}"} # Ensure error is logged
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
    finally:
        log_payload["scrapedData"] = actual_scraped_data # Store the actual data or error dict
        await asyncio.to_thread(log_manager.create_log_entry, log_payload)


@app.post("/scrape-dynamic")
async def scrape_dynamic(
    payload: dict = Body(...)
):
    """
    Expects JSON with:
    {
        "url": str,
        "container_selector": str,
        "custom_fields": list of {"name": str, "selector": str},
        "enable_scrolling": bool (optional),
        "max_scrolls": int (optional)
    }
    """
    log_payload = {
        "scrapeType": "Dynamic",
        "targetUrl": payload.get("url", "N/A"),
        "status": "Pending",
        "errorMessage": None,
        "dataPreview": None,
        "requestPayload": payload,
        "scrapedData": None # Initialize scrapedData
    }
    actual_scraped_results = None
    try:
        set_scraper_status(True)  # Reset flag for new scrape
        url = payload["url"]
        container_selector = payload["container_selector"]
        custom_fields = payload["custom_fields"]
        enable_scrolling = payload.get("enable_scrolling", False)
        max_scrolls = payload.get("max_scrolls", 5)
        
        # Run the synchronous scraping function in a separate thread
        # Renamed 'data' to 'data_from_scraper' to avoid confusion with 'actual_scraped_results'
        data_from_scraper = await asyncio.to_thread(
            scrape_dynamic_data,
            url,
            container_selector,
            custom_fields,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls
        )
        actual_scraped_results = data_from_scraper # This is the list of dicts
        
        # Check if scraping was cancelled
        if not get_scraper_status(): # If status is False, it means it was cancelled
            log_payload["status"] = "Cancelled"
            # Potentially return a specific response for cancelled tasks
            # For now, we'll let it proceed to finally, but not raise an error
            # and the data might be partial or empty.
            print("Dynamic scraping was cancelled.")
            # actual_scraped_results might be partial here
        else:
            log_payload["status"] = "Success"
            # log_payload["dataPreview"] = f"{len(actual_scraped_results)} items scraped" if isinstance(actual_scraped_results, list) else "Data scraped"

        return {"results": actual_scraped_results}
    except Exception as e:
        print(f"Error during dynamic scraping: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        # actual_scraped_results remains None
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Ensure scraper status is reset if it was still true (e.g. successful completion)
        # If it was cancelled, it's already false.
        log_payload["scrapedData"] = actual_scraped_results # Store the actual list of results
        await asyncio.to_thread(log_manager.create_log_entry, log_payload)


@app.post("/stop-scraper")
async def stop_scraper_endpoint():
    """Endpoint to signal the scraper to stop."""
    set_scraper_status(False) # This sets the global flag
    # Log this attempt? Maybe not, as it's an action, not a scrape result.
    return {"status": "stop signal sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
