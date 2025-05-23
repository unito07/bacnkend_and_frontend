## Brief overview
- This rule provides an overview of the current project's build setup and highlights a persistent issue with Tailwind CSS integration.

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

## Persistent Build Issue (Frontend)
- **Problem:** Tailwind CSS styles are not applying in the browser, and the Vite development server consistently reports a PostCSS error:
  ```
  [postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
  ```
- **Troubleshooting Steps Taken:**
  - Verified `tailwind.config.js` content paths.
  - Adjusted `postcss.config.js` to use `tailwindcss: {}`, then `@tailwindcss/postcss: {}`, and tried both ES module and CommonJS (`module.exports`) syntax.
  - Confirmed `@tailwindcss/postcss`, `autoprefixer`, `postcss`, and `tailwindcss` are installed as dev dependencies.
  - Deleted `node_modules` and lock files (`package-lock.json`, `yarn.lock`) and reinstalled dependencies.
  - Renamed `postcss.config.js` to `postcss.config.cjs` to align with ES module project type.
- **Current Status:** The error persists, indicating a deeper conflict or version incompatibility that is not resolved by standard configuration adjustments. The UI appears unstyled in the browser.

## Next Steps for Resolution
- Further investigation into specific version compatibility between Vite, Tailwind CSS, and PostCSS.
- Exploring alternative PostCSS configurations or Vite plugins if the direct approach continues to fail.
