# Web Scrapper Project Overview

## Brief Overview
- A modular web scraping tool with both static and dynamic scraping capabilities.
- User-friendly React frontend for inputting URLs, CSS selectors, and custom fields.
- FastAPI backend handles scraping logic and API endpoints.
- Designed for easy customization and extension.

## How It Works

### 1. Frontend (UI)
- Built with React.
- Lets you enter:
  - URL to scrape
  - Container CSS selector
  - Multiple custom fields (name + CSS selector)
  - Options for scrolling and max scrolls (for dynamic scraping)
- Two main actions:
  - **Static Scrape**: Uses requests/BeautifulSoup (for simple/static pages)
  - **Dynamic Scrape**: Uses Selenium (for JavaScript-heavy/dynamic pages)
- Results are displayed in a formatted output area.

### 2. Backend (API)
- Built with FastAPI (Python).
- Exposes two endpoints:
  - `GET /scrape`: For static scraping (simple HTML)
  - `POST /scrape-dynamic`: For dynamic scraping (Selenium, supports scrolling, custom fields)
- Handles CORS for local frontend access.
- Returns a Pandas DataFrame.

### 3. Scraping Logic
- **Static**: Uses requests and BeautifulSoup to fetch and parse HTML.
- **Dynamic**: Uses a modular `DynamicWebScraper` class (Selenium, pandas, etc.) for advanced scraping, scrolling, and field extraction.
- Both static and dynamic logic are in `backend-web-scrapper/dynamic_web_scrapper.py`.
- Logging has been added to the dynamic scraper for debugging purposes.

### 4. Data Flow

```mermaid
flowchart TD
    A[User (Browser UI)] -->|Inputs URL, selectors| B[Frontend (React)]
    B -->|GET /scrape| C[Backend (FastAPI) - Static Scraper]
    B -->|POST /scrape-dynamic| D[Backend (FastAPI) - Dynamic Scraper]
    C -->|Scrape with requests/BeautifulSoup| E[Target Website]
    D -->|Scrape with Selenium| E
    C -->|JSON result| B
    D -->|Pandas DataFrame| B
    B -->|Display results| A
```

## Project Structure

```
web-scrapper/
│
├── backend-web-scrapper/
│   ├── main.py                # FastAPI app and endpoints
│   ├── dynamic_web_scrapper.py # Static & dynamic scraping logic
│   └── requirements.txt       # Python dependencies
│
├── front-end-react/
│   ├── src/                   # React components and logic
│   ├── public/                # Static assets
│   └── package.json           # Project dependencies
│
├── .clinerules/               # Project-specific rules and preferences
│
└── README.md                  # Project overview (this file)
```

## Customization & Extension

- Add new scraping fields or logic by editing `dynamic_web_scrapper.py`.
- UI can be extended for more options or improved styling.
- Backend endpoints can be expanded for more advanced workflows.

## How Everything Connects

- The frontend and backend communicate over HTTP (localhost).
- User input is sent from the UI to the backend, which processes the request and returns results.
- The UI displays the results in real time.
