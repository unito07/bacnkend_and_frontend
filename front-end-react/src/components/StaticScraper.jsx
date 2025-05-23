import React, { useState } from "react";
import Results from "./Results";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <section className="p-6 bg-slate-800 rounded-lg shadow-md my-8">
      <h2 className="text-2xl font-semibold text-white mb-4">Static Scraper</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="static-url" className="text-slate-300">URL</Label>
          <Input
            id="static-url"
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <Button type="submit" disabled={loading || !url} className="w-full bg-sky-600 hover:bg-sky-700">
          {loading ? "Scraping..." : "Scrape"}
        </Button>
      </form>
      {error && <div className="mt-4 text-red-400 bg-red-900/30 p-3 rounded-md">{error}</div>}
      {result && <Results data={result} />}
    </section>
  );
}
