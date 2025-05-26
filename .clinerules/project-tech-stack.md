## Brief overview
This document outlines the key technologies and architectural choices for the web scraper project.

## Backend Technology Stack
- **Framework**: FastAPI (Python)
- **Core Libraries**:
    - `requests` and `BeautifulSoup4` for static web scraping.
    - `selenium` for dynamic web scraping, utilizing a headless Chrome browser.
    - `selenium-stealth` to help avoid bot detection.
- **API Endpoints**:
    - `/scrape`: For static scraping tasks.
    - `/scrape-dynamic`: For dynamic scraping tasks, allowing detailed configuration of selectors and scrolling.

## Frontend Technology Stack
- **Framework/Library**: React (using Vite as the build tool).
- **Styling**: Tailwind CSS.
- **UI Components**:
    - **Shadcn UI**: Utilized for core UI elements like buttons, inputs, labels, checkboxes. These are typically found in `src/components/ui/`.
    - **Magic UI**: A collection of animated or visually distinct components, likely found in `src/components/magicui/`.
- **Routing**: `react-router-dom` for client-side navigation.
- **Key Components**:
    - `StaticScraper.jsx` and `DynamicScraper.jsx`: Core components for interacting with the backend scraping functionalities.
    - `Results.jsx`: Displays scraped data and provides download options (JSON, CSV).

## General Project Structure
- The project is divided into `backend-web-scrapper/` and `front-end-react/` directories.
- The backend serves an API that the frontend consumes.
