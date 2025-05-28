import React from "react";
import Results from "./Results";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      // Display success toast before updating state, similar to DynamicScraper
      toast.success("Static scrape completed successfully!");
      setScrapeOperationSuccess(operationKey, responseData);

    } catch (err) {
      setScrapeOperationError(operationKey, "Error: " + err.message);
      toast.error("Static scrape failed: " + err.message);
    }
  };

  // Static scraper doesn't have a cancel button in this version,
  // but if it did, it would be similar to DynamicScraper's handleCancel

  return (
    <Card className="w-full bg-[var(--card)] border-[var(--border)] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-[var(--accent)]">Static Scraper</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="static-url" className="text-lg text-[var(--muted-foreground)]">URL</Label>
            <Input
              id="static-url"
              type="text"
              value={formData.staticUrl}
              onChange={e => setFormData(prev => ({ ...prev, staticUrl: e.target.value }))}
              placeholder="https://example.com"
              required
              className="mt-2 text-lg p-3 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoadingScrape || !formData.staticUrl} 
            className="w-full text-lg py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-md hover:shadow-[0_0_15px_var(--primary)] transition-all duration-300 ease-in-out"
          >
            {isLoadingScrape ? "Scraping..." : "Scrape Static URL"}
          </Button>
        </form>
        {scrapeError && scrapeOperation.scrapeType === 'static' && (
          <div className="mt-6 text-[var(--destructive-foreground)] bg-[var(--destructive)]/30 p-4 rounded-md border border-[var(--destructive)]">
            <p className="font-semibold">Error:</p>
            <p>{scrapeError}</p>
          </div>
        )}
        {scrapeResults && scrapeOperation.scrapeType === 'static' && (
          <div className="mt-6">
            <Results data={scrapeResults.results || scrapeResults} taskId={scrapeResults.task_id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
