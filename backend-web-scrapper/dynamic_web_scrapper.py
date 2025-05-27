import requests
from bs4 import BeautifulSoup
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException # Added
from selenium_stealth import stealth
from typing import Optional # Added
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode # Added for URL manipulation
import pandas as pd
import logging
import random
import os
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Global flag to control scraper execution
scraper_should_run = True

def set_scraper_status(should_run: bool):
    """Sets the global scraper_should_run flag."""
    global scraper_should_run
    scraper_should_run = should_run
    logger.info(f"Scraper status set to: {'RUNNING' if should_run else 'STOPPED'}")

def get_scraper_status() -> bool:
    """Returns the current status of the scraper_should_run flag."""
    global scraper_should_run
    return scraper_should_run

def cancellable_sleep(duration, interval=0.1):
    """
    Sleeps for a given duration, but checks the scraper_should_run flag
    at specified intervals to allow for cancellation.
    Returns True if sleep completed, False if cancelled.
    """
    global scraper_should_run
    start_time = time.time()
    while time.time() - start_time < duration:
        if not scraper_should_run:
            logger.info(f"Sleep cancelled after {time.time() - start_time:.1f}s due to stop signal.")
            return False # Indicates sleep was cancelled
        
        # Calculate remaining time and determine actual sleep interval
        remaining_time = duration - (time.time() - start_time)
        current_interval = min(interval, remaining_time)

        if current_interval <= 0: # Ensure we don't sleep for zero or negative time
            break
        time.sleep(current_interval)
    return True # Indicates sleep completed

