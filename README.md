# Web Scraper Project

## Overview
A versatile web scraping solution featuring a React frontend and a FastAPI backend. It supports both static and dynamic content extraction, making it suitable for a wide range of web data collection tasks.

## Key Features

### Frontend (React with ShadCN UI)
The user-friendly React application, built with **ShadCN UI components** for a modern look and feel, provides an interactive interface for configuring and initiating web scraping tasks. The application is structured into several pages for better organization:
- **Landing Page (`LandingPage.jsx`):** Introduces the application and its features.
- **Scraper Page (`ScraperPage.jsx`):** Contains the core scraping interface.
  - **Input Fields**: Users can easily input the target URL, a main CSS selector for the container element, and define multiple custom fields with their respective CSS selectors for precise data extraction.
  - **Scraping Modes**:
      - **Static Scrape**: Utilizes `requests` and `BeautifulSoup` via the backend for quick data retrieval from static HTML pages.
      - **Dynamic Scrape**: Employs `Selenium` through the backend to handle complex, JavaScript-rendered websites. This mode includes options for simulating user interactions like scrolling (with a configurable maximum scroll limit) to load dynamic content before scraping.
  - **Real-time Results**: Scraped data is displayed in a clear, formatted output area, providing immediate feedback to the user.
- **History Logs Page (`HistoryLogsPage.jsx`):** Displays a history of scraping activities (functionality may vary).
- **Settings Page (`SettingsPage.jsx`):** Allows users to configure application settings (functionality may vary).
- **Documentation Page (`DocumentationPage.jsx`):** Provides guidance on using the application and its features.
- **About Us Page (`AboutUsPage.jsx`):** Offers information about the project or team.
- **Modular Components**: The React frontend is built with modular components (e.g., `Navbar.jsx`, `StaticScraper.jsx`, `DynamicScraper.jsx`, `FieldRow.jsx`, `Results.jsx`, and various UI elements from ShadCN) for maintainability and extensibility.

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
│   ├── public/                # Static assets (e.g., vite.svg)
│   ├── src/                   # React source code
│   │   ├── assets/            # Project-specific static assets (images, svgs)
│   │   ├── components/        # Reusable React components
│   │   │   ├── StaticScraper.jsx
│   │   │   ├── DynamicScraper.jsx
│   │   │   ├── FieldRow.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── magicui/       # Directory for Magic UI components (if used)
│   │   │   └── ui/            # ShadCN UI components (e.g. button.tsx, input.tsx)
│   │   ├── lib/               # Utility functions (e.g., utils.ts for cn function)
│   │   ├── pages/             # Page-level components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── ScraperPage.jsx
│   │   │   ├── HistoryLogsPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── DocumentationPage.jsx
│   │   │   └── AboutUsPage.jsx
│   │   ├── App.jsx            # Main application component (handles routing)
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles, Tailwind directives, ShadCN theme variables
│   ├── tailwind.config.js     # Tailwind CSS configuration (custom theme, colors)
│   ├── postcss.config.cjs     # PostCSS configuration
│   ├── components.json        # ShadCN UI configuration
│   └── package.json           # Frontend dependencies
│
└── README.md                  # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (LTS version recommended)
- Python 3.7+ with pip

### Backend Setup
1. Navigate to the `backend-web-scrapper` directory.
2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup
1. Navigate to the `front-end-react` directory.
2. Install Node.js dependencies:
   ```bash
   npm install
   ```

### Running the Application
1.  **Start the Backend (FastAPI)**:
    In the `backend-web-scrapper` directory (with virtual environment activated):
    ```bash
    uvicorn main:app --reload
    ```
    The backend will typically run on `http://127.0.0.1:8000`.

2.  **Start the Frontend (React)**:
    Open a new terminal, navigate to the `front-end-react` directory and run:
    ```bash
    npm run dev
    ```
    The frontend will typically run on `http://localhost:5173` (or the next available port).

Once both servers are running, open the frontend URL in your web browser to access the application.

## Dependency Requirements and Notes

### Frontend (`front-end-react/package.json`)
The frontend uses Vite, React, Tailwind CSS, and ShadCN UI components. Key dependencies include:
- `react`, `react-dom`
- `vite`
- `tailwindcss` (v3.4.1 was found to be stable after troubleshooting v4.x issues)
- `postcss`, `autoprefixer`
- `@radix-ui/*` (for ShadCN UI components)
- `lucide-react` (for icons)

**Tailwind CSS and ShadCN UI Theming:**
The project utilizes Tailwind CSS for utility-first styling and ShadCN UI components, which come with their own theming system based on CSS variables. Understanding how colors are managed is key:

