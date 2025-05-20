# ImportError: attempted relative import with no known parent package

## Description
The backend server failed to start due to an `ImportError` in `backend-web-scrapper/main.py`. This error occurred because the file was trying to import `dynamic_web_scrapper` using a relative import (`from .dynamic_web_scrapper import ...`).

## Solution
The import statement in `backend-web-scrapper/main.py` was modified to use an absolute import. The import statement was changed to `from dynamic_web_scrapper import scrape_data, scrape_dynamic_data`.
