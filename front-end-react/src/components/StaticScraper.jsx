import React from "react";
import Results from "./Results";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useScraperForm } from "../contexts/ScraperFormContext";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function StaticScraper() {
  const { 
    formData, 
    setFormData, 
    scrapeOperation, 
    startScrapeOperation, 
    setScrapeOperationSuccess, 
    setScrapeOperationError,
    updateTaskId // Added updateTaskId, though static scrapes might not have cancellable tasks yet
  } = useScraperForm();

  const { isLoadingScrape, scrapeResults, scrapeError } = scrapeOperation;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const operationKey = Date.now().toString(); // Unique key for this operation
    // Static scrapes currently don't have a task_id from the backend for cancellation
    // If they did, it would be passed here or updated via updateTaskId
    startScrapeOperation('static', operationKey); 

    try {
      const res = await fetch(`${API_URL}/scrape?url=${encodeURIComponent(formData.staticUrl)}`);
      
      const responseData = await res.json(); // Try to parse JSON regardless of res.ok

      if (!res.ok) {
        const errorMessage = responseData?.detail || `Failed to fetch: ${res.statusText} (Status: ${res.status})`;
        throw new Error(errorMessage);
      }
      
      // If static scrapes were to return a task_id:
      // if (responseData.task_id) {
      //   updateTaskId(operationKey, responseData.task_id);
      // }

      setScrapeOperationSuccess(operationKey, responseData);
      toast.success("Static scrape completed successfully!");

    } catch (err) {
      setScrapeOperationError(operationKey, "Error: " + err.message);
      toast.error("Static scrape failed: " + err.message);
    }
  };

  // Static scraper doesn't have a cancel button in this version,
  // but if it did, it would be similar to DynamicScraper's handleCancel

  return (
    <section className="p-6 bg-slate-800 rounded-lg shadow-md my-8">
      <h2 className="text-2xl font-semibold text-white mb-4">Static Scraper</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="static-url" className="text-slate-300">URL</Label>
          <Input
            id="static-url"
            type="text"
            value={formData.staticUrl}
            onChange={e => setFormData(prev => ({ ...prev, staticUrl: e.target.value }))}
            placeholder="https://example.com"
            required
            className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoadingScrape || !formData.staticUrl} 
          className="w-full bg-sky-600 hover:bg-sky-700"
        >
          {isLoadingScrape ? "Scraping..." : "Scrape"}
        </Button>
      </form>
      {scrapeError && scrapeOperation.scrapeType === 'static' && (
        <div className="mt-4 text-red-400 bg-red-900/30 p-3 rounded-md">{scrapeError}</div>
      )}
      {scrapeResults && scrapeOperation.scrapeType === 'static' && (
        <Results data={scrapeResults.results || scrapeResults} taskId={scrapeResults.task_id} />
      )}
    </section>
  );
}
