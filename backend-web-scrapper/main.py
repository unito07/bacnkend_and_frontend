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
async def get_all_logs():
    logs = await asyncio.to_thread(log_manager.get_all_log_entries)
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
        "dataPreview": None
    }
    try:
        data = scrape_data(url)
        log_payload["status"] = "Success"
        # log_payload["dataPreview"] = str(data)[:200] + "..." if data else None # Example preview
        return data
    except Exception as e:
        print(f"Error during scraping: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
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
        "requestPayload": payload
    }
    try:
        set_scraper_status(True)  # Reset flag for new scrape
        url = payload["url"]
        container_selector = payload["container_selector"]
        custom_fields = payload["custom_fields"]
        enable_scrolling = payload.get("enable_scrolling", False)
        max_scrolls = payload.get("max_scrolls", 5)
        
        # Run the synchronous scraping function in a separate thread
        data = await asyncio.to_thread(
            scrape_dynamic_data,
            url,
            container_selector,
            custom_fields,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls
        )
        
        # Check if scraping was cancelled
        if not get_scraper_status(): # If status is False, it means it was cancelled
            log_payload["status"] = "Cancelled"
            # Potentially return a specific response for cancelled tasks
            # For now, we'll let it proceed to finally, but not raise an error
            # and the data might be partial or empty.
            print("Dynamic scraping was cancelled.")
            # return {"status": "Scraping cancelled", "results": data if data else []} # Or raise HTTPException
        else:
            log_payload["status"] = "Success"
            # log_payload["dataPreview"] = f"{len(data)} items scraped" if isinstance(data, list) else "Data scraped"

        return {"results": data}
    except Exception as e:
        print(f"Error during dynamic scraping: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Ensure scraper status is reset if it was still true (e.g. successful completion)
        # If it was cancelled, it's already false.
        # This might be redundant if set_scraper_status(False) is called at the end of scrape_dynamic_data
        # but good for safety.
        # set_scraper_status(False) # Let's assume scrape_dynamic_data handles its own final state or cancellation signal.
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
