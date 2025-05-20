import React, { useState } from "react";
import Results from "./Results";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function StaticScraper() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/scrape?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <section>
      <h2>Static Scraper</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="static-url">URL</label>
        <input
          id="static-url"
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
        />
        <button type="submit" disabled={loading || !url}>
          {loading ? "Scraping..." : "Scrape"}
        </button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {result && <Results data={result} />}
    </section>
  );
}
