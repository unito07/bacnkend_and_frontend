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
from selenium_stealth import stealth
import pandas as pd
import logging
import random
import os
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

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
                # Scroll down to bottom
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                logger.info(f"Performed scroll {scroll_count + 1}/{max_scrolls}")

                # Wait for new content to load
                time.sleep(self.scroll_pause_time)
                logger.info(f"Waited {self.scroll_pause_time} seconds for content to load")

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
        try:
            logger.info(f"Making dynamic request to {url}")
            if not self.driver:
                logger.info("WebDriver not initialized. Initializing now...")
                self.setup_driver()

            self.driver.get(url)
            logger.info("Waiting for page to fully load...")
            time.sleep(random.uniform(5, 8))  # Increased wait time for JavaScript execution

            if enable_scrolling:
                logger.info("Scrolling enabled, starting scroll process...")
                self._scroll_page(max_scrolls)

            return True
        except Exception as e:
            logger.error(f"Failed to load URL dynamically: {str(e)}")
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
        try:
            logger.info(f"Starting dynamic scrape for URL: {url}")
            if self._make_dynamic_request(url, enable_scrolling, max_scrolls):
                return self._process_dynamic_page_data(container_selector, custom_fields)
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"Error in dynamic page scraping: {str(e)}")
            return pd.DataFrame()

    def scrape_dynamic_with_pagination(self, url, container_selector, custom_fields, 
                                     start_page, end_page, pagination_type, page_param=None, 
                                     session_id=None, enable_scrolling=False, max_scrolls=5,
                                     next_button_selector=None):
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
            time.sleep(random.uniform(2, 4))  # Initial page load

            for page in range(start_page, end_page + 1):
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
                    if pagination_type == "URL Parameter":
                        # URL parameter pagination logic remains unchanged
                        base_url = url.split('?')[0]
                        params = {}
                        if '?' in url:
                            query_string = url.split('?')[1]
                            for param in query_string.split('&'):
                                if '=' in param:
                                    key, value = param.split('=')
                                    if not key.endswith('page'):
                                        params[key] = value

                        params[page_param] = str(page + 1)
                        next_url = base_url + '?' + '&'.join([f"{k}={v}" for k, v in params.items()])

                        logger.info(f"Navigating to next page: {next_url}")
                        self.driver.get(next_url)
                        time.sleep(random.uniform(2, 4))  # Wait for page load

                    elif pagination_type == "Next Button":
                        try:
                            logger.info(f"Looking for next button using XPath: {next_button_selector}")
                            selector = next_button_selector or "//li[contains(@class,'pagination-next')]//a[text()='Next']"
                            next_button = WebDriverWait(self.driver, 20).until(
                                EC.element_to_be_clickable((By.XPATH, selector))
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
                                EC.presence_of_element_located((By.CSS_SELECTOR, container_selector))
                            )

                            time.sleep(2)  # Wait for any animations to complete

                        except Exception as e:
                            logger.error(f"Error navigating to next page: {str(e)}")
                            break

                time.sleep(random.uniform(self.delay, self.delay + 2))

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
    logging.info(f"Starting dynamic scrape for URL: {url}")
    scraper = DynamicWebScraper(timeout=30)  # Increased timeout to 30 seconds
    df = scraper.scrape_dynamic_page(
        url,
        container_selector,
        custom_fields,
        enable_scrolling=enable_scrolling,
        max_scrolls=max_scrolls
    )
    # Convert DataFrame to list of dicts for JSON serialization
    logging.info(f"Dynamic scrape complete. Found {len(df)} records.")
    return df