- **Core Configuration Files:**
  - `tailwind.config.js`: Defines the Tailwind theme, including custom color palettes, content paths, and plugins.
    - **Custom Colors**: A custom color palette (e.g., `brand-primary`, `text-main`) is defined under `theme.extend.colors`. These can be used directly with Tailwind utility classes (e.g., `bg-brand-primary`, `text-text-main`).
    ```javascript
    // Example from tailwind.config.js
    /** @type {import('tailwindcss').Config} */
    export default {
        // ...
        theme: {
          extend: {
            colors: {
              'brand-primary': '#da7756', // Terra Cotta
              'cta': '#bd5d3a',
              'background-main': '#eeece2',
              'text-main': '#3d3929',
              // ... other custom colors from your config
            }
          },
        },
        // ...
    }
    ```
  - `postcss.config.cjs`: Configures PostCSS plugins, including `tailwindcss` and `autoprefixer`. The `.cjs` extension is used due to `"type": "module"` in `package.json`.
    ```javascript
    module.exports = {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    };
    ```
  - `src/index.css`: Imports Tailwind's base, components, and utilities styles. It also defines CSS custom properties (variables) for ShadCN UI theming, supporting light and dark modes.
    ```css
    /* src/index.css */
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    :root { /* Light theme variables for ShadCN */
      --background: oklch(1 0 0); /* Example: white */
      --foreground: oklch(0.145 0 0); /* Example: near black */
      --primary: oklch(0.205 0 0); /* Default ShadCN primary */
      /* ... other ShadCN theme variables as defined in your src/index.css ... */
    }

    .dark { /* Dark theme variables for ShadCN */
      --background: oklch(0.145 0 0); /* Example: near black */
      --foreground: oklch(0.985 0 0); /* Example: near white */
      --primary: oklch(0.922 0 0); /* Default ShadCN dark primary */
      /* ... other ShadCN theme variables for dark mode ... */
    }

    /* The @theme inline block (if present) further maps these variables for ShadCN components. */
    ```

- **How Colors are Communicated and Changed:**
  1.  **For General Tailwind Styling (using custom palette from `tailwind.config.js`):**
      - To use a custom brand color defined in `tailwind.config.js` (e.g., `brand-primary`), apply its corresponding utility class (e.g., `className="bg-brand-primary"` or `className="text-brand-primary"`).
      - To change a brand color site-wide, modify its HEX value in the `theme.extend.colors` section of `tailwind.config.js`. After saving the changes, Tailwind's build process will regenerate its utility classes with the new color value.
  2.  **For ShadCN UI Components (using CSS Variables from `src/index.css`):**
      - ShadCN components are styled using CSS variables defined in `src/index.css` (e.g., `--primary`, `--background`, `--card-foreground`). These variables control the appearance of components like buttons, inputs, cards, etc., across light and dark themes.
      - To change a theme color for ShadCN components (e.g., the primary button color or the page background color), you need to modify the corresponding CSS variable's value in both the `:root` (for light mode) and `.dark` (for dark mode) rule sets within `src/index.css`.
      - For example, to change the primary color used by ShadCN components, you would update the `--primary` variable:
        ```css
        /* In src/index.css */
        :root {
          --primary: oklch( /* new light mode primary color value, e.g., from your brand palette if desired */ );
        }
        .dark {
          --primary: oklch( /* new dark mode primary color value */ );
        }
        ```
      - You can align ShadCN's theme with your `tailwind.config.js` brand colors by setting the CSS variables in `src/index.css` to use your brand color values (you might need to convert HEX to OKLCH if you want to maintain the OKLCH format used by default in ShadCN).

- **Content Paths**: Ensure `tailwind.config.js` has correct `content` paths to scan all relevant files for Tailwind class usage:
  ```javascript
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scans all JS, TS, JSX, TSX files in src
  ],
  ```
- **Known Issues/Notes**:
  - The `@layer base` rules in `src/index.css` that might have been initially scaffolded by ShadCN (related to applying `bg-background` or `border-border` to `body`) were found to cause issues with Tailwind's processing order and were commented out or removed. The necessary base styling is achieved through Tailwind's default base and styles applied in `App.jsx` or global CSS.
  - The persistent PostCSS error mentioned in `.clinerules/project-build-overview.md` regarding `@tailwindcss/postcss` should be monitored. While the current setup with `tailwindcss: {}` in `postcss.config.cjs` might work, resolving this warning according to Tailwind's recommendations (installing `@tailwindcss/postcss` and using it in the config) could prevent future issues.

### Backend (`backend-web-scrapper/requirements.txt`)
Key Python dependencies include:
- `fastapi`
- `uvicorn`
- `requests`
- `beautifulsoup4`
- `selenium`
- `python-dotenv`

Ensure a compatible version of ChromeDriver or other necessary WebDriver is installed and in your system's PATH if using Selenium for dynamic scraping locally.

## How It Works
The React frontend captures user input and sends requests to the FastAPI backend. The backend processes these requests using either static (BeautifulSoup) or dynamic (Selenium) scraping methods, retrieves data from target websites, and returns the results to the frontend for display.

## Extend & Customize
- Easily add new scraping fields or modify logic in `backend-web-scrapper/dynamic_web_scrapper.py`.
- Enhance the React UI with new features or styling.
- Expand backend endpoints for more advanced data processing or integrations.
