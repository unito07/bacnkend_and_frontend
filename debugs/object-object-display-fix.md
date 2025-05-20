# [object Object] display in UI

## Description
The scraped data was being displayed as `[object Object], [object Object], ...` in the UI. This indicated that the `Results` component was not correctly rendering the data.

## Solution
The `scrape_dynamic_data` function in `backend-web-scrapper/dynamic_web_scrapper.py` was modified to return the Pandas DataFrame directly instead of converting it to a list of dictionaries using `to_dict(orient="records")`.
