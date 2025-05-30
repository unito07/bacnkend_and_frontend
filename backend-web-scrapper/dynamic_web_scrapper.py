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
    def __init__(self, delay=2, timeout=10, max_retries=3, proxy=None, scroll_pause_time=2.5): # scroll_to_end_page will be passed as a method argument, not an instance attribute
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

    def _scroll_page(self, max_scrolls=5, scroll_to_end_page: bool = False):
        """Scroll the page to load more content.
        If scroll_to_end_page is True, max_scrolls is ignored and scrolling continues until no new content loads.
        """
        try:
            scroll_count = 0
            last_height = self.driver.execute_script("return document.body.scrollHeight")
            scroll_type_log = "to end of page" if scroll_to_end_page else f"with max_scrolls={max_scrolls}"
            logger.info(f"Starting page scroll {scroll_type_log}")

            stable_height_checks = 0
            required_stable_checks = 3 # Number of consecutive times height must be stable before stopping

            while True: # Loop condition managed inside
                if not scraper_should_run:
                    logger.info("Stop signal received during scroll. Exiting scroll loop.")
                    break

                # Conditional check for max_scrolls if not scrolling to end
                if not scroll_to_end_page and scroll_count >= max_scrolls:
                    logger.info(f"Reached max_scrolls limit of {max_scrolls}.")
                    break

                # Scroll down to bottom
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                scroll_attempt_log = f"scroll attempt {scroll_count + 1}"
                if not scroll_to_end_page:
                    scroll_attempt_log += f"/{max_scrolls}"
                logger.info(f"Performed {scroll_attempt_log}")

                # Wait for new content to load
                logger.info(f"Waiting {self.scroll_pause_time}s for content to load after scroll...")
                if not cancellable_sleep(self.scroll_pause_time):
                    logger.info("Scroll pause wait cancelled.")
                    return False # Propagate cancellation

                # Calculate new scroll height
                new_height = self.driver.execute_script("return document.body.scrollHeight")

                if new_height == last_height:
                    if scroll_to_end_page:
                        stable_height_checks += 1
                        logger.info(f"Page height {new_height} remained stable. Check {stable_height_checks}/{required_stable_checks}.")
                        if stable_height_checks >= required_stable_checks:
                            logger.info(f"Page height has been stable for {required_stable_checks} checks. Assuming end of page.")
                            break
                    else: # Not scrolling to end, so break immediately if height is stable
                        logger.info("Reached end of page or no more content loading (height did not change).")
                        break
                else: # Height changed
                    if scroll_to_end_page:
                        stable_height_checks = 0 # Reset stability counter
                    last_height = new_height
                    scroll_count += 1 # Increment scroll_count only when height actually changes or it's the first scroll after a stable period that then changes
                    logger.info(f"Page height changed to {new_height}. Continuing scroll. Resetting stability checks if any.")
                
                # If not scrolling to end, scroll_count is already managed by the max_scrolls check at the loop start
                # If scrolling to end, we increment scroll_count when height changes to keep track of actual effective scrolls.
                # For logging purposes, if stable_height_checks > 0 but < required_stable_checks, we still increment scroll_count
                # to reflect a scroll attempt was made.
                if new_height == last_height and scroll_to_end_page and stable_height_checks < required_stable_checks:
                    # This case means height was stable, but we haven't met required_stable_checks, so we scrolled again.
                    # We already logged the scroll attempt. We don't increment scroll_count here as it's not a "new content" scroll.
                    pass # Handled by the stability check logic
                elif new_height != last_height: # This was already handled above by resetting stable_height_checks and incrementing scroll_count
                    pass


            logger.info(f"Completed scrolling with {scroll_count} effective content-loading scrolls performed.")
            return True
        except Exception as e:
            logger.error(f"Error while scrolling: {str(e)}")
            return False

    def _make_dynamic_request(self, url, enable_scrolling=False, max_scrolls=5, scroll_to_end_page: bool = False):
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
                    return False, "Scraping cancelled after URL load attempt."
            except TimeoutException:
                error_msg = f"Page load timeout for {url} after {self.timeout}s."
                logger.warning(error_msg)
                if not scraper_should_run:
                    logger.info("Page load timeout coincided with cancellation signal.")
                return False, error_msg
            except Exception as e: # Catch other potential driver.get() errors, like invalid argument
                error_msg = f"Error during driver.get({url}): {str(e)}"
                logger.error(error_msg)
                if not scraper_should_run:
                     logger.info("Error during driver.get() coincided with cancellation.")
                return False, error_msg

            logger.info("Page loaded. Waiting for dynamic content to potentially load...")
            post_load_wait_duration = random.uniform(5, 8)
            logger.info(f"Waiting for {post_load_wait_duration:.1f}s for page to settle...")
            if not cancellable_sleep(post_load_wait_duration):
                logger.info("Post-load wait cancelled.")
                return False, "Post-load wait cancelled."

            if enable_scrolling:
                logger.info("Scrolling enabled, starting scroll process...")
                # _scroll_page returns True on success, False on failure/cancellation
                if not self._scroll_page(max_scrolls=max_scrolls, scroll_to_end_page=scroll_to_end_page):
                    logger.info("Scrolling was cancelled or failed.")
                    return False, "Scrolling process failed or was cancelled."
            
            return True, None # Success
        except Exception as e: # General exception handler for _make_dynamic_request
            error_msg = f"Unexpected error in _make_dynamic_request for {url}: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

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
            return df, None # Success
        except Exception as e:
            error_msg = f"Error processing dynamic page data: {str(e)}"
            logger.error(error_msg)
            return pd.DataFrame(), error_msg

    def scrape_dynamic_page(self, url, container_selector, custom_fields, enable_scrolling=False, max_scrolls=5, scroll_to_end_page: bool = False):
        """Scrape data from a dynamic page"""
        global scraper_should_run
        try:
            logger.info(f"Starting dynamic scrape for URL: {url}")
            if not scraper_should_run: # Early exit if cancelled before even starting
                logger.info(f"Scrape for {url} cancelled before _make_dynamic_request.")
                return pd.DataFrame(), "Scraping cancelled before making request."

            request_success, request_error_msg = self._make_dynamic_request(url, enable_scrolling, max_scrolls, scroll_to_end_page)
            
            if request_success:
                if not scraper_should_run: # Check after _make_dynamic_request if it was cancelled during
                    logger.info(f"Scrape for {url} cancelled after _make_dynamic_request succeeded but before processing.")
                    return pd.DataFrame(), "Scraping cancelled after successful request, before processing."
                # Proceed to process data, _process_dynamic_page_data now returns (df, error_msg)
                df, processing_error_msg = self._process_dynamic_page_data(container_selector, custom_fields)
                return df, processing_error_msg # processing_error_msg will be None on success
            else: # _make_dynamic_request returned False (failure or cancellation)
                logger.info(f"_make_dynamic_request failed or was cancelled for {url}. Error: {request_error_msg}")
                return pd.DataFrame(), request_error_msg
        except Exception as e:
            error_msg = f"Error in dynamic page scraping for {url}: {str(e)}"
            logger.error(error_msg)
            return pd.DataFrame(), error_msg

    def scrape_dynamic_with_pagination(self, url, container_selector, custom_fields,
                                     start_page, end_page, pagination_type, page_param=None,
                                     enable_scrolling=False, max_scrolls=5, scroll_to_end_page: bool = False,
                                     next_button_selector=None):
        """Scrape data from dynamic pages with pagination. Returns (DataFrame, error_message_or_None)"""
        all_data = []
        current_url = url
        accumulated_errors = [] # To store non-fatal errors from page processing

        try:
            logger.info("Setting up WebDriver for pagination...")
            if not self.driver:
                try:
                    if not self.setup_driver(): # setup_driver raises on critical failure or returns True
                        # This path should ideally not be hit if setup_driver raises as expected
                        err_msg = "WebDriver setup failed in pagination (returned False)."
                        logger.error(err_msg)
                        return pd.DataFrame(), err_msg
                except Exception as e:
                    err_msg = f"WebDriver setup failed in pagination: {str(e)}"
                    logger.error(err_msg)
                    return pd.DataFrame(), err_msg

            logger.info(f"Making initial request to {url}")
            try:
                self.driver.get(url)
                current_url = self.driver.current_url
                logger.info(f"Initial page loaded. Current URL: {current_url}")
            except Exception as e:
                err_msg = f"Initial page load failed for {url} during pagination: {str(e)}"
                logger.error(err_msg)
                return pd.DataFrame(), err_msg
            
            logger.info("Initial page load for pagination, waiting...")
            if not cancellable_sleep(random.uniform(2, 4)):
                logger.info("Initial page load wait cancelled during pagination.")
                return pd.DataFrame(), "Initial page load wait cancelled."

            for page in range(start_page, end_page + 1):
                if not scraper_should_run:
                    logger.info("Stop signal received before processing page. Exiting pagination loop.")
                    break 
                logger.info(f"Processing page {page} of {current_url}")

                if enable_scrolling:
                    if not self._scroll_page(max_scrolls=max_scrolls, scroll_to_end_page=scroll_to_end_page):
                        # Scroll failure might be due to cancellation or other issues.
                        # If cancelled, scraper_should_run will be false and loop will break.
                        # If other error, log it and potentially break or continue.
                        logger.warning(f"Scrolling failed or was cancelled on page {page}.")
                        if not scraper_should_run: break # Exit if cancelled
                        # Decide if non-cancellation scroll failure is fatal for this page
                        accumulated_errors.append(f"Page {page}: Scrolling failed.")


                page_df, page_error = self._process_dynamic_page_data(container_selector, custom_fields)
                if page_error:
                    logger.warning(f"Error processing page {page} of {current_url}: {page_error}.")
                    accumulated_errors.append(f"Page {page}: {page_error}")
                
                if page_df is not None and not page_df.empty:
                    all_data.append(page_df)
                    logger.info(f"Successfully scraped {len(page_df)} records from page {page}")
                elif not page_error: # No data and no error means page was empty or selectors found nothing
                    logger.warning(f"No data extracted on page {page} of {current_url} (selectors might not have matched or page was empty).")
                
                if not scraper_should_run: break # Check again after processing

                if page < end_page: # Navigate to next page
                    nav_success = False
                    try:
                        if pagination_type == "URL Parameter":
                            # ... (URL parameter navigation logic as before) ...
                            base_url_for_modification = current_url 
                            parsed_url_obj = urlparse(base_url_for_modification)
                            original_path = parsed_url_obj.path
                            next_page_num_val = page + 1
                            next_url_val = ""
                            path_regex_pattern = re.compile(f"({re.escape(page_param)})(\\d+)")
                            modified_path = path_regex_pattern.sub(lambda m: f"{m.group(1)}{next_page_num_val}", original_path)

                            if modified_path != original_path:
                                next_url_parts = list(parsed_url_obj); next_url_parts[2] = modified_path
                                next_url_val = urlunparse(next_url_parts)
                            else:
                                query_dict = parse_qs(parsed_url_obj.query)
                                query_dict[page_param] = [str(next_page_num_val)]
                                new_query_str = urlencode(query_dict, doseq=True)
                                next_url_parts = list(parsed_url_obj); next_url_parts[4] = new_query_str
                                next_url_val = urlunparse(next_url_parts)
                            
                            logger.info(f"Navigating to next page (URL Param): {next_url_val}")
                            self.driver.get(next_url_val)
                            current_url = self.driver.current_url
                            nav_success = True
                        
                        elif pagination_type == "Next Button":
                            # ... (Next button logic as before) ...
                            final_selector = next_button_selector or "li.next a, a.next, button.next, button[aria-label*='next' i], a[aria-label*='next' i], li.pagination-next a"
                            find_by = By.XPATH if final_selector.startswith(("//", "(//")) else By.CSS_SELECTOR
                            logger.info(f"Looking for next button using {find_by}: {final_selector}")
                            next_button = WebDriverWait(self.driver, 20).until(EC.element_to_be_clickable((find_by, final_selector)))
                            if not next_button.is_displayed(): self.driver.execute_script("arguments[0].scrollIntoView(true);", next_button); time.sleep(1)
                            next_button.click()
                            WebDriverWait(self.driver, 20).until(EC.presence_of_element_located((By.CSS_SELECTOR, container_selector)))
                            current_url = self.driver.current_url
                            nav_success = True

                        if nav_success:
                            logger.info(f"Navigated to page {page + 1}. New URL: {current_url}. Waiting...")
                            if not cancellable_sleep(random.uniform(2, 4)):
                                logger.info("Paginated page load wait cancelled.")
                                break 
                        else: # Should not happen if logic is correct, but as a fallback
                            logger.error("Navigation logic did not set nav_success.")
                            accumulated_errors.append(f"Page {page + 1}: Navigation logic error.")
                            break


                    except Exception as e:
                        err_msg = f"Error navigating to page {page + 1} from {current_url}: {str(e)}"
                        logger.error(err_msg)
                        accumulated_errors.append(err_msg)
                        break # Fatal error for pagination

                    if not scraper_should_run: break
                    logger.info(f"Inter-page delay after page {page}...")
                    if not cancellable_sleep(random.uniform(self.delay, self.delay + 2)):
                        logger.info("Inter-page delay cancelled.")
                        break
            # End of for loop

            final_df = pd.DataFrame()
            if all_data:
                final_df = pd.concat(all_data, ignore_index=True)
                final_df = final_df.dropna(how='all').reset_index(drop=True)
                logger.info(f"Total records scraped from pagination: {len(final_df)}")
            
            final_error_message = "; ".join(accumulated_errors) if accumulated_errors else None
            if not scraper_should_run and not final_error_message: # Cancelled, no other specific error
                final_error_message = "Pagination process was cancelled."
            
            if final_df.empty and not all_data and not final_error_message: # No data, no errors, not cancelled
                 final_error_message = "No data collected during pagination (pages might be empty or selectors didn't match)."

            return final_df, final_error_message

        except Exception as e: # Catch-all for the entire method
            err_msg = f"Major error in pagination scraping for {url}: {str(e)}"
            logger.error(err_msg)
            # Return any data collected so far along with the major error
            partial_df = pd.DataFrame()
            if all_data:
                partial_df = pd.concat(all_data, ignore_index=True).dropna(how='all').reset_index(drop=True)
            return partial_df, err_msg
        finally:
            if self.driver:
                logger.info("Closing WebDriver in scrape_dynamic_with_pagination.")
                self.driver.quit()
                self.driver = None

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
    scroll_to_end_page: bool = False, # Added
    next_button_selector: Optional[str] = None
):
    """
    Scrapes dynamic data from multiple pages using pagination.
    This is a top-level wrapper function.
    """
    global scraper_should_run # Required by set_scraper_status and get_scraper_status
    set_scraper_status(True)
    logger.info(f"Starting dynamic scrape with pagination for URL: {url}, Pages: {start_page}-{end_page}")
    
    # Instantiate DynamicWebScraper
    scraper = DynamicWebScraper(timeout=30) 
    
    df_results = pd.DataFrame() # Initialize
    error_message = None # Initialize

    try:
        if not scraper_should_run: # Early exit if cancelled before starting
            logger.info(f"Scraping (pagination) for {url} cancelled before starting.")
            return pd.DataFrame(), "Scraping cancelled before starting."

        # scrape_dynamic_with_pagination class method now returns (DataFrame, error_msg_or_None)
        df_results, error_message = scraper.scrape_dynamic_with_pagination(
            url=url,
            container_selector=container_selector,
            custom_fields=custom_fields,
            start_page=start_page,
            end_page=end_page,
            pagination_type=pagination_type,
            page_param=page_param,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls,
            scroll_to_end_page=scroll_to_end_page,
            next_button_selector=next_button_selector
        )
        
        if error_message:
            # Log the error message received from the scraping process
            logger.warning(f"Pagination scraping for {url} completed with message: '{error_message}'. Records found: {len(df_results) if df_results is not None else 0}.")
        elif not get_scraper_status() and not error_message: # Cancelled, but no specific error from scraper method
            error_message = "Scraping (pagination) was cancelled during operation."
            logger.info(error_message)
        else: # Success and not cancelled
            logger.info(f"Dynamic scrape with pagination complete for {url}. Found {len(df_results) if df_results is not None else 0} records.")
            
        # df_results can be an empty DataFrame if no data was found or an error occurred early.
        # error_message will contain details if something went wrong or if cancelled.
        return df_results if df_results is not None else pd.DataFrame(), error_message

    except Exception as e:
        # Catch-all for unexpected errors in this wrapper function's logic
        unhandled_error_msg = f"Unhandled exception in top-level scrape_dynamic_with_pagination for {url}: {str(e)}"
        logger.error(unhandled_error_msg)
        # Return empty DataFrame and the error
        return pd.DataFrame(), unhandled_error_msg
    # The class method's finally block handles driver cleanup.


