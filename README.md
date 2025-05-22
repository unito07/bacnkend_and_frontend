# Web Scraper Project

## Overview
A versatile web scraping solution featuring a React frontend and a FastAPI backend. It supports both static and dynamic content extraction, making it suitable for a wide range of web data collection tasks.

## Key Features

### Frontend (React)
The user-friendly React application provides an interactive interface for configuring and initiating web scraping tasks.
- **Input Fields**: Users can easily input the target URL, a main CSS selector for the container element, and define multiple custom fields with their respective CSS selectors for precise data extraction.
- **Scraping Modes**:
    - **Static Scrape**: Utilizes `requests` and `BeautifulSoup` via the backend for quick data retrieval from static HTML pages.
    - **Dynamic Scrape**: Employs `Selenium` through the backend to handle complex, JavaScript-rendered websites. This mode includes options for simulating user interactions like scrolling (with a configurable maximum scroll limit) to load dynamic content before scraping.
- **Real-time Results**: Scraped data is displayed in a clear, formatted output area, providing immediate feedback to the user.
- **Modular Components**: The React frontend is built with modular components (`StaticScraper.jsx`, `DynamicScraper.jsx`, `FieldRow.jsx`, `Results.jsx`) for maintainability and extensibility.

### Backend (FastAPI)
- Python-based API handling all scraping logic.
- **`/scrape` (GET)**: For static web pages (requests/BeautifulSoup).
- **`/scrape-dynamic` (POST)**: For dynamic, JavaScript-heavy sites (Selenium, with scrolling and custom field support).
- Manages CORS for seamless frontend-backend communication.

### Scraping Capabilities
- **Static Scraper**: Efficiently extracts data from simple HTML pages.
- **Dynamic Scraper**: Leverages Selenium for complex sites, handling JavaScript rendering, infinite scrolling, and custom data extraction.
- All core scraping logic is centralized in `backend-web-scrapper/dynamic_web_scrapper.py`.

## Project Structure
```
web-scrapper/
├── backend-web-scrapper/
│   ├── main.py                # FastAPI application
│   ├── dynamic_web_scrapper.py # Core scraping functions
│   └── requirements.txt       # Python dependencies
│
├── front-end-react/
│   ├── src/                   # React source code
│   │   ├── components/        # Reusable React components
│   │   │   ├── StaticScraper.jsx
│   │   │   ├── DynamicScraper.jsx
│   │   │   ├── FieldRow.jsx
│   │   │   └── Results.jsx
│   │   ├── App.jsx            # Main application component
│   │   └── main.jsx           # React entry point
│   └── package.json           # Frontend dependencies
│
└── README.md                  # Project documentation
```

## How It Works
The React frontend captures user input and sends requests to the FastAPI backend. The backend processes these requests using either static (BeautifulSoup) or dynamic (Selenium) scraping methods, retrieves data from target websites, and returns the results to the frontend for display.

## Extend & Customize
- Easily add new scraping fields or modify logic in `backend-web-scrapper/dynamic_web_scrapper.py`.
- Enhance the React UI with new features or styling.
- Expand backend endpoints for more advanced data processing or integrations.
