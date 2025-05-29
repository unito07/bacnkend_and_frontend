import React, { useEffect, useState } from "react"; // Added useEffect, useState
import Results from "./Results";
import FieldRow from "./FieldRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NeonCheckbox } from "@/components/ui/animated-check-box";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, GripVertical, Plus, Minus } from 'lucide-react'; // Added Plus, Minus
import { AnimatedCounter } from "@/components/ui/animated-counter"; // Added AnimatedCounter
import { useScraperForm } from "../contexts/ScraperFormContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper to generate unique IDs
const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

// SortableFieldRow wrapper component
function SortableFieldRow(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Can be used for styling while dragging
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1, // Example: reduce opacity when dragging
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
  };

  return (
    <FieldRow
      ref={setNodeRef}
      style={{ ref: setNodeRef, style }} // Pass ref and style to FieldRow
      {...props}
      attributes={attributes}
      listeners={listeners}
    />
  );
}


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

  // State for inline editing of page numbers
  const [editingStartPage, setEditingStartPage] = useState(false);
  const [tempStartPage, setTempStartPage] = useState(formData.dynamicStartPage);
  const [editingEndPage, setEditingEndPage] = useState(false);
  const [tempEndPage, setTempEndPage] = useState(formData.dynamicEndPage);
  const [editingMaxScrolls, setEditingMaxScrolls] = useState(false);
  const [tempMaxScrolls, setTempMaxScrolls] = useState(formData.dynamicMaxScrolls);

  // Ensure fields have unique IDs
  useEffect(() => {
    setFormData(prev => {
      const needsUpdate = prev.dynamicFields.some(f => !f.id);
      if (needsUpdate) {
        return {
          ...prev,
          dynamicFields: prev.dynamicFields.map(f => f.id ? f : { ...f, id: generateUniqueId() }),
        };
      }
      return prev;
    });
  }, [setFormData]);

  // Effect to manage start and end page logic for pagination
  useEffect(() => {
    if (formData.dynamicEnablePagination) {
      const currentStart = parseInt(formData.dynamicStartPage, 10) || 1;
      const currentEnd = parseInt(formData.dynamicEndPage, 10);
      let desiredStart = currentStart < 1 ? 1 : currentStart;
      let desiredEnd = currentEnd;

      if (isNaN(desiredEnd) || desiredEnd <= desiredStart) {
        desiredEnd = desiredStart + 1;
      }

      if (formData.dynamicStartPage !== desiredStart || formData.dynamicEndPage !== desiredEnd) {
        setFormData(prev => ({
          ...prev,
          dynamicStartPage: desiredStart,
          dynamicEndPage: desiredEnd,
        }));
      }
    }
  }, [
    formData.dynamicEnablePagination, 
    formData.dynamicStartPage, 
    formData.dynamicEndPage, 
    setFormData
  ]);


  const handleFieldChange = (id, key, value) => { // Changed idx to id
    setFormData(prev => ({
      ...prev,
      dynamicFields: prev.dynamicFields.map(f => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      dynamicFields: [...prev.dynamicFields, { id: generateUniqueId(), name: "", selector: "" }],
    }));
  };

  const removeField = id => { // Changed idx to id
    setFormData(prev => ({
      ...prev,
      dynamicFields: prev.dynamicFields.length > 1 ? prev.dynamicFields.filter(f => f.id !== id) : prev.dynamicFields,
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.dynamicFields.findIndex((field) => field.id === active.id);
        const newIndex = prev.dynamicFields.findIndex((field) => field.id === over.id);
        return {
          ...prev,
          dynamicFields: arrayMove(prev.dynamicFields, oldIndex, newIndex),
        };
      });
    }
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
                <Label htmlFor="max-scrolls-counter" className="text-base text-[var(--muted-foreground)] block mb-2 text-center">Max Scrolls</Label>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, dynamicMaxScrolls: Math.max(1, (parseInt(prev.dynamicMaxScrolls, 10) || 1) - 1) }))}
                    className="border-[var(--input)] hover:bg-[var(--muted)]"
                    aria-label="Decrease max scrolls"
                    disabled={editingMaxScrolls || editingStartPage || editingEndPage}
                  >
                    <Minus className="h-4 w-4 text-[var(--foreground)]" />
                  </Button>
                  {editingMaxScrolls ? (
                    <Input
                      type="text"
                      value={tempMaxScrolls}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setTempMaxScrolls(val);
                        }
                      }}
                      onBlur={() => {
                        const finalVal = parseInt(tempMaxScrolls, 10);
                        if (!isNaN(finalVal) && finalVal >= 1) {
                          setFormData(prev => ({ ...prev, dynamicMaxScrolls: finalVal }));
                        } else {
                          setTempMaxScrolls(formData.dynamicMaxScrolls); // Revert
                        }
                        setEditingMaxScrolls(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          setTempMaxScrolls(formData.dynamicMaxScrolls);
                          setEditingMaxScrolls(false);
                        }
                      }}
                      className="w-16 text-center text-base p-1 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                      autoFocus
                    />
                  ) : (
                    <div onClick={() => { setTempMaxScrolls(formData.dynamicMaxScrolls); setEditingMaxScrolls(true); }} className="cursor-pointer">
                      <AnimatedCounter value={parseInt(formData.dynamicMaxScrolls, 10) || 1} />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({ ...prev, dynamicMaxScrolls: (parseInt(prev.dynamicMaxScrolls, 10) || 1) + 1 }))}
                    className="border-[var(--input)] hover:bg-[var(--muted)]"
                    aria-label="Increase max scrolls"
                    disabled={editingMaxScrolls || editingStartPage || editingEndPage}
                  >
                    <Plus className="h-4 w-4 text-[var(--foreground)]" />
                  </Button>
                </div>
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
                  {/* Start Page Counter */}
                  <div>
                    <Label htmlFor="start-page-counter" className="text-base text-[var(--muted-foreground)] block mb-2 text-center">Start Page</Label>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ ...prev, dynamicStartPage: Math.max(1, (parseInt(prev.dynamicStartPage, 10) || 1) - 1) }))}
                        className="border-[var(--input)] hover:bg-[var(--muted)]"
                        aria-label="Decrease start page"
                        disabled={editingStartPage || editingEndPage}
                      >
                        <Minus className="h-4 w-4 text-[var(--foreground)]" />
                      </Button>
                      {editingStartPage ? (
                        <Input
                          type="text" // Use text to allow intermediate non-numeric input before validation
                          value={tempStartPage}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Allow only digits or empty string for intermediate input
                            if (/^\d*$/.test(val)) {
                              setTempStartPage(val);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = parseInt(tempStartPage, 10);
                            if (!isNaN(finalVal) && finalVal >= 1) {
                              setFormData(prev => ({ ...prev, dynamicStartPage: finalVal }));
                            } else {
                              // Reset to current formData value if input is invalid
                              setTempStartPage(formData.dynamicStartPage);
                            }
                            setEditingStartPage(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur(); // Trigger onBlur to save
                            } else if (e.key === 'Escape') {
                              setTempStartPage(formData.dynamicStartPage); // Revert
                              setEditingStartPage(false);
                            }
                          }}
                          className="w-16 text-center text-base p-1 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div onClick={() => { setTempStartPage(formData.dynamicStartPage); setEditingStartPage(true); }} className="cursor-pointer">
                          <AnimatedCounter value={parseInt(formData.dynamicStartPage, 10) || 1} />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ ...prev, dynamicStartPage: (parseInt(prev.dynamicStartPage, 10) || 1) + 1 }))}
                        className="border-[var(--input)] hover:bg-[var(--muted)]"
                        aria-label="Increase start page"
                        disabled={editingStartPage || editingEndPage}
                      >
                        <Plus className="h-4 w-4 text-[var(--foreground)]" />
                      </Button>
                    </div>
                  </div>
                  {/* End Page Counter */}
                  <div>
                    <Label htmlFor="end-page-counter" className="text-base text-[var(--muted-foreground)] block mb-2 text-center">End Page</Label>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ ...prev, dynamicEndPage: Math.max((parseInt(prev.dynamicStartPage, 10) || 1) + 1, (parseInt(prev.dynamicEndPage, 10) || 0) - 1) }))}
                        className="border-[var(--input)] hover:bg-[var(--muted)]"
                        aria-label="Decrease end page"
                        disabled={editingStartPage || editingEndPage}
                      >
                        <Minus className="h-4 w-4 text-[var(--foreground)]" />
                      </Button>
                      {editingEndPage ? (
                        <Input
                          type="text"
                          value={tempEndPage}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*$/.test(val)) {
                              setTempEndPage(val);
                            }
                          }}
                          onBlur={() => {
                            const finalVal = parseInt(tempEndPage, 10);
                            const startVal = parseInt(formData.dynamicStartPage, 10) || 1;
                            if (!isNaN(finalVal) && finalVal > startVal) {
                              setFormData(prev => ({ ...prev, dynamicEndPage: finalVal }));
                            } else {
                              setTempEndPage(formData.dynamicEndPage); // Revert
                            }
                            setEditingEndPage(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            } else if (e.key === 'Escape') {
                              setTempEndPage(formData.dynamicEndPage);
                              setEditingEndPage(false);
                            }
                          }}
                          className="w-16 text-center text-base p-1 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                          autoFocus
                        />
                      ) : (
                        <div onClick={() => { setTempEndPage(formData.dynamicEndPage); setEditingEndPage(true); }} className="cursor-pointer">
                          <AnimatedCounter value={parseInt(formData.dynamicEndPage, 10) || ((parseInt(formData.dynamicStartPage, 10) || 1) + 1)} />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ ...prev, dynamicEndPage: (parseInt(prev.dynamicEndPage, 10) || 0) + 1 }))}
                        className="border-[var(--input)] hover:bg-[var(--muted)]"
                        aria-label="Increase end page"
                        disabled={editingStartPage || editingEndPage}
                      >
                        <Plus className="h-4 w-4 text-[var(--foreground)]" />
                      </Button>
                    </div>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={formData.dynamicFields.map(f => f.id)} // Use IDs for items
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3"> {/* Added a wrapper for spacing between sortable items */}
                  {formData.dynamicFields.map((field) => ( // field still has idx from map if needed, but id is primary
                    <SortableFieldRow
                      key={field.id} // Use unique ID as key
                      id={field.id}   // Pass ID to SortableFieldRow
                      name={field.name}
                      selector={field.selector}
                      onChange={(key, value) => handleFieldChange(field.id, key, value)}
                      onRemove={() => removeField(field.id)}
                      canRemove={formData.dynamicFields.length > 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
