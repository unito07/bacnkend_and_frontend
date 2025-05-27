## Brief overview
This file outlines the preferred technologies, architectural choices, and best practices for the backend of the web scraper project. It aims to provide a comprehensive guide for backend development, ensuring consistency and maintainability.

## Preferred Tech Stack
- **Language**: Python 3.x - Python is the preferred language due to its readability, extensive libraries, and suitability for web scraping and API development.
- **Framework**: FastAPI - FastAPI is the preferred framework for building the backend API due to its high performance, automatic data validation, and auto-generated API documentation (using OpenAPI and Swagger).
- **Dependencies**:
    - `requests`: Used for making HTTP requests in static web scraping. It's a simple and elegant library for handling various HTTP methods and headers.
    - `beautifulsoup4`: Used for parsing HTML and XML content in static web scraping. It provides a convenient way to navigate and extract data from the parsed content.
    - `selenium`: Used for automating web browsers in dynamic web scraping. It allows simulating user interactions with websites, such as clicking buttons, filling forms, and scrolling pages.
    - `python-dotenv`: Used for loading environment variables from a `.env` file. This helps to keep sensitive information, such as API keys and database credentials, separate from the codebase.
    - `uvicorn`: An ASGI server for running the FastAPI application. It provides high performance and supports asynchronous operations.

## Coding Conventions
- Follow PEP 8 style guidelines - Adhere to PEP 8 for code formatting, naming conventions, and overall code style. This ensures consistency and readability across the codebase.
- Use descriptive variable and function names - Use meaningful and descriptive names for variables and functions to improve code clarity and understanding.
- Add comments to explain complex logic - Add comments to explain complex or non-obvious logic. This helps other developers (and yourself) understand the code's purpose and functionality.
- Use type hints for function arguments and return values - Use type hints to specify the expected data types for function arguments and return values. This improves code readability and helps to catch type-related errors early on.

## Logging
- Use the `log_manager` module for logging - Utilize the custom `log_manager` module for all logging activities. This ensures consistent logging format and centralized log management.
- Log all important events, such as scraping requests, results, and errors - Log all significant events, including successful scraping requests, scraped data, and any errors encountered. This provides valuable insights into the application's behavior and helps with debugging.
- Use appropriate log levels (e.g., INFO, WARNING, ERROR) - Use appropriate log levels to categorize log messages based on their severity. This allows filtering and prioritizing log messages based on their importance.

## Error Handling
- Implement robust error handling to prevent the application from crashing - Implement comprehensive error handling to gracefully handle exceptions and prevent the application from crashing.
- Catch exceptions and log them appropriately - Catch exceptions and log them with appropriate log levels (e.g., ERROR). This helps to identify and diagnose issues quickly.
- Return informative error messages to the client - Return informative error messages to the client when errors occur. This helps the client understand the cause of the error and take appropriate action.

## Scraping
- Use `requests` and `BeautifulSoup4` for static web scraping - Use `requests` to fetch the HTML content of web pages and `BeautifulSoup4` to parse and extract data from the content.
- Use `selenium` and `selenium-stealth` for dynamic web scraping - Use `selenium` to automate web browsers and `selenium-stealth` to prevent bot detection. This allows scraping data from websites that require JavaScript execution or user interaction.
- Implement measures to prevent bot detection - Implement various techniques to prevent bot detection, such as using rotating proxies, setting custom user agents, and mimicking human behavior.
- Respect website terms of service and robots.txt - Always respect website terms of service and robots.txt to avoid violating their policies and potentially getting blocked.

## Asynchronous Operations
- Use `asyncio` for asynchronous operations to improve performance - Use `asyncio` to perform asynchronous operations, such as making multiple HTTP requests concurrently. This improves the application's performance and responsiveness.
- Use `asyncio.to_thread` to run synchronous functions in a separate thread - Use `asyncio.to_thread` to run synchronous functions in a separate thread to avoid blocking the main event loop. This is useful for running CPU-bound tasks or interacting with libraries that don't support asynchronous operations.

## API Design
- Use RESTful API design principles - Follow RESTful API design principles to create a well-structured and easy-to-use API.
- Provide clear and concise API documentation - Provide clear and concise API documentation using OpenAPI and Swagger. This helps developers understand how to use the API and integrate it with their applications.
- Implement input validation to prevent security vulnerabilities - Implement input validation to prevent security vulnerabilities, such as SQL injection and cross-site scripting (XSS). This ensures that the application only processes valid and safe data.