def scrape_dynamic_data(
    url: str,
    container_selector: str,
    custom_fields: list,
    enable_scrolling: bool = False,
    max_scrolls: int = 5,
    scroll_to_end_page: bool = False # Added
):
    """
    Scrapes dynamic data from the given URL using the provided container selector and custom fields.
    Returns a list of dicts (one per container).
    """
    global scraper_should_run
    set_scraper_status(True) # Reset flag for new scrape
    logging.info(f"Starting dynamic scrape for URL: {url}")
    scraper = DynamicWebScraper(timeout=30)  # Increased timeout to 30 seconds
    # df = pd.DataFrame() # Not needed here, scrape_dynamic_page returns df
    
    driver_setup_error = None
    try:
        if not scraper_should_run:
            logger.info("Scraping cancelled before starting.")
            return [], "Scraping cancelled before starting."
        
        # Attempt to setup driver
        try:
            if not scraper.setup_driver(): # setup_driver now returns True on success, or raises exception
                 driver_setup_error = "Failed to setup driver (setup_driver returned False or None)."
                 logger.error(driver_setup_error)
                 # No return here, finally block will handle driver
        except Exception as e:
            driver_setup_error = f"Exception during scraper.setup_driver(): {e}"
            logger.error(driver_setup_error)
            # No return here, finally block will handle driver

        if driver_setup_error:
            return [], driver_setup_error

        # Check cancellation status *after* driver setup attempt
        if not scraper_should_run:
            logger.info("Scraping cancelled after driver setup.")
            return [], "Scraping cancelled after driver setup."
        
        # Ensure driver is available
        if not scraper.driver:
             # This case should ideally be caught by setup_driver errors
             no_driver_error = "Driver not available after setup attempt for dynamic scrape."
             logger.error(no_driver_error)
             return [], no_driver_error

        # scrape_dynamic_page now returns (df, error_msg)
        df, error_msg = scraper.scrape_dynamic_page(
            url,
            container_selector,
            custom_fields,
            enable_scrolling=enable_scrolling,
            max_scrolls=max_scrolls,
            scroll_to_end_page=scroll_to_end_page
        )

        if error_msg:
            # An error occurred in _make_dynamic_request or _process_dynamic_page_data
            logger.error(f"Dynamic scrape for {url} failed. Error: {error_msg}")
            return [], error_msg # df might be empty or partial, return empty list for data

        # Convert DataFrame to list of dicts for JSON serialization
        logging.info(f"Dynamic scrape complete. Found {len(df)} records.")
        return df.to_dict(orient="records"), None # Success
    
    except Exception as e: # Catch-all for unexpected errors in this function's logic
        unhandled_error_msg = f"Unhandled exception in scrape_dynamic_data: {str(e)}"
        logger.error(unhandled_error_msg)
        return [], unhandled_error_msg
    finally:
        if scraper.driver:
            logger.info("Ensuring WebDriver is closed in scrape_dynamic_data.")
            scraper.driver.quit()
            scraper.driver = None
