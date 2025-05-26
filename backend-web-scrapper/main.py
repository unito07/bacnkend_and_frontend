import asyncio # Added for to_thread
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dynamic_web_scrapper import scrape_data, scrape_dynamic_data, set_scraper_status  # Added set_scraper_status

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


@app.get("/scrape")
async def scrape(url: str):
    print(f"Received scrape request for URL: {url}")
    try:
        data = scrape_data(url)
        return data
    except Exception as e:
        print(f"Error during scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Body

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
        return {"results": data}
    except Exception as e:
        print(f"Error during dynamic scraping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stop-scraper")
async def stop_scraper_endpoint():
    """Endpoint to signal the scraper to stop."""
    set_scraper_status(False)
    return {"status": "stop signal sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
