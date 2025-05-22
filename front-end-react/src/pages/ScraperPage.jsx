import React from 'react';
import StaticScraper from '../components/StaticScraper';
import DynamicScraper from '../components/DynamicScraper';

function ScraperPage() {
  return (
    <div>
      <h1>Web Scraper Tool</h1>
      <StaticScraper />
      <DynamicScraper />
    </div>
  );
}

export default ScraperPage;
