import React from "react";
import Results from "./Results";
import FieldRow from "./FieldRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useScraperForm } from "../contexts/ScraperFormContext";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DynamicScraper() {
  const { 
    formData, 
    setFormData, 
    scrapeOperation, 
    startScrapeOperation, 
    setScrapeOperationSuccess, 
    setScrapeOperationError,
    setScrapeOperationCancelled,
    updateTaskId 
  } = useScraperForm();

  const { isLoadingScrape, scrapeResults, scrapeError, lastOperationKey, taskId } = scrapeOperation;

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
    const operationKey = Date.now().toString(); // Unique key for this operation
    startScrapeOperation('dynamic', operationKey);

    try {
      const payload = {
        url: formData.dynamicUrl,
        container_selector: formData.dynamicContainerSelector,
        custom_fields: formData.dynamicFields.filter(f => f.name && f.selector).map(f => ({ ...f, name: f.name.trim() })),
        enable_scrolling: formData.dynamicEnableScrolling,
        max_scrolls: Number(formData.dynamicMaxScrolls),
        // Pagination fields
        enable_pagination: formData.dynamicEnablePagination,
        start_page: Number(formData.dynamicStartPage),
        end_page: Number(formData.dynamicEndPage),
        pagination_type: formData.dynamicPaginationType,
        page_param: formData.dynamicPageParam,
        next_button_selector: formData.dynamicNextButtonSelector,
      };
      const res = await fetch(`${API_URL}/scrape-dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json(); // Try to parse JSON regardless of res.ok
      
      if (!res.ok) {
        // Use detail from responseData if available, otherwise default error
        const errorMessage = responseData?.detail || `Failed to fetch: ${res.statusText} (Status: ${res.status})`;
        throw new Error(errorMessage);
      }
      
      if (responseData.task_id) {
        updateTaskId(operationKey, responseData.task_id);
      }
      setScrapeOperationSuccess(operationKey, responseData);
      toast.success("Dynamic scrape completed successfully!");

    } catch (err) {
      setScrapeOperationError(operationKey, "Error: " + err.message);
      toast.error("Dynamic scrape failed: " + err.message);
    }
  };

  const handleCancel = async () => {
    if (!taskId || !lastOperationKey) {
      toast.error("No active scrape operation to cancel or task ID missing.");
      setScrapeOperationCancelled(lastOperationKey || 'unknown_op_key'); // Attempt to update UI even if key is missing
      return;
    }
    
    console.log(`Cancel button clicked for task: ${taskId}`);
    try {
      const res = await fetch(`${API_URL}/cancel-task/${taskId}`, { method: "POST" });
      const data = await res.json(); // Try to parse JSON regardless of res.ok

      if (!res.ok) {
        const errorMessage = data?.detail || `Failed to send cancel signal: ${res.statusText}`;
        throw new Error(errorMessage);
      }
      
      console.log("Cancel signal response:", data);
      toast.success(data.message || "Scrape cancellation request sent.");
      setScrapeOperationCancelled(lastOperationKey);
    } catch (err) {
      console.error("Error sending cancel signal:", err);
      toast.error("Error trying to cancel: " + err.message);
      // Still mark as cancelled in UI to stop loading spinner, backend might eventually timeout
      setScrapeOperationCancelled(lastOperationKey);
    }
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

        {/* Pagination Controls */}
        <div className="space-y-4 p-4 border border-slate-700 rounded-md">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enable-pagination"
              checked={formData.dynamicEnablePagination}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, dynamicEnablePagination: checked }))}
              className="border-slate-600 data-[state=checked]:bg-sky-600 data-[state=checked]:text-white"
            />
            <Label htmlFor="enable-pagination" className="text-slate-300">Enable Pagination</Label>
          </div>

          {formData.dynamicEnablePagination && (
            <div className="space-y-4 pl-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-page" className="text-slate-300">Start Page</Label>
                  <Input
                    id="start-page"
                    type="number"
                    min="1"
                    value={formData.dynamicStartPage}
                    onChange={e => setFormData(prev => ({ ...prev, dynamicStartPage: parseInt(e.target.value, 10) || 1 }))}
                    className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <Label htmlFor="end-page" className="text-slate-300">End Page</Label>
                  <Input
                    id="end-page"
                    type="number"
                    min={formData.dynamicStartPage || 1}
                    value={formData.dynamicEndPage}
                    onChange={e => setFormData(prev => ({ ...prev, dynamicEndPage: parseInt(e.target.value, 10) || (formData.dynamicStartPage || 1) }))}
                    className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pagination-type" className="text-slate-300">Pagination Type</Label>
                <select
                  id="pagination-type"
                  value={formData.dynamicPaginationType}
                  onChange={e => setFormData(prev => ({ ...prev, dynamicPaginationType: e.target.value }))}
                  className="mt-1 block w-full bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500 rounded-md shadow-sm p-2"
                >
                  <option value="Next Button">Next Button</option>
                  <option value="URL Parameter">URL Parameter</option>
                </select>
              </div>
              {formData.dynamicPaginationType === "URL Parameter" && (
                <div>
                  <Label htmlFor="page-param" className="text-slate-300">Page Parameter Name</Label>
                  <Input
                    id="page-param"
                    type="text"
                    value={formData.dynamicPageParam}
                    onChange={e => setFormData(prev => ({ ...prev, dynamicPageParam: e.target.value }))}
                    placeholder="e.g., page, p, pg"
                    className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              )}
              {formData.dynamicPaginationType === "Next Button" && (
                <div>
                  <Label htmlFor="next-button-selector" className="text-slate-300">Next Button Selector (CSS or XPath)</Label>
                  <Input
                    id="next-button-selector"
                    type="text"
                    value={formData.dynamicNextButtonSelector}
                    onChange={e => setFormData(prev => ({ ...prev, dynamicNextButtonSelector: e.target.value }))}
                    placeholder="e.g., .pagination-next a, //button[text()='Next']"
                    className="mt-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              )}
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
          disabled={isLoadingScrape || !formData.dynamicUrl || !formData.dynamicContainerSelector || formData.dynamicFields.some(f => !f.name || !f.selector)}
          className="w-full bg-sky-600 hover:bg-sky-700"
        >
          {isLoadingScrape ? "Scraping..." : "Scrape"}
        </Button>
        {isLoadingScrape && (
          <Button
            type="button"
            onClick={handleCancel}
            variant="destructive"
            className="w-full mt-2"
          >
            Cancel Scraping
          </Button>
        )}
      </form>
      {scrapeError && <div className="mt-4 text-red-400 bg-red-900/30 p-3 rounded-md">{scrapeError}</div>}
      {scrapeResults && <Results data={scrapeResults.results || scrapeResults} fieldOrder={fieldOrder.length > 0 ? fieldOrder : null} taskId={scrapeResults.task_id} />}
    </section>
  );
}
