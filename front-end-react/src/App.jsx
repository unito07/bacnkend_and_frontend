import React from "react";
import StaticScraper from "./components/StaticScraper";
import DynamicScraper from "./components/DynamicScraper";

export default function App() {
  return (
    <main>
      <h1>Web Scraper</h1>
      <StaticScraper />
      <DynamicScraper />
    </main>
  );
}
