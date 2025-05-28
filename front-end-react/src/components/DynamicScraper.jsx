import React from "react";
import Results from "./Results";
import FieldRow from "./FieldRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NeonCheckbox } from "@/components/ui/animated-check-box";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useScraperForm } from "../contexts/ScraperFormContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Assuming cn utility is available for class merging

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
      
      // Display success toast unconditionally before updating state
      toast.success("Dynamic scrape completed successfully!");
      setScrapeOperationSuccess(operationKey, responseData);

    } catch (err) {
      setScrapeOperationError(operationKey, "Error: " + err.message);
      toast.error("Dynamic scrape failed: " + err.message);
    }
  };

  const handleCancel = async () => {
    // lastOperationKey is crucial for updating the UI state correctly.
    // If it's missing, it implies no operation is currently tracked as active.
    if (!lastOperationKey) {
      toast.error("No active scrape operation to cancel.");
      // If lastOperationKey is null, there's likely nothing to update in the UI state
      // for cancellation as no operation key is tracked.
      return;
    }
    
    console.log(`Cancel button clicked for operation: ${lastOperationKey}`); // Log operation key
    try {
      // Call the /stop-scraper endpoint
      const res = await fetch(`${API_URL}/stop-scraper`, { method: "POST" });
      const data = await res.json(); // Try to parse JSON regardless of res.ok

      if (!res.ok) {
        const errorMessage = data?.detail || `Failed to send stop signal: ${res.statusText}`;
        throw new Error(errorMessage);
      }
      
      console.log("Stop signal response:", data);
      // The backend /stop-scraper returns {"status": "stop signal sent"}
      const stopMessage = data.status || "stop signal sent";
      toast.warning(`Scraping stopped: ${stopMessage}`); 
      setScrapeOperationCancelled(lastOperationKey); // Update UI state
    } catch (err) {
      console.error("Error sending stop signal:", err);
      toast.error("Error trying to stop scrape: " + err.message);
      // Still mark as cancelled in UI to stop loading spinner, 
      // as the backend might eventually stop or timeout.
      setScrapeOperationCancelled(lastOperationKey);
    }
  };

  const fieldOrder = formData.dynamicFields.filter(f => f.name && f.selector).map(f => f.name.trim());

  return (
    <Card className="w-full bg-[var(--card)] border-[var(--border)] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-[var(--accent)]">Dynamic Scraper</CardTitle>
        <CardDescription className="text-center text-[var(--muted-foreground)] pt-1">
          Configure advanced scraping for dynamic content and pagination.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <Label htmlFor="dynamic-url" className="text-lg text-[var(--muted-foreground)]">URL</Label>
            <Input
              id="dynamic-url"
              type="text"
              value={formData.dynamicUrl}
              onChange={e => setFormData(prev => ({ ...prev, dynamicUrl: e.target.value }))}
              placeholder="https://example.com"
              required
              className="mt-2 text-lg p-3 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
            />
          </div>
          <div>
            <Label htmlFor="container-selector" className="text-lg text-[var(--muted-foreground)]">Container CSS Selector</Label>
            <Input
              id="container-selector"
              type="text"
              value={formData.dynamicContainerSelector}
              onChange={e => setFormData(prev => ({ ...prev, dynamicContainerSelector: e.target.value }))}
              placeholder=".item-container"
              required
              className="mt-2 text-lg p-3 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
            />
          </div>
          
          {/* Scrolling Options */}
          <div className={cn(
            "rounded-lg border border-[var(--border)]/70 bg-[var(--background)] transition-all duration-300 ease-in-out",
            formData.dynamicEnableScrolling ? "shadow-[0_0_15px_var(--ring)]" : ""
          )}>
            <div 
              className={cn( // Keep styling for hover and active state, but remove direct onClick
                "flex items-center justify-between space-x-3 p-4 rounded-t-lg cursor-pointer hover:bg-[var(--muted)]/20 transition-colors",
                formData.dynamicEnableScrolling && "bg-[var(--muted)]/10 border-b border-[var(--border)]/30"
              )}
              // onClick is removed here. Interaction relies on Label htmlFor -> Checkbox onCheckedChange
            >
              <div className="flex items-center space-x-3">
                <NeonCheckbox
                  id="enable-scrolling"
                  checked={formData.dynamicEnableScrolling}
                  onChange={e => setFormData(prev => {
                    const baseState = (typeof prev === 'object' && prev !== null) ? prev : {};
                    return { 
                      ...baseState, 
                      dynamicEnableScrolling: e.target.checked 
                    };
                  })}
                  className="h-6 w-6 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                  aria-labelledby="enable-scrolling-label"
                />
                <Label 
                  id="enable-scrolling-label"
                  htmlFor="enable-scrolling" 
                  className={cn(
                    "text-lg font-medium cursor-pointer",
                    formData.dynamicEnableScrolling ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  )}
                >
                  Enable Scrolling
                </Label>
              </div>
              {formData.dynamicEnableScrolling ? <ChevronDown className="h-6 w-6 text-[var(--primary)]" /> : <ChevronRight className="h-6 w-6 text-[var(--muted-foreground)]" />}
            </div>
            {formData.dynamicEnableScrolling && (
              <div className="p-4 border-t border-[var(--border)]/70">
                <Label htmlFor="max-scrolls" className="text-base text-[var(--muted-foreground)] block mb-1">Max Scrolls</Label>
                <Input
                  id="max-scrolls"
                  type="number"
                  min="1"
                  value={formData.dynamicMaxScrolls}
                  onChange={e => setFormData(prev => ({ ...prev, dynamicMaxScrolls: parseInt(e.target.value, 10) || 1 }))}
                  className="w-28 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                />
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className={cn(
            "rounded-lg border border-[var(--border)]/70 bg-[var(--background)] transition-all duration-300 ease-in-out",
            formData.dynamicEnablePagination ? "shadow-[0_0_15px_var(--ring)]" : ""
          )}>
            <div 
              className={cn( // Keep styling for hover and active state, but remove direct onClick
                "flex items-center justify-between space-x-3 p-4 rounded-t-lg cursor-pointer hover:bg-[var(--muted)]/20 transition-colors",
                formData.dynamicEnablePagination && "bg-[var(--muted)]/10 border-b border-[var(--border)]/30"
              )}
              // onClick is removed here. Interaction relies on Label htmlFor -> Checkbox onCheckedChange
            >
              <div className="flex items-center space-x-3">
                <NeonCheckbox
                  id="enable-pagination"
                  checked={formData.dynamicEnablePagination}
                  onChange={e => setFormData(prev => {
                    const baseState = (typeof prev === 'object' && prev !== null) ? prev : {};
                    return { 
                      ...baseState, 
                      dynamicEnablePagination: e.target.checked 
                    };
                  })}
                  className="h-6 w-6 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                  aria-labelledby="enable-pagination-label"
                />
                <Label 
                  id="enable-pagination-label"
                  htmlFor="enable-pagination" 
                  className={cn(
                    "text-lg font-medium cursor-pointer",
                    formData.dynamicEnablePagination ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  )}
                >
                  Enable Pagination
                </Label>
              </div>
              {formData.dynamicEnablePagination ? <ChevronDown className="h-6 w-6 text-[var(--primary)]" /> : <ChevronRight className="h-6 w-6 text-[var(--muted-foreground)]" />}
            </div>

            {formData.dynamicEnablePagination && (
              <div className="space-y-4 p-4 border-t border-[var(--border)]/70">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <Label htmlFor="start-page" className="text-base text-[var(--muted-foreground)] block mb-1">Start Page</Label>
                    <Input
                      id="start-page"
                      type="number"
                      min="1"
                      value={formData.dynamicStartPage}
                      onChange={e => setFormData(prev => ({ ...prev, dynamicStartPage: parseInt(e.target.value, 10) || 1 }))}
                      className="text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-page" className="text-base text-[var(--muted-foreground)] block mb-1">End Page</Label>
                    <Input
                      id="end-page"
                      type="number"
                      min={formData.dynamicStartPage || 1}
                      value={formData.dynamicEndPage}
                      onChange={e => setFormData(prev => ({ ...prev, dynamicEndPage: parseInt(e.target.value, 10) || (formData.dynamicStartPage || 1) }))}
                      className="text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pagination-type" className="text-base text-[var(--muted-foreground)] block mb-1">Pagination Type</Label>
                  <Select
                    value={formData.dynamicPaginationType}
                    onValueChange={value => setFormData(prev => ({ ...prev, dynamicPaginationType: value }))}
                  >
                    <SelectTrigger 
                      id="pagination-type" 
                      className="w-full text-base bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md shadow-sm data-[placeholder]:text-[var(--muted-foreground)]/70"
                    >
                      <SelectValue placeholder="Select pagination type" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-[var(--popover)] text-[var(--popover-foreground)] border-[var(--border)]"
                    >
                      <SelectItem value="Next Button" className="text-base focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)]">Next Button</SelectItem>
                      <SelectItem value="URL Parameter" className="text-base focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)]">URL Parameter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.dynamicPaginationType === "URL Parameter" && (
                  <div>
                    <Label htmlFor="page-param" className="text-base text-[var(--muted-foreground)] block mb-1">Page Parameter Name</Label>
                    <Input
                      id="page-param"
                      type="text"
                      value={formData.dynamicPageParam}
                      onChange={e => setFormData(prev => ({ ...prev, dynamicPageParam: e.target.value }))}
                      placeholder="e.g., page, p, pg"
                      className="text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                    />
                  </div>
                )}
                {formData.dynamicPaginationType === "Next Button" && (
                  <div>
                    <Label htmlFor="next-button-selector" className="text-base text-[var(--muted-foreground)] block mb-1">Next Button Selector (CSS or XPath)</Label>
                    <Input
                      id="next-button-selector"
                      type="text"
                      value={formData.dynamicNextButtonSelector}
                      onChange={e => setFormData(prev => ({ ...prev, dynamicNextButtonSelector: e.target.value }))}
                      placeholder="e.g., .pagination-next a, //button[text()='Next']"
                      className="text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fields to Extract */}
          <div className="p-6 rounded-lg border border-[var(--border)]/70 bg-[var(--background)] space-y-4 shadow-[0_0_10px_var(--secondary)]">
            <Label className="text-xl font-semibold text-[var(--secondary)] mb-3 block">Fields to Extract</Label>
            <div className="space-y-4">
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
            <Button 
              type="button" 
              onClick={addField} 
              variant="outline" 
              className="mt-4 text-lg py-2.5 px-5 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/20 hover:text-[var(--accent)] rounded-md hover:shadow-[0_0_10px_var(--primary)] transition-all duration-300 ease-in-out"
            >
              Add Field
            </Button>
          </div>

          <div className="space-y-3 pt-4">
            <Button
              type="submit"
              disabled={isLoadingScrape || !formData.dynamicUrl || !formData.dynamicContainerSelector || formData.dynamicFields.some(f => !f.name || !f.selector)}
              className="w-full text-xl py-3.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-md hover:shadow-[0_0_15px_var(--primary)] transition-all duration-300 ease-in-out"
            >
              {isLoadingScrape ? "Scraping..." : "Scrape Dynamic URL"}
            </Button>
            {isLoadingScrape && (
              <Button
                type="button"
                onClick={handleCancel}
                variant="destructive"
                className="w-full text-xl py-3.5 bg-[var(--destructive)] hover:bg-[var(--destructive)]/90 text-[var(--destructive-foreground)] rounded-md hover:shadow-[0_0_15px_var(--destructive)] transition-all duration-300 ease-in-out"
              >
                Cancel Scraping
              </Button>
            )}
          </div>
        </form>
        {scrapeError && (
          <div className="mt-8 text-[var(--destructive-foreground)] bg-[var(--destructive)]/30 p-4 rounded-md border border-[var(--destructive)]">
            <p className="font-semibold text-lg">Error:</p>
            <p>{scrapeError}</p>
          </div>
        )}
        {scrapeResults && (
          <div className="mt-8">
            <Results data={scrapeResults.results || scrapeResults} fieldOrder={fieldOrder.length > 0 ? fieldOrder : null} taskId={scrapeResults.task_id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
