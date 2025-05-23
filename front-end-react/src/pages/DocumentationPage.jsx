import React from 'react';

function DocumentationPage() {
  const Section = ({ title, children }) => (
    <section className="mb-12 bg-slate-800 p-8 rounded-lg shadow-xl">
      <h2 className="text-3xl font-semibold mb-6 text-sky-400 border-b border-slate-700 pb-3">{title}</h2>
      <div className="space-y-4 text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  );

  const CodeBlock = ({ children }) => (
    <pre className="bg-slate-900 p-4 rounded-md overflow-x-auto text-sm text-slate-200 my-4">
      <code>{children}</code>
    </pre>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="text-center mb-16">
        <h1 className="text-5xl font-bold">Tool Documentation</h1>
        <p className="text-xl text-slate-300 mt-2">Your guide to mastering our web scraper.</p>
      </header>

      <div className="max-w-4xl mx-auto">
        <Section title="Getting Started">
          <p>Welcome to the Web Scraper documentation. This tool allows you to extract data from websites using two main methods: Static Scraping and Dynamic Scraping.</p>
        </Section>

        <Section title="Static Scraping">
          <p>Static scraping is ideal for websites where content is directly embedded in the HTML and does not require JavaScript to load. It's faster and less resource-intensive.</p>
          <h3 className="text-xl font-semibold mt-6 mb-2 text-slate-100">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to the "Scraper Tool" page.</li>
            <li>In the "Static Scraper" section, enter the full URL of the target webpage.</li>
            <li>Click the "Scrape" button.</li>
            <li>The scraper will fetch the page content. If successful, the extracted data (usually the page title and meta description by default) will be displayed.</li>
          </ol>
          <p className="mt-4">Currently, the static scraper provides a basic extraction. Future enhancements will allow specifying selectors for more targeted static data extraction.</p>
        </Section>

        <Section title="Dynamic Scraping">
          <p>Dynamic scraping is used for websites where content is loaded or modified by JavaScript after the initial page load. This method uses a headless browser to render the page fully before extracting data.</p>
          <h3 className="text-xl font-semibold mt-6 mb-2 text-slate-100">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Navigate to the "Scraper Tool" page.</li>
            <li>In the "Dynamic Scraper" section, enter the full URL of the target webpage.</li>
            <li>Enter the "Container CSS Selector". This selector should target the repeating elements on the page that contain the data you want to extract (e.g., product cards on an e-commerce site).</li>
            <li>Define the "Fields to Extract":
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>For each piece of data you want from within a container, click "Add Field".</li>
                <li>Provide a "Field name" (e.g., "productName", "price").</li>
                <li>Provide a "CSS selector" relative to the container selector (e.g., "h2.title", ".product-price span").</li>
              </ul>
            </li>
            <li>Optionally, enable "Enable Scrolling" if the content loads as you scroll down the page. You can set "Max Scrolls" to limit how many times the scraper will scroll.</li>
            <li>Click the "Scrape" button.</li>
            <li>Results will be displayed in a table and can be downloaded as JSON.</li>
          </ol>
        </Section>

        <Section title="Understanding CSS Selectors">
          <p>CSS selectors are patterns used to select HTML elements. Effective use of selectors is crucial for accurate data extraction.</p>
          <h3 className="text-xl font-semibold mt-6 mb-2 text-slate-100">Common Selector Types:</h3>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Tag Name:</strong> Selects all elements with that tag (e.g., <CodeBlock>h1</CodeBlock>, <CodeBlock>p</CodeBlock>, <CodeBlock>div</CodeBlock>).</li>
            <li><strong>Class Name:</strong> Selects elements with a specific class (e.g., <CodeBlock>.product-title</CodeBlock>, <CodeBlock>.price</CodeBlock>). Preceded by a dot (.).</li>
            <li><strong>ID:</strong> Selects a single element with a specific ID (e.g., <CodeBlock>#main-content</CodeBlock>). Preceded by a hash (#). IDs should be unique on a page.</li>
            <li><strong>Attribute Selector:</strong> Selects elements with a specific attribute or attribute value (e.g., <CodeBlock>[data-id="123"]</CodeBlock>, <CodeBlock>a[href^="https://"]</CodeBlock>).</li>
            <li><strong>Descendant Combinator:</strong> Selects elements that are descendants of another element (e.g., <CodeBlock>.container .item-name</CodeBlock> selects elements with class <CodeBlock>item-name</CodeBlock> that are inside an element with class <CodeBlock>container</CodeBlock>).</li>
            <li><strong>Child Combinator:</strong> Selects elements that are direct children of another element (e.g., <CodeBlock>ul {'>'} li</CodeBlock>).</li>
          </ul>
          <p className="mt-4">You can use your browser's developer tools (usually by right-clicking an element and selecting "Inspect") to find appropriate CSS selectors.</p>
        </Section>

        <Section title="Troubleshooting">
          <h3 className="text-xl font-semibold mt-6 mb-2 text-slate-100">Common Issues:</h3>
          <ul className="list-disc list-inside space-y-3">
            <li>
              <strong>No Data Extracted / Incorrect Data:</strong>
              <ul className="list-circle list-inside ml-6 mt-1 space-y-1">
                <li>Double-check your CSS selectors. They might be incorrect or too broad/narrow.</li>
                <li>The website might be heavily reliant on JavaScript, and you might need to use the Dynamic Scraper with appropriate selectors.</li>
                <li>The website structure might have changed since you last checked.</li>
                <li>Ensure the container selector for dynamic scraping correctly targets the repeating parent elements.</li>
              </ul>
            </li>
            <li>
              <strong>"Failed to fetch" Error:</strong>
              <ul className="list-circle list-inside ml-6 mt-1 space-y-1">
                <li>Ensure the URL is correct and accessible.</li>
                <li>The website might be blocking automated requests (check for CAPTCHAs or IP blocks).</li>
                <li>There might be network connectivity issues.</li>
              </ul>
            </li>
            <li>
              <strong>Dynamic Scraper Timeout / Slow Performance:</strong>
              <ul className="list-circle list-inside ml-6 mt-1 space-y-1">
                <li>The target website might be very slow or resource-intensive.</li>
                <li>If using scrolling, try reducing the "Max Scrolls" value.</li>
              </ul>
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

export default DocumentationPage;
