import React, { useEffect, useState } from "react";
import Results from "./Results";
import FieldRow from "./FieldRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NeonCheckbox } from "@/components/ui/animated-check-box";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useScraperForm } from "../contexts/ScraperFormContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuroraText } from "@/components/magicui/aurora-text";

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

const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

function SortableFieldRow(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <FieldRow
      ref={setNodeRef}
      style={{ ref: setNodeRef, style }}
      {...props}
      attributes={attributes}
      listeners={listeners}
    />
  );
}

export default function InteractiveScraperMode() {
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

  const { isLoadingScrape, scrapeResults, scrapeError, lastOperationKey } = scrapeOperation;

  const [editingNumAdditionalPages, setEditingNumAdditionalPages] = useState(false);
  const [tempNumAdditionalPages, setTempNumAdditionalPages] = useState(formData.dynamicNumAdditionalPages);
  const [editingMaxScrolls, setEditingMaxScrolls] = useState(false);
  const [tempMaxScrolls, setTempMaxScrolls] = useState(formData.dynamicMaxScrolls);
  
  // const [interactiveSessionId, setInteractiveSessionId] = useState(null); // Removed: Now using context
  // const [interactiveModeLoading, setInteractiveModeLoading] = useState(false); // Removed: Now using context formData.isInteractiveSessionStarting

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

  const handleFieldChange = (id, key, value) => {
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

  const removeField = id => {
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

  const handleStartInteractiveSession = async () => {
    // setInteractiveModeLoading(true); // Removed
    setFormData(prev => ({ ...prev, isInteractiveSessionStarting: true }));
    const operationKey = Date.now().toString();
    startScrapeOperation('interactive-start', operationKey);
    try {
      const payload = { start_url: formData.interactiveStartUrl || null };
      const res = await fetch(`${API_URL}/interactive/start-browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to start interactive session.");
      }
      // setInteractiveSessionId(data.session_id); // Removed: Now using context
      setFormData(prev => ({ ...prev, interactiveSessionId: data.session_id }));
      toast.success(`Interactive session started (ID: ${data.session_id}). Browser window should open. Current URL: ${data.current_url || 'N/A'}`);
      setScrapeOperationSuccess(operationKey, data);
    } catch (err) {
      toast.error("Error starting interactive session: " + err.message);
      setScrapeOperationError(operationKey, "Error: " + err.message);
    } finally {
      // setInteractiveModeLoading(false); // Removed
      setFormData(prev => ({ ...prev, isInteractiveSessionStarting: false }));
    }
  };

  const handleScrapeInteractivePage = async () => {
    if (!formData.interactiveSessionId) {
      toast.error("No active interactive session ID. Please start a session first.");
      return;
    }
    const operationKey = Date.now().toString();
    startScrapeOperation('interactive-scrape', operationKey);
    try {
      const payload = {
        session_id: formData.interactiveSessionId,
        container_selector: formData.dynamicContainerSelector,
        custom_fields: formData.dynamicFields.filter(f => f.name && f.selector).map(f => ({ ...f, name: f.name.trim() })),
        enable_scrolling: formData.dynamicEnableScrolling,
        max_scrolls: Number(formData.dynamicMaxScrolls),
        scroll_to_end_page: formData.dynamicEnableScrolling ? formData.dynamicScrollToEndPage : false,
        enable_pagination: formData.dynamicEnablePagination,
        ...(formData.dynamicEnablePagination && {
          start_page: 1,
          end_page: 1 + Number(formData.dynamicNumAdditionalPages),
          pagination_type: formData.dynamicPaginationType,
          page_param: formData.dynamicPaginationType === "URL Parameter" ? formData.dynamicPageParam : undefined,
          next_button_selector: formData.dynamicPaginationType === "Next Button" ? formData.dynamicNextButtonSelector : undefined,
        }),
      };
      const res = await fetch(`${API_URL}/interactive/scrape-active-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.detail || "Failed to scrape interactive page.");
      }
      toast.success("Interactive page scraped successfully!");
      setScrapeOperationSuccess(operationKey, responseData);
    } catch (err) {
      toast.error("Error scraping interactive page: " + err.message);
      setScrapeOperationError(operationKey, "Error: " + err.message);
    }
  };

  const handleEndInteractiveSession = async () => {
    if (!formData.interactiveSessionId) {
      toast.info("No active interactive session to end.");
      return;
    }
    // setInteractiveModeLoading(true); // Removed
    setFormData(prev => ({ ...prev, isInteractiveSessionStarting: true }));
    const operationKey = Date.now().toString();
    startScrapeOperation('interactive-end', operationKey);
    try {
      const res = await fetch(`${API_URL}/interactive/stop-browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: formData.interactiveSessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to end interactive session.");
      }
      toast.success("Interactive session ended.");
      // setInteractiveSessionId(null); // Removed: Now using context
      setFormData(prev => ({ ...prev, interactiveSessionId: null }));
      setScrapeOperationSuccess(operationKey, data); // Use operationKey here
    } catch (err) {
      toast.error("Error ending interactive session: " + err.message);
      setScrapeOperationError(operationKey, "Error: " + err.message); // Use operationKey here
    } finally {
      // setInteractiveModeLoading(false); // Removed
      setFormData(prev => ({ ...prev, isInteractiveSessionStarting: false }));
    }
  };
  
    const handleCancelInteractiveScrape = async () => {
    if (!lastOperationKey) {
      toast.error("No active scrape operation to cancel.");
      return;
    }
    try {
      // Assuming the same /stop-scraper endpoint can be used, 
      // or a specific one for interactive tasks if available.
      const res = await fetch(`${API_URL}/stop-scraper`, { method: "POST" }); 
      const data = await res.json();
      if (!res.ok) {
        const errorMessage = data?.detail || `Failed to send stop signal: ${res.statusText}`;
        throw new Error(errorMessage);
      }
      const stopMessage = data.status || "stop signal sent";
      toast.warning(`Scraping stopped: ${stopMessage}`); 
      setScrapeOperationCancelled(lastOperationKey);
    } catch (err) {
      toast.error("Error trying to stop scrape: " + err.message);
      setScrapeOperationCancelled(lastOperationKey);
    }
  };


  const fieldOrder = formData.dynamicFields.filter(f => f.name && f.selector).map(f => f.name.trim());

  return (
    <>
      <div className="space-y-6 p-4 border border-[var(--accent)] rounded-lg shadow-lg shadow-[var(--accent)]/30">
        <h3 className="text-2xl font-semibold text-center text-[var(--accent)]">Interactive Session Control</h3>
        <p className="text-sm text-center text-[var(--muted-foreground)] -mt-4">
          1. Start session. 2. Prepare page in the new browser. 3. Define selectors below. 4. Click "Scrape Current Interactive Page".
        </p>
        <div>
            <Label htmlFor="interactive-start-url" className="text-md text-[var(--muted-foreground)]">Optional Start URL</Label>
            <Input
              id="interactive-start-url"
              type="text"
              value={formData.interactiveStartUrl}
              onChange={e => setFormData(prev => ({ ...prev, interactiveStartUrl: e.target.value }))}
              placeholder="https://example.com (optional)"
              className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
              disabled={formData.isInteractiveSessionStarting || !!formData.interactiveSessionId}
            />
        </div>
        {!formData.interactiveSessionId ? (
          <Button
            type="button"
            onClick={handleStartInteractiveSession}
            disabled={formData.isInteractiveSessionStarting}
            className="w-full text-lg py-3 bg-green-500 hover:bg-green-600 text-white rounded-md"
          >
            {formData.isInteractiveSessionStarting ? "Starting..." : "Start Interactive Session"}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-green-400 font-medium">
              Interactive Session Active (ID: <span className="font-mono text-sm">{formData.interactiveSessionId}</span>)
            </p>
            <Button
              type="button"
              onClick={handleEndInteractiveSession}
              disabled={formData.isInteractiveSessionStarting}
              variant="destructive"
              className="w-full text-lg py-3 rounded-md"
            >
              {formData.isInteractiveSessionStarting ? "Ending..." : "End Interactive Session"}
            </Button>
          </div>
        )}
        
        <div>
          <Label htmlFor="interactive-container-selector" className="text-md text-[var(--muted-foreground)]">Container CSS Selector</Label>
          <Input
            id="interactive-container-selector"
            type="text"
            value={formData.dynamicContainerSelector}
            onChange={e => setFormData(prev => ({ ...prev, dynamicContainerSelector: e.target.value }))}
            placeholder=".item-container"
            required
            className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
          />
        </div>
        
        <div className="p-4 rounded-lg border border-[var(--border)]/70 bg-[var(--background)] space-y-3 shadow-sm">
          <Label className="text-lg font-semibold text-[var(--secondary)] mb-2 block">Fields to Extract from Interactive Page</Label>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={formData.dynamicFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {formData.dynamicFields.map((field) => (
                  <SortableFieldRow key={field.id} id={field.id} name={field.name} selector={field.selector}
                    onChange={(key, value) => handleFieldChange(field.id, key, value)}
                    onRemove={() => removeField(field.id)}
                    canRemove={formData.dynamicFields.length > 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button type="button" onClick={addField} variant="outline" className="mt-3 text-sm py-2 px-4 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/20">
            Add Field
          </Button>
        </div>

        {/* Scrolling Options - For Interactive mode */}
        <div className={cn(
          "rounded-lg border border-[var(--border)]/70 bg-[var(--background)] transition-all duration-300 ease-in-out",
          formData.dynamicEnableScrolling ? "shadow-[0_0_15px_var(--ring)]" : ""
        )}>
          <div 
            className={cn(
              "flex items-center justify-between space-x-3 p-4 rounded-t-lg cursor-pointer hover:bg-[var(--muted)]/20 transition-colors",
              formData.dynamicEnableScrolling && "bg-[var(--muted)]/10 border-b border-[var(--border)]/30"
            )}
          >
            <div className="flex items-center space-x-3">
              <NeonCheckbox
                id="interactive-enable-scrolling"
                checked={formData.dynamicEnableScrolling}
                onChange={e => setFormData(prev => ({ ...prev, dynamicEnableScrolling: e.target.checked }))}
                className="h-6 w-6 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                aria-labelledby="interactive-enable-scrolling-label"
              />
              <Label 
                id="interactive-enable-scrolling-label"
                htmlFor="interactive-enable-scrolling"
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
            <div className="p-4 border-t border-[var(--border)]/70 space-y-6">
              <div className="flex items-center space-x-3">
                <NeonCheckbox
                  id="interactive-define-max-scrolls"
                  checked={!formData.dynamicScrollToEndPage}
                  onCheckedChange={(checked) => {
                    if (checked) setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                  }}
                  onChange={e => {
                      if (e.target.checked) setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                  }}
                  className="h-5 w-5 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                  aria-labelledby="interactive-define-max-scrolls-label"
                />
                <Label
                  id="interactive-define-max-scrolls-label"
                  htmlFor="interactive-define-max-scrolls"
                  className={cn(
                    "text-base font-medium cursor-pointer",
                    !formData.dynamicScrollToEndPage ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  )}
                >
                  Define Max Scrolls (Manual)
                </Label>
              </div>
              {!formData.dynamicScrollToEndPage && (
                <div className="pl-8">
                  <Label htmlFor="interactive-max-scrolls-counter" className="text-sm text-[var(--muted-foreground)] block mb-1 text-center">Number of Scrolls</Label>
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, dynamicMaxScrolls: Math.max(1, (parseInt(prev.dynamicMaxScrolls, 10) || 1) - 1) }))}
                      className="border-[var(--input)] hover:bg-[var(--muted)]"
                      aria-label="Decrease max scrolls"
                      disabled={editingMaxScrolls || editingNumAdditionalPages}
                    >
                      <Minus className="h-4 w-4 text-[var(--foreground)]" />
                    </Button>
                    {editingMaxScrolls ? (
                      <Input
                        type="text"
                        value={tempMaxScrolls}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) setTempMaxScrolls(val);
                        }}
                        onBlur={() => {
                          const finalVal = parseInt(tempMaxScrolls, 10);
                          if (!isNaN(finalVal) && finalVal >= 1) setFormData(prev => ({ ...prev, dynamicMaxScrolls: finalVal }));
                          else setTempMaxScrolls(formData.dynamicMaxScrolls);
                          setEditingMaxScrolls(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                          else if (e.key === 'Escape') {
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
                      disabled={editingMaxScrolls || editingNumAdditionalPages}
                    >
                      <Plus className="h-4 w-4 text-[var(--foreground)]" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3 pt-2">
                <NeonCheckbox
                  id="interactive-scroll-to-end-auto"
                  checked={formData.dynamicScrollToEndPage}
                  onCheckedChange={(checked) => {
                      if (checked) setFormData(prev => ({ ...prev, dynamicScrollToEndPage: true }));
                      else if (!checked && !(!formData.dynamicScrollToEndPage)) setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                  }}
                  onChange={e => {
                      if (e.target.checked) setFormData(prev => ({ ...prev, dynamicScrollToEndPage: true }));
                      else setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                  }}
                  className="h-5 w-5 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                  aria-labelledby="interactive-scroll-to-end-auto-label"
                />
                <Label
                  id="interactive-scroll-to-end-auto-label"
                  htmlFor="interactive-scroll-to-end-auto"
                  className={cn("text-base font-medium cursor-pointer", formData.dynamicScrollToEndPage ? "" : "text-[var(--muted-foreground)]")}
                >
                  <AuroraText
                    className={cn("text-base font-medium", formData.dynamicScrollToEndPage ? "" : "!text-[var(--muted-foreground)]")}
                    colors={["#B8FF00", "#00FFFF", "#FF2E88", "#A259FF"]}
                  >
                    Scroll to End of Page
                  </AuroraText>
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Controls - For Interactive mode */}
        <div className={cn(
          "rounded-lg border border-[var(--border)]/70 bg-[var(--background)] transition-all duration-300 ease-in-out",
          formData.dynamicEnablePagination ? "shadow-[0_0_15px_var(--ring)]" : ""
        )}>
          <div 
            className={cn(
              "flex items-center justify-between space-x-3 p-4 rounded-t-lg cursor-pointer hover:bg-[var(--muted)]/20 transition-colors",
              formData.dynamicEnablePagination && "bg-[var(--muted)]/10 border-b border-[var(--border)]/30"
            )}
          >
            <div className="flex items-center space-x-3">
              <NeonCheckbox
                id="interactive-enable-pagination"
                checked={formData.dynamicEnablePagination}
                onChange={e => setFormData(prev => ({ ...prev, dynamicEnablePagination: e.target.checked }))}
                className="h-6 w-6 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                aria-labelledby="interactive-enable-pagination-label"
              />
              <Label 
                id="interactive-enable-pagination-label"
                htmlFor="interactive-enable-pagination"
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
              <div className="grid grid-cols-1 gap-x-6 gap-y-4">
                <div>
                  <Label htmlFor="interactive-num-additional-pages-counter" className="text-base text-[var(--muted-foreground)] block mb-2 text-center">Number of Additional Pages</Label>
                  <div className="flex items-center justify-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, dynamicNumAdditionalPages: Math.max(0, (parseInt(prev.dynamicNumAdditionalPages, 10) || 0) - 1) }))}
                      className="border-[var(--input)] hover:bg-[var(--muted)]"
                      aria-label="Decrease number of additional pages"
                      disabled={editingNumAdditionalPages}
                    >
                      <Minus className="h-4 w-4 text-[var(--foreground)]" />
                    </Button>
                    {editingNumAdditionalPages ? (
                      <Input
                        type="text"
                        value={tempNumAdditionalPages}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) setTempNumAdditionalPages(val);
                        }}
                        onBlur={() => {
                          const finalVal = parseInt(tempNumAdditionalPages, 10);
                          if (!isNaN(finalVal) && finalVal >= 0) setFormData(prev => ({ ...prev, dynamicNumAdditionalPages: finalVal }));
                          else setTempNumAdditionalPages(formData.dynamicNumAdditionalPages);
                          setEditingNumAdditionalPages(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                          else if (e.key === 'Escape') {
                            setTempNumAdditionalPages(formData.dynamicNumAdditionalPages);
                            setEditingNumAdditionalPages(false);
                          }
                        }}
                        className="w-16 text-center text-base p-1 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                        autoFocus
                      />
                    ) : (
                      <div onClick={() => { setTempNumAdditionalPages(formData.dynamicNumAdditionalPages); setEditingNumAdditionalPages(true); }} className="cursor-pointer">
                        <AnimatedCounter value={parseInt(formData.dynamicNumAdditionalPages, 10) || 0} />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ ...prev, dynamicNumAdditionalPages: (parseInt(prev.dynamicNumAdditionalPages, 10) || 0) + 1 }))}
                      className="border-[var(--input)] hover:bg-[var(--muted)]"
                      aria-label="Increase number of additional pages"
                      disabled={editingNumAdditionalPages}
                    >
                      <Plus className="h-4 w-4 text-[var(--foreground)]" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="interactive-pagination-type" className="text-base text-[var(--muted-foreground)] block mb-1">Pagination Type</Label>
                <Select
                  value={formData.dynamicPaginationType}
                  onValueChange={value => setFormData(prev => ({ ...prev, dynamicPaginationType: value }))}
                >
                  <SelectTrigger 
                    id="interactive-pagination-type"
                    className="w-full text-base bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md shadow-sm data-[placeholder]:text-[var(--muted-foreground)]/70"
                  >
                    <SelectValue placeholder="Select pagination type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--popover)] text-[var(--popover-foreground)] border-[var(--border)]">
                    <SelectItem value="Next Button" className="text-base focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)]">Next Button</SelectItem>
                    <SelectItem value="URL Parameter" className="text-base focus:bg-[var(--accent)] focus:text-[var(--accent-foreground)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)]">URL Parameter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.dynamicPaginationType === "URL Parameter" && (
                <div>
                  <Label htmlFor="interactive-page-param" className="text-base text-[var(--muted-foreground)] block mb-1">Page Parameter Name</Label>
                  <Input
                    id="interactive-page-param"
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
                  <Label htmlFor="interactive-next-button-selector" className="text-base text-[var(--muted-foreground)] block mb-1">Next Button Selector (CSS or XPath)</Label>
                  <Input
                    id="interactive-next-button-selector"
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

        <Button
          type="button"
          onClick={handleScrapeInteractivePage}
          disabled={
            isLoadingScrape ||
            !formData.interactiveSessionId ||
            !formData.dynamicContainerSelector.trim() ||
            formData.dynamicFields.filter(f => f.name.trim() && f.selector.trim()).length === 0
          }
          className="w-full text-lg py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-md"
        >
          {isLoadingScrape && scrapeOperation.scrapeType === 'interactive-scrape' ? "Scraping Interactive Page..." : "Scrape Current Interactive Page"}
        </Button>
         {isLoadingScrape && scrapeOperation.scrapeType === 'interactive-scrape' && (
          <Button
            type="button"
            onClick={handleCancelInteractiveScrape}
            variant="destructive"
            className="w-full text-lg py-3"
          >
            Cancel Interactive Scrape
          </Button>
        )}
      </div>
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
    </>
  );
}
