import React, { useState } from "react";
import Results from "./Results";
import FieldRow from "./FieldRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useScraperForm } from "../contexts/ScraperFormContext"; // Import the hook

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DynamicScraper() {
  const { formData, setFormData } = useScraperForm(); // Use the context
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFieldChange = (idx, key, value) => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: prev.dynamicFields.map((f, i) => (i === idx ? { ...f, [key]: value } : f)),
    }));
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: [...prev.dynamicFields, { name: "", selector: "" }],
    }));
  };

  const removeField = idx => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: prev.dynamicFields.length > 1 ? prev.dynamicFields.filter((_, i) => i !== idx) : prev.dynamicFields,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        url: formData.dynamicUrl,
        container_selector: formData.dynamicContainerSelector,
        custom_fields: formData.dynamicFields.filter(f => f.name && f.selector).map(f => ({ ...f, name: f.name.trim() })),
        enable_scrolling: formData.dynamicEnableScrolling,
        max_scrolls: Number(formData.dynamicMaxScrolls)
      };
      const res = await fetch(`${API_URL}/scrape-dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Error: " + err.message);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    console.log("Cancel button clicked");
    try {
      const res = await fetch(`${API_URL}/stop-scraper`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to send stop signal: ${res.statusText}`);
      const data = await res.json();
      console.log("Stop signal response:", data);
      setError("Scraping process cancelled by user.");
    } catch (err) {
      console.error("Error sending stop signal:", err);
      setError("Error trying to cancel: " + err.message + ". Scraper might still be running.");
    }
    setLoading(false); // Ensure loading is set to false
  };

  const fieldOrder = formData.dynamicFields.filter(f => f.name && f.selector).map(f => f.name.trim());

  return (
    <section className="p-6 bg-slate-800 rounded-lg shadow-md my-8">
      <h2 className="text-2xl font-semibold text-white mb-4">Dynamic Scraper</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="dynamic-url" className="text-slate-300">URL</Label>
          <Input
            id="dynamic-url"
            type="text"
            value={formData.dynamicUrl}
            onChange={e => setFormData(prev => ({ ...prev, dynamicUrl: e.target.value }))}
            placeholder="https://example.com"
            required
            className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div>
          <Label htmlFor="container-selector" className="text-slate-300">Container CSS Selector</Label>
          <Input
            id="container-selector"
            type="text"
            value={formData.dynamicContainerSelector}
            onChange={e => setFormData(prev => ({ ...prev, dynamicContainerSelector: e.target.value }))}
            placeholder=".item-container"
            required
            className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-scrolling"
              checked={formData.dynamicEnableScrolling}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, dynamicEnableScrolling: checked }))}
              className="border-slate-600 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white"
            />
            <Label htmlFor="enable-scrolling" className="text-slate-300">Enable Scrolling</Label>
          </div>
          {formData.dynamicEnableScrolling && (
            <div>
              <Label htmlFor="max-scrolls" className="text-slate-300">Max Scrolls</Label>
              <Input
                id="max-scrolls"
                type="number"
                min="1"
                value={formData.dynamicMaxScrolls}
                onChange={e => setFormData(prev => ({ ...prev, dynamicMaxScrolls: parseInt(e.target.value, 10) || 1 }))}
                className="mt-1 w-24 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          )}
        </div>
        <div>
          <Label className="text-slate-300 mb-2 block">Fields to Extract</Label>
          <div className="space-y-3">
            {formData.dynamicFields.map((field, idx) => (
              <FieldRow
                key={idx}
                name={field.name}
                selector={field.selector}
                onChange={(key, value) => handleFieldChange(idx, key, value)}
                onRemove={() => removeField(idx)}
                canRemove={formData.dynamicFields.length > 1}
              />
            ))}
          </div>
          <Button type="button" onClick={addField} variant="outline" className="mt-3 border-sky-600 text-sky-400 hover:bg-sky-700/20 hover:text-sky-300">
            Add Field
          </Button>
        </div>
        <Button
          type="submit"
          disabled={loading || !formData.dynamicUrl || !formData.dynamicContainerSelector || formData.dynamicFields.some(f => !f.name || !f.selector)}
          className="w-full bg-sky-600 hover:bg-sky-700"
        >
          {loading ? "Scraping..." : "Scrape"}
        </Button>
        {loading && (
          <Button
            type="button"
            onClick={handleCancel}
            variant="destructive" // Uses the destructive variant for red styling
            className="w-full mt-2" // Added margin top for spacing
          >
            Cancel Scraping
          </Button>
        )}
      </form>
      {error && <div className="mt-4 text-red-400 bg-red-900/30 p-3 rounded-md">{error}</div>}
      {result && <Results data={result} fieldOrder={fieldOrder.length > 0 ? fieldOrder : null} />}
    </section>
  );
}
