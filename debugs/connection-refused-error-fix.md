# net::ERR_CONNECTION_REFUSED error

## Description
The React frontend was unable to connect to the backend server at `http://localhost:8000/scrape-dynamic`, resulting in a "net::ERR_CONNECTION_REFUSED" error. This indicated that the backend server was not running or was not accessible from the frontend.

## Solution
The backend server was started using the command `cd backend-web-scrapper && uvicorn main:app --reload`. The import error in `backend-web-scrapper/main.py` was fixed first, and then the backend server was started.