def scrape_data(url: str):
    """
    Scrapes data from the given URL and returns the page title and a text snippet.
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.string if soup.title else "No title found"
        text = soup.get_text(separator=" ", strip=True)
        snippet = text[:200] + "..." if len(text) > 200 else text
        return {
            "title": title,
            "snippet": snippet
        }
    except Exception as e:
        return {"error": str(e)}

class DynamicWebScraper:
    def __init__(self, delay=2, timeout=10, max_retries=3, proxy=None, scroll_pause_time=2):
        self.delay = delay
        self.timeout = timeout
        self.max_retries = max_retries
        self.proxy = proxy
        self.driver = None
        self.scroll_pause_time = scroll_pause_time
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

    def setup_driver(self):
        """Configure and initialize Chrome WebDriver with stealth settings"""
        try:
            logger.info("Setting up Chrome WebDriver with stealth configuration...")
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument(f"user-agent={random.choice(self.user_agents)}")

            if self.proxy:
                chrome_options.add_argument(f'--proxy-server={self.proxy}')

            # Create service
            service = Service()

            logger.info("Initializing Chrome WebDriver...")
            self.driver = webdriver.Chrome(service=service, options=chrome_options)

            # Apply stealth settings
            stealth(
                self.driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True,
            )

            self.driver.set_page_load_timeout(self.timeout)
            logger.info("Chrome WebDriver initialized successfully with stealth mode")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Chrome WebDriver: {str(e)}")
            if self.driver:
                self.driver.quit()

            # Log system information for debugging
            try:
                chrome_version = subprocess.check_output(['google-chrome', '--version']).decode().strip()
                logger.info(f"Chrome version: {chrome_version}")
            except Exception as ve:
                logger.error(f"Failed to get Chrome version: {ve}")

            raise

    def _scroll_page(self, max_scrolls=5):
        """Scroll the page to load more content"""
        try:
            scroll_count = 0
            last_height = self.driver.execute_script("return document.body.scrollHeight")
            logger.info(f"Starting page scroll with max_scrolls={max_scrolls}")

            while scroll_count < max_scrolls:
                if not scraper_should_run:
                    logger.info("Stop signal received during scroll. Exiting scroll loop.")
                    break
                # Scroll down to bottom
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                logger.info(f"Performed scroll {scroll_count + 1}/{max_scrolls}")

                # Wait for new content to load
                logger.info(f"Waiting {self.scroll_pause_time}s for content to load after scroll...")
                if not cancellable_sleep(self.scroll_pause_time):
                    logger.info("Scroll pause wait cancelled.")
                    return False # Propagate cancellation

                # Calculate new scroll height
                new_height = self.driver.execute_script("return document.body.scrollHeight")

                # Break if no more new content (height didn't change)
                if new_height == last_height:
                    logger.info("Reached end of page or no more content loading")
                    break

                last_height = new_height
                scroll_count += 1
                logger.info(f"Page height changed from {last_height} to {new_height}")

            logger.info(f"Completed scrolling with {scroll_count} scrolls performed")
            return True
        except Exception as e:
            logger.error(f"Error while scrolling: {str(e)}")
            return False

    def _make_dynamic_request(self, url, enable_scrolling=False, max_scrolls=5):
        """Load page with Selenium and wait for dynamic content"""
        global scraper_should_run
        if not scraper_should_run:
            logger.info("Cancellation detected before making dynamic request.")
            return False
        try:
            logger.info(f"Making dynamic request to {url}")
            if not self.driver: # This check might be redundant if setup_driver is always called before
                logger.info("WebDriver not initialized in _make_dynamic_request. Initializing now...")
                if not self.setup_driver(): # setup_driver already handles its own errors and logging
                    logger.error("Failed to setup driver in _make_dynamic_request.")
                    return False 
            
            if not scraper_should_run: # Check again after potential setup_driver call
                logger.info("Cancellation detected after driver setup attempt in _make_dynamic_request.")
                return False

            try:
                logger.info(f"Attempting to load URL: {url} with timeout {self.timeout}s")
                self.driver.get(url)
                if not scraper_should_run: 
                    logger.info("Scraping cancelled immediately after driver.get() completed/interrupted.")
                    return False
            except TimeoutException:
                logger.warning(f"Page load timeout for {url}.")
                if not scraper_should_run:
                    logger.info("Page load timeout coincided with cancellation signal.")
                return False # Treat all timeouts as failure for this method
            except Exception as e: # Catch other potential driver.get() errors
                logger.error(f"Error during driver.get({url}): {str(e)}")
                if not scraper_should_run:
                     logger.info("Error during driver.get() coincided with cancellation.")
                return False

            logger.info("Page loaded. Waiting for dynamic content to potentially load...")
            post_load_wait_duration = random.uniform(5, 8)
            logger.info(f"Waiting for {post_load_wait_duration:.1f}s for page to settle...")
            if not cancellable_sleep(post_load_wait_duration):
                logger.info("Post-load wait cancelled.")
                return False

            if enable_scrolling:
                logger.info("Scrolling enabled, starting scroll process...")
                if not self._scroll_page(max_scrolls): # _scroll_page needs to return False on cancel
                    logger.info("Scrolling was cancelled or failed.")
                    return False
            
            return True
        except Exception as e: # General exception handler for _make_dynamic_request
            logger.error(f"Unexpected error in _make_dynamic_request for {url}: {str(e)}")
            return False

    def _extract_dynamic_field_data(self, container, field):
        """Extract data from dynamic page using Selenium selectors"""
        try:
            # Try multiple ways to find the element
            elements = container.find_elements(By.CSS_SELECTOR, field["selector"])
            
            # If no elements found with the direct selector, try a more generic approach
            if not elements and field["name"].lower() in ["price", "cost", "amount"]:
                logger.info(f"No elements found with selector '{field['selector']}', trying alternative price selectors")
                # Common price selectors that might work
                alternative_selectors = [
                    ".prc", "span.prc", "div.prc", 
                    ".price", "span.price", "div.price", 
                    "*[class*='price']", "*[class*='prc']",
                    ".current-price", ".product-price"
                ]
                
                for alt_selector in alternative_selectors:
                    elements = container.find_elements(By.CSS_SELECTOR, alt_selector)
                    if elements:
                        logger.info(f"Found elements using alternative selector: {alt_selector}")
                        break
            
            # Process found elements
            data = []
            
            # Special handling for price fields to filter out non-price text
            if field["name"].lower() in ["price", "cost", "amount"]:
                price_pattern = r'(?:(?:USD|Ksh|KSh|KES|Sh|$|£|€|Rs)\.?\s?)([\d,]+(?:\.\d+)?)|^[\d,]+(?:\.\d+)?$'
                price_elements = []
                
                for element in elements:
                    # Get text from element
                    text = element.text.strip()
                    if not text:
                        text = self.driver.execute_script("return arguments[0].textContent;", element).strip()
                    
                    # Skip empty elements or common non-price labels
                    if not text or text.lower() in ['sold', 'top seller', 'bestseller', 'sale', 'discount']:
                        continue
                    
                    # Check if text contains currency symbols or follows price format
                    if re.search(price_pattern, text) or any(currency in text for currency in ['Ksh', 'KSh', '$', '£', '€']):
                        price_elements.append((element, text))
                    elif text.replace(',', '').replace('.', '').isdigit():
                        # Text that's just a number is likely a price without currency symbol
                        price_elements.append((element, text))
                
                logger.info(f"Found {len(price_elements)} potential price elements")
                
                # If we have price candidates, choose the most likely one
                if price_elements:
                    # Sort by priority:
                    # 1. Elements with currency symbols first
                    # 2. Longer textual content (often contains more price info)
                    price_elements.sort(key=lambda x: (
                        0 if any(currency in x[1] for currency in ['Ksh', 'KSh', '$', '£', '€']) else 1,
                        -len(x[1])
                    ))
                    
                    chosen_element, chosen_text = price_elements[0]
                    logger.info(f"Selected price element with text: {chosen_text}")
                    data.append(chosen_text)
            else:
                # Regular processing for non-price fields
                for element in elements:
                    if element.tag_name == 'img' and element.get_attribute('src'):
                        data.append(element.get_attribute('src'))
                    elif element.tag_name == 'a' and element.get_attribute('href'):
                        data.append(element.get_attribute('href'))
                    else:
                        # Use JavaScript to get text content as a fallback
                        text = element.text.strip()
                        if not text:
                            text = self.driver.execute_script("return arguments[0].textContent;", element).strip()
                        if text:
                            data.append(text)
            
            if data:
                logger.info(f"Successfully extracted data for field '{field['name']}': {data[0]}")
                return data[0]
            else:
                logger.warning(f"No data found for field '{field['name']}' in container")
                return ''
        except Exception as e:
            logger.error(f"Error extracting dynamic field data for '{field['name']}': {str(e)}")
            return ''

    def _process_dynamic_page_data(self, container_selector, custom_fields):
        """Process and extract data from dynamic page"""
        data = {field["name"]: [] for field in custom_fields}
        try:
            logger.info("Waiting for containers to be present...")
            WebDriverWait(self.driver, 20).until(  # Increased timeout to 20 seconds
                EC.presence_of_element_located((By.CSS_SELECTOR, container_selector))
            )

            containers = self.driver.find_elements(By.CSS_SELECTOR, container_selector)
            logger.info(f"Found {len(containers)} dynamic containers")
            
            # Extract and log HTML structure of the first container for debugging
            if containers:
                first_container_html = self.driver.execute_script("return arguments[0].outerHTML;", containers[0])
                logger.info(f"First container HTML structure sample: {first_container_html[:200]}...")

            # Process each container
            success_count = {field["name"]: 0 for field in custom_fields}
            for i, container in enumerate(containers):
                if not scraper_should_run:
                    logger.info("Stop signal received during container processing. Exiting container loop.")
                    break
                logger.info(f"Processing container {i+1}/{len(containers)}")
                for field in custom_fields:
                    try:
                        field_value = self._extract_dynamic_field_data(container, field)
                        data[field["name"]].append(field_value)
                        if field_value:
                            success_count[field["name"]] += 1
                    except Exception as e:
                        logger.error(f"Error processing field {field['name']} in container {i+1}: {str(e)}")
                        data[field["name"]].append('')
            
            # Log success rates for each field
            for field_name, count in success_count.items():
                success_rate = (count / len(containers)) * 100 if containers else 0
                logger.info(f"Field '{field_name}' extraction success rate: {success_rate:.2f}% ({count}/{len(containers)})")

            # Create DataFrame and clean empty cells
            df = pd.DataFrame(data)
            # Remove rows where all values are empty strings or None
            df = df.dropna(how='all')
            # Remove rows where all values are empty strings
            df = df[~(df.astype(str).apply(lambda x: x.str.strip() == '').all(axis=1))]
            # Reset index after filtering
            df = df.reset_index(drop=True)
            return df
        except Exception as e:
            logger.error(f"Error processing dynamic page data: {str(e)}")
            return pd.DataFrame()

    def scrape_dynamic_page(self, url, container_selector, custom_fields, enable_scrolling=False, max_scrolls=5):
        """Scrape data from a dynamic page"""
        global scraper_should_run
        try:
            logger.info(f"Starting dynamic scrape for URL: {url}")
            if not scraper_should_run: # Early exit if cancelled before even starting
                logger.info(f"Scrape for {url} cancelled before _make_dynamic_request.")
                return pd.DataFrame()

            if self._make_dynamic_request(url, enable_scrolling, max_scrolls):
                if not scraper_should_run: # Check after _make_dynamic_request if it was cancelled during
                    logger.info(f"Scrape for {url} cancelled after _make_dynamic_request succeeded but before processing.")
                    return pd.DataFrame()
                return self._process_dynamic_page_data(container_selector, custom_fields)
            else: # _make_dynamic_request returned False (failure or cancellation)
                logger.info(f"_make_dynamic_request failed or was cancelled for {url}.")
                return pd.DataFrame()
        except Exception as e:
            logger.error(f"Error in dynamic page scraping for {url}: {str(e)}")
            return pd.DataFrame()

    def scrape_dynamic_with_pagination(self, url, container_selector, custom_fields,
                                     start_page, end_page, pagination_type, page_param=None,
                                     enable_scrolling=False, max_scrolls=5,
                                     next_button_selector=None): # Removed session_id
        """Scrape data from dynamic pages with pagination"""
        all_data = []
        current_url = url

        try:
            # Initialize WebDriver once for the entire pagination process
            logger.info("Setting up WebDriver for pagination...")
            if not self.driver:
                self.setup_driver()

            # Make initial request
            logger.info(f"Making initial request to {url}")
            self.driver.get(url)
            current_url = self.driver.current_url # Update current_url after initial load
            logger.info(f"Initial page loaded. Current URL: {current_url}")
            logger.info("Initial page load for pagination, waiting...")
            if not cancellable_sleep(random.uniform(2, 4)):
                logger.info("Initial page load wait cancelled during pagination.")
                return pd.DataFrame() # Return empty if cancelled

            for page in range(start_page, end_page + 1):
                if not scraper_should_run:
                    logger.info("Stop signal received before processing page. Exiting pagination loop.")
                    break
                logger.info(f"Processing page {page}")

                if enable_scrolling:
                    self._scroll_page(max_scrolls)

                # Extract data from current page
                page_df = self._process_dynamic_page_data(container_selector, custom_fields)

                if not page_df.empty:
                    all_data.append(page_df)
                    logger.info(f"Successfully scraped {len(page_df)} records from page {page}")
                else:
                    logger.warning(f"No data found on page {page}")
                    break

                # Don't try to go to next page if we're on the last page
                if page < end_page:
                    if not scraper_should_run:
                        logger.info("Stop signal received before navigating to next page. Exiting pagination loop.")
                        break
                    if pagination_type == "URL Parameter":
                        base_url_for_modification = current_url 
                        parsed_url_obj = urlparse(base_url_for_modification)
                        original_path = parsed_url_obj.path
                        
                        next_page_num_val = page + 1
                        next_url_val = ""

                        # Regex to find (literal page_param)(digits)
                        # User provides page_param like "page-" or "p"
                        path_regex_pattern = re.compile(f"({re.escape(page_param)})(\\d+)")
                        
                        # Use a lambda for safer substitution with backreferences
                        modified_path = path_regex_pattern.sub(lambda m: f"{m.group(1)}{next_page_num_val}", original_path)

                        if modified_path != original_path: # Path replacement was successful
                            next_url_parts = list(parsed_url_obj)
                            next_url_parts[2] = modified_path # path is at index 2
                            next_url_val = urlunparse(next_url_parts)
                            logger.info(f"Navigating to next page (Path Update): {next_url_val}")
                        else: # Path replacement failed or not applicable, fall back to query parameter
                            query_dict = parse_qs(parsed_url_obj.query)
                            query_dict[page_param] = [str(next_page_num_val)] # Use the variable page_param
                            new_query_str = urlencode(query_dict, doseq=True)
                            
                            next_url_parts = list(parsed_url_obj)
                            next_url_parts[4] = new_query_str # query is at index 4
                            next_url_val = urlunparse(next_url_parts)
                            logger.info(f"Navigating to next page (Query Update): {next_url_val}")
                        
                        self.driver.get(next_url_val)
                        current_url = self.driver.current_url # Update current_url after navigation
                        
                        logger.info(f"Paginated page {next_page_num_val} navigation complete. Current URL: {current_url}")
                        logger.info(f"Waiting after navigating to page {next_page_num_val}...")
                        if not cancellable_sleep(random.uniform(2, 4)):
                            logger.info("Paginated page load wait cancelled.")
                            break # Exit pagination loop

                    elif pagination_type == "Next Button":
                        try:
                            final_selector = next_button_selector
                            # Default selector if none provided by user for "Next Button"
                            if not final_selector:
                                final_selector = "li.next a, a.next, button.next, button[aria-label*='next' i], a[aria-label*='next' i], li.pagination-next a"
                                logger.info(f"No 'Next Button' selector provided, using default CSS selectors: {final_selector}")
                                find_by = By.CSS_SELECTOR
                            # Determine if the selector is XPath or CSS
                            elif final_selector.startswith("//") or final_selector.startswith("(//"):
                                find_by = By.XPATH
                                logger.info(f"Looking for next button using XPath: {final_selector}")
                            else:
                                find_by = By.CSS_SELECTOR
                                logger.info(f"Looking for next button using CSS Selector: {final_selector}")
                            
                            next_button = WebDriverWait(self.driver, 20).until(
                                EC.element_to_be_clickable((find_by, final_selector))
                            )

                            if not next_button.is_displayed():
                                logger.info("Next button found but not visible, scrolling into view")
                                self.driver.execute_script("arguments[0].scrollIntoView(true);", next_button)
                                time.sleep(1)  # Wait for scroll to complete

                            logger.info("Clicking next button...")
                            next_button.click()
                            logger.info("Clicked next button, waiting for new page to load...")

                            # Wait for the container on the new page to be present
                            WebDriverWait(self.driver, 20).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, container_selector)) # Or some other reliable indicator of page load
                            )
                            current_url = self.driver.current_url # Update current_url after click and page load
                            logger.info(f"Navigated via Next Button. Current URL: {current_url}")
                            
                            logger.info("Post-click wait for animations...")
                            if not cancellable_sleep(2): # Consider making this wait duration configurable or dynamic
                                logger.info("Post-click wait cancelled.")
                                break # Exit pagination loop

                        except Exception as e:
                            logger.error(f"Error navigating to next page: {str(e)}")
                            break
                
                logger.info(f"Inter-page delay for page {page}...")
                if not cancellable_sleep(random.uniform(self.delay, self.delay + 2)):
                    logger.info("Inter-page delay cancelled.")
                    break # Exit pagination loop

        except Exception as e:
            logger.error(f"Error in pagination scraping: {str(e)}")
        finally:
            if self.driver:
                logger.info("Closing WebDriver...")
                self.driver.quit()
                self.driver = None

        # Combine all data with continuous indexing
        if all_data:
            final_df = pd.concat(all_data, ignore_index=True)  # ignore_index ensures continuous indexing
            final_df = final_df.dropna(how='all')  # Remove any remaining empty rows
            final_df = final_df.reset_index(drop=True)  # Final reset of index to be continuous
            logger.info(f"Total records scraped: {len(final_df)}")
            return final_df
        else:
            return pd.DataFrame()

# New top-level wrapper function for pagination
def scrape_dynamic_with_pagination(
    url: str,
    container_selector: str,
    custom_fields: list,
    start_page: int,
    end_page: int,
    pagination_type: str,
    page_param: Optional[str] = None,
    enable_scrolling: bool = False,
    max_scrolls: int = 5,
    next_button_selector: Optional[str] = None
):
    """
    Scrapes dynamic data from multiple pages using pagination.
    This is a top-level wrapper function.
    """
    global scraper_should_run # Required by set_scraper_status and get_scraper_status
    set_scraper_status(True)
    logger.info(f"Starting dynamic scrape with pagination for URL: {url}, Pages: {start_page}-{end_page}")
    
    # Instantiate DynamicWebScraper, similar to scrape_dynamic_data
    # Using timeout=30 for consistency with scrape_dynamic_data. Other params use class defaults.
    scraper = DynamicWebScraper(timeout=30) 
    
    df_results = pd.DataFrame() # Initialize to empty DataFrame

    try:
        if not scraper_should_run: # Early exit if cancelled before starting
            logger.info(f"Scraping (pagination) for {url} cancelled before starting.")
            return df_results

        # The DynamicWebScraper.scrape_dynamic_with_pagination method handles its own driver lifecycle
        # (setup and teardown).
        df_results = scraper.scrape_dynamic_with_pagination( # Call the class method
            url=url,
            container_selector=container_selector,
            custom_fields=custom_fields,
            start_page=start_page,
            end_page=end_page,
            pagination_type=pagination_type,
            page_param=page_param,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls,
            next_button_selector=next_button_selector
            # session_id is not passed from main.py, so it will use its default (None) in the class method
        )
        
        # Check status after the potentially long-running scraping operation
        if not get_scraper_status():
             logger.info(f"Scraping (pagination) for {url} was cancelled during operation.")
             # df_results might contain partial data if cancelled mid-way.
        else:
            logger.info(f"Dynamic scrape with pagination complete for {url}. Found {len(df_results)} records.")
            
        return df_results

    except Exception as e:
        logger.error(f"Unhandled exception in top-level scrape_dynamic_with_pagination for {url}: {str(e)}")
        # Ensure an empty DataFrame is returned on error, as expected by main.py
        return pd.DataFrame() 
    # No 'finally' block for driver cleanup here, as the class method handles it.


def scrape_dynamic_data(
    url: str,
    container_selector: str,
    custom_fields: list,
    enable_scrolling: bool = False,
    max_scrolls: int = 5
):
    """
    Scrapes dynamic data from the given URL using the provided container selector and custom fields.
    Returns a list of dicts (one per container).
    """
    global scraper_should_run
    set_scraper_status(True) # Reset flag for new scrape
    logging.info(f"Starting dynamic scrape for URL: {url}")
    scraper = DynamicWebScraper(timeout=30)  # Increased timeout to 30 seconds
    df = pd.DataFrame() # Initialize df
    try:
        if not scraper_should_run:
            logger.info("Scraping cancelled before starting.")
            return []
        
        # Attempt to setup driver
        try:
            if not scraper.setup_driver(): # setup_driver now returns True on success, or raises exception
                 logger.error("Failed to setup driver (setup_driver returned False or None).")
                 return []
        except Exception as e:
            logger.error(f"Exception during scraper.setup_driver(): {e}")
            # Ensure driver is cleaned up if partially initialized and then failed
            if scraper.driver:
                scraper.driver.quit()
                scraper.driver = None
            return []

        # Check cancellation status *after* driver setup attempt
        if not scraper_should_run:
            logger.info("Scraping cancelled after driver setup.")
            if scraper.driver: # Ensure driver is quit if setup succeeded then cancelled
                scraper.driver.quit()
                scraper.driver = None
            return []
        
        # Ensure driver is available
        if not scraper.driver:
             logger.error("Driver not available after setup attempt for dynamic scrape.")
             return []

        df = scraper.scrape_dynamic_page(
            url,
            container_selector,
            custom_fields,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls
        )
        # Convert DataFrame to list of dicts for JSON serialization
        logging.info(f"Dynamic scrape complete. Found {len(df)} records.")
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Unhandled exception in scrape_dynamic_data: {e}")
        return [] # Return empty list on error
    finally:
        if scraper.driver:
            logger.info("Ensuring WebDriver is closed in scrape_dynamic_data.")
            scraper.driver.quit()
            scraper.driver = None
