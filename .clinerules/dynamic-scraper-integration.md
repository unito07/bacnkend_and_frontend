## Brief overview
- Guidelines for integrating advanced dynamic web scraping logic (using Selenium, pandas, etc.) into the web-scrapper project, based on user-supplied code and preferences.

## Communication style
- Be concise and direct.
- Avoid unnecessary explanations; focus on actionable steps.

## Development workflow
- Integrate user-supplied code as-is unless specific changes are requested.
- Test integration with the existing FastAPI backend and frontend.
- Use iterative development: update, test, and confirm at each step.

## Coding best practices
- Preserve user’s class and function names.
- Maintain all logging and error handling from user code.
- Use clear, descriptive variable names and docstrings as in the provided code.
- Do not remove or alter user-supplied comments or logging unless asked.

## Project context
- The backend should support both static (requests/BeautifulSoup) and dynamic (Selenium) scraping.
- The frontend should display real scraped data, not just success messages.
- Use FastAPI for backend endpoints, and ensure compatibility with the frontend fetch logic.

## Other guidelines
- Place new or user-supplied scraper classes in backend-web-scrapper/dynamic_web_scrapper.py.
- Do not overwrite existing Cline rule files.
- Use hyphens in filenames.
