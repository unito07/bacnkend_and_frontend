import asyncio # Added for to_thread
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path

from dynamic_web_scrapper import scrape_data, scrape_dynamic_data, scrape_dynamic_with_pagination, set_scraper_status, get_scraper_status # Added scrape_dynamic_with_pagination
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
        "max_scrolls": int (optional),
        "scroll_to_end_page": bool (optional, defaults to False), # Added
        "enable_pagination": bool (optional),
        "start_page": int (optional),
        "end_page": int (optional),
        "pagination_type": str (optional, "URL Parameter" or "Next Button"),
        "page_param": str (optional),
        "next_button_selector": str (optional)
    }
    """
    log_payload = {
        "scrapeType": "Dynamic",
        "targetUrl": payload.get("url", "N/A"),
        "status": "Pending",
        "errorMessage": None,
        "dataPreview": None,
        "requestPayload": payload, # Log the entire incoming payload
        "scrapedData": None 
    }
    actual_scraped_results = None
    try:
        set_scraper_status(True)  # Reset flag for new scrape
        url = payload["url"]
        container_selector = payload["container_selector"]
        custom_fields = payload["custom_fields"]
        enable_scrolling = payload.get("enable_scrolling", False)
        max_scrolls = payload.get("max_scrolls", 5)
        scroll_to_end_page = payload.get("scroll_to_end_page", False) # Added

        enable_pagination = payload.get("enable_pagination", False)
        error_message_from_scraper = None # Initialize

        if enable_pagination:
            start_page = payload.get("start_page", 1)
            end_page = payload.get("end_page", 5)
            pagination_type = payload.get("pagination_type", "Next Button")
            page_param = payload.get("page_param", "page")
            next_button_selector = payload.get("next_button_selector", None)
            
            log_payload["scrapeType"] = "Dynamic (Paginated)"
            log_payload["paginationDetails"] = {
                "start_page": start_page, "end_page": end_page,
                "pagination_type": pagination_type, "page_param": page_param,
                "next_button_selector": next_button_selector, "scroll_to_end_page": scroll_to_end_page
            }

            # scrape_dynamic_with_pagination now returns (DataFrame, error_msg_or_None)
            data_from_scraper_df, error_message_from_scraper = await asyncio.to_thread(
                scrape_dynamic_with_pagination,
                url=url, container_selector=container_selector, custom_fields=custom_fields,
                start_page=start_page, end_page=end_page, pagination_type=pagination_type,
                page_param=page_param, next_button_selector=next_button_selector,
                enable_scrolling=enable_scrolling, max_scrolls=max_scrolls, scroll_to_end_page=scroll_to_end_page
            )
            actual_scraped_results = data_from_scraper_df.to_dict(orient="records") if data_from_scraper_df is not None else []
        else:
            # scrape_dynamic_data now returns (list_of_dicts, error_msg_or_None)
            actual_scraped_results, error_message_from_scraper = await asyncio.to_thread(
                scrape_dynamic_data,
                url, container_selector, custom_fields,
                enable_scrolling=enable_scrolling, max_scrolls=max_scrolls, scroll_to_end_page=scroll_to_end_page
            )
        
        operation_status = "completed" # Default
        
        if error_message_from_scraper:
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = error_message_from_scraper
            print(f"Dynamic scraping for {url} failed with error: {error_message_from_scraper}")
            # Determine appropriate HTTP status code
            status_code = 500 # Default server error
            if "invalid argument" in error_message_from_scraper.lower() or "timeout" in error_message_from_scraper.lower():
                status_code = 400 # Bad request (e.g. invalid URL, page timeout)
            elif "cancelled" in error_message_from_scraper.lower():
                 # This case should ideally be handled by get_scraper_status() check below,
                 # but if scraper itself returns "cancelled", treat as such.
                log_payload["status"] = "Cancelled"
                operation_status = "cancelled"
                # For cancelled, we might not want to raise HTTPException, but return a specific status.
                # However, if the scraper function itself flags an error like "Scraping cancelled...",
                # it's better to inform the client with an error code.
                # Let's use 499 Client Closed Request as a proxy for cancellation initiated by client/scraper logic.
                status_code = 499 # Or a custom code / specific message
            
            # actual_scraped_results might be partial or empty if an error occurred.
            # The log_payload will capture this.
            if log_payload["status"] == "Failed": # Only raise if truly failed, not just cancelled by scraper logic
                user_friendly_detail = "An error occurred during scraping. Please check the URL or parameters."
                if "Stacktrace:" in error_message_from_scraper or "invalid argument" in error_message_from_scraper.lower():
                    # Keep specific but brief messages for common, actionable errors if they don't contain stack traces
                    if "invalid argument" in error_message_from_scraper.lower() and "Stacktrace:" not in error_message_from_scraper:
                        user_friendly_detail = "Invalid URL or parameters provided."
                    elif "timeout" in error_message_from_scraper.lower() and "Stacktrace:" not in error_message_from_scraper:
                         user_friendly_detail = "The page took too long to load (timeout)."
                    # Otherwise, use the generic message for stack traces or other complex errors
                else:
                    # For other errors that are not stack traces, we can be a bit more specific if the message is already somewhat clean.
                    # However, to be safe and meet the user's request for simplicity, let's default to generic for unhandled cases.
                    # If error_message_from_scraper is short and non-technical, it could be used.
                    # For now, sticking to the generic message for anything that's not a simple invalid arg/timeout without stacktrace.
                    pass # user_friendly_detail is already set to generic

                raise HTTPException(status_code=status_code, detail=user_friendly_detail)

        # Check if scraping was cancelled by the /stop-scraper endpoint
        if not get_scraper_status() and log_payload["status"] != "Failed": # Avoid overriding a specific failure
            log_payload["status"] = "Cancelled"
            operation_status = "cancelled"
            print(f"Dynamic scraping for {url} was cancelled by explicit stop signal.")
            # If cancelled, we might return a 200 OK with "cancelled" status, or a specific HTTP code.
            # For now, let's return 200 with operation_status="cancelled".
            # The actual_scraped_results could be partial.
        
        if log_payload["status"] == "Pending": # If no error and not cancelled, it's a success
             log_payload["status"] = "Success"
        
        # log_payload["dataPreview"] is handled by the log_manager now based on scrapedData

        return {"results": actual_scraped_results, "operation_status": operation_status, "message": error_message_from_scraper if error_message_from_scraper else "Operation successful"}

    except HTTPException as http_exc: # Re-raise HTTPExceptions
        # Log payload status and error message should already be set if this is from our logic
        if not log_payload["errorMessage"]: # If it's an unexpected HTTPException
            log_payload["status"] = "Failed"
            log_payload["errorMessage"] = http_exc.detail
        raise
    except Exception as e: # Catch other unexpected errors in this endpoint's logic
        print(f"Unexpected error during dynamic scraping endpoint: {e}")
        log_payload["status"] = "Failed"
        log_payload["errorMessage"] = str(e)
        actual_scraped_results = [] # Ensure it's an empty list on unexpected error
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
    finally:
        log_payload["scrapedData"] = actual_scraped_results # Store the actual list of results or partial results
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
