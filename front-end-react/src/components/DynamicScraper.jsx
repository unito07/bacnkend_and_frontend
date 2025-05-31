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
import { AuroraText } from "@/components/magicui/aurora-text"; // Added AuroraText import

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
  const [currentPreScrapeSelector, setCurrentPreScrapeSelector] = useState(""); // Added for pre-scrape

  // State for Interactive Mode
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);
  const [interactiveSessionId, setInteractiveSessionId] = useState(null);
  const [interactiveModeLoading, setInteractiveModeLoading] = useState(false); // For start/stop buttons
  const [interactiveStartUrl, setInteractiveStartUrl] = useState("");
  const [chromeUserDataDir, setChromeUserDataDir] = useState(""); // Added for Chrome User Data Directory
  const [chromeProfileDir, setChromeProfileDir] = useState(""); // Added for Chrome Profile Directory


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
        scroll_to_end_page: formData.dynamicEnableScrolling ? formData.dynamicScrollToEndPage : false, // Only send if scrolling is enabled
        // Pagination fields
        enable_pagination: formData.dynamicEnablePagination,
        start_page: Number(formData.dynamicStartPage),
        end_page: Number(formData.dynamicEndPage),
        pagination_type: formData.dynamicPaginationType,
        page_param: formData.dynamicPageParam,
        next_button_selector: formData.dynamicNextButtonSelector,
        pre_scrape_interactions: formData.preScrapeInteractions || [],
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

  // --- Interactive Mode Handlers ---
  const handleStartInteractiveSession = async () => {
    setInteractiveModeLoading(true);
    const operationKey = Date.now().toString(); // Generate unique key here
    startScrapeOperation('interactive-start', operationKey); // Use this key
    try {
      const payload = { 
        start_url: interactiveStartUrl || null,
        user_data_dir: chromeUserDataDir || null,
        profile_directory: chromeProfileDir || null,
      };
      const res = await fetch(`${API_URL}/interactive/start-browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to start interactive session.");
      }
      setInteractiveSessionId(data.session_id);
      toast.success(`Interactive session started (ID: ${data.session_id}). Browser window should open. Current URL: ${data.current_url || 'N/A'}`);
      setScrapeOperationSuccess(operationKey, data); // Use the generated operationKey
    } catch (err) {
      toast.error("Error starting interactive session: " + err.message);
      setScrapeOperationError(operationKey, "Error: " + err.message); // Use the generated operationKey
    } finally {
      setInteractiveModeLoading(false);
      // The setScrapeOperationSuccess/Error calls already handle setting isLoadingScrape to false.
      // No need for an extra reset here.
    }
  };

  const handleScrapeInteractivePage = async () => {
    if (!interactiveSessionId) {
      toast.error("No active interactive session ID. Please start a session first.");
      return;
    }
    const operationKey = Date.now().toString();
    startScrapeOperation('interactive-scrape', operationKey);
    try {
      const payload = {
        session_id: interactiveSessionId,
        container_selector: formData.dynamicContainerSelector,
        custom_fields: formData.dynamicFields.filter(f => f.name && f.selector).map(f => ({ ...f, name: f.name.trim() })),
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
    if (!interactiveSessionId) {
      toast.info("No active interactive session to end.");
      return;
    }
    setInteractiveModeLoading(true);
    startScrapeOperation('interactive-end', Date.now().toString());
    try {
      const res = await fetch(`${API_URL}/interactive/stop-browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: interactiveSessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to end interactive session.");
      }
      toast.success("Interactive session ended.");
      setInteractiveSessionId(null);
      setScrapeOperationSuccess(lastOperationKey, data);
    } catch (err) {
      toast.error("Error ending interactive session: " + err.message);
      setScrapeOperationError(lastOperationKey, "Error: " + err.message);
    } finally {
      setInteractiveModeLoading(false);
    }
  };


  const handleAddPreScrapeSelector = () => {
    if (currentPreScrapeSelector.trim() === "") {
      toast.info("Pre-scrape selector cannot be empty.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      preScrapeInteractions: [...(prev.preScrapeInteractions || []), currentPreScrapeSelector.trim()],
    }));
    setCurrentPreScrapeSelector(""); // Clear input after adding
  };

  const handleRemovePreScrapeSelector = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      preScrapeInteractions: (prev.preScrapeInteractions || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const fieldOrder = formData.dynamicFields.filter(f => f.name && f.selector).map(f => f.name.trim());

  // Debugging for "Scrape Current Interactive Page" button's disabled state
  if (isInteractiveMode) {
    const containerSelectorFilled = formData.dynamicContainerSelector && formData.dynamicContainerSelector.trim() !== "";
    const fieldsAreFilled = formData.dynamicFields.filter(f => f.name && f.name.trim() !== "" && f.selector && f.selector.trim() !== "").length > 0;
    const buttonDisabledState = isLoadingScrape || !interactiveSessionId || !containerSelectorFilled || !fieldsAreFilled;

    console.log("--- Interactive Scrape Button Debug ---");
    console.log("isLoadingScrape:", isLoadingScrape);
    console.log("interactiveSessionId:", interactiveSessionId, "(is falsy?:", !interactiveSessionId, ")");
    console.log("formData.dynamicContainerSelector:", `'${formData.dynamicContainerSelector}'`, "(is empty/whitespace?:", !containerSelectorFilled, ")");
    console.log("Number of valid fields:", formData.dynamicFields.filter(f => f.name.trim() && f.selector.trim()).length);
    console.log("fieldsAreFilled (at least one valid field):", fieldsAreFilled, "(is zero?:", !fieldsAreFilled, ")");
    console.log("Overall button disabled state:", buttonDisabledState);
    console.log("------------------------------------");
  }

  return (
    <Card className="w-full bg-[var(--card)] border-[var(--border)] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-[var(--accent)]">Dynamic Scraper</CardTitle>
        <CardDescription className="text-center text-[var(--muted-foreground)] pt-1">
          Configure advanced scraping for dynamic content, pagination, or use interactive mode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Interactive Mode Toggle */}
        <div className="flex items-center justify-center space-x-2 mb-6 p-3 rounded-md bg-[var(--muted)]/50 border border-[var(--border)]">
          <Label htmlFor="interactive-mode-toggle" className="text-lg font-medium text-[var(--foreground)]">
            Interactive Mode
          </Label>
          <NeonCheckbox
            id="interactive-mode-toggle"
            checked={isInteractiveMode}
            onChange={(e) => setIsInteractiveMode(e.target.checked)}
            className="h-6 w-6"
          />
           <span className="text-sm text-[var(--muted-foreground)]">
            (Manually prepare browser before scraping)
          </span>
        </div>

        {isInteractiveMode ? (
          // --- Interactive Mode UI ---
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
                  value={interactiveStartUrl}
                  onChange={e => setInteractiveStartUrl(e.target.value)}
                  placeholder="https://example.com (optional)"
                  className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                  disabled={interactiveModeLoading || !!interactiveSessionId}
                />
            </div>
            <div>
                <Label htmlFor="chrome-user-data-dir" className="text-md text-[var(--muted-foreground)]">Chrome User Data Directory (Optional)</Label>
                <Input
                  id="chrome-user-data-dir"
                  type="text"
                  value={chromeUserDataDir}
                  onChange={e => setChromeUserDataDir(e.target.value)}
                  placeholder="e.g., /Users/youruser/Library/Application Support/Google/Chrome"
                  className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                  disabled={interactiveModeLoading || !!interactiveSessionId}
                />
            </div>
            <div>
                <Label htmlFor="chrome-profile-dir" className="text-md text-[var(--muted-foreground)]">Chrome Profile Directory (Optional)</Label>
                <Input
                  id="chrome-profile-dir"
                  type="text"
                  value={chromeProfileDir}
                  onChange={e => setChromeProfileDir(e.target.value)}
                  placeholder="e.g., Profile 1, Default"
                  className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                  disabled={interactiveModeLoading || !!interactiveSessionId || !chromeUserDataDir.trim()} // Disable if no user data dir
                />
                 {chromeUserDataDir.trim() && !chromeProfileDir.trim() && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">If User Data Directory is set but Profile Directory is empty, 'Default' profile will be assumed.</p>
                )}
            </div>
            {!interactiveSessionId ? (
              <Button
                type="button"
                onClick={handleStartInteractiveSession}
                disabled={interactiveModeLoading}
                className="w-full text-lg py-3 bg-green-500 hover:bg-green-600 text-white rounded-md"
              >
                {interactiveModeLoading ? "Starting..." : "Start Interactive Session"}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-green-400 font-medium">
                  Interactive Session Active (ID: <span className="font-mono text-sm">{interactiveSessionId}</span>)
                </p>
                <Button
                  type="button"
                  onClick={handleEndInteractiveSession}
                  disabled={interactiveModeLoading}
                  variant="destructive"
                  className="w-full text-lg py-3 rounded-md"
                >
                  {interactiveModeLoading ? "Ending..." : "End Interactive Session"}
                </Button>
              </div>
            )}
            
            {/* Selector inputs for interactive mode */}
            <div>
              <Label htmlFor="interactive-container-selector" className="text-md text-[var(--muted-foreground)]">Container CSS Selector</Label>
              <Input
                id="interactive-container-selector"
                type="text"
                value={formData.dynamicContainerSelector}
                onChange={e => setFormData(prev => ({ ...prev, dynamicContainerSelector: e.target.value }))}
                placeholder=".item-container"
                required={isInteractiveMode} // Required only if in interactive mode
                className="mt-1 text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
              />
            </div>
            {/* Fields to Extract (reused from normal dynamic scrape) */}
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

            <Button
              type="button"
              onClick={handleScrapeInteractivePage}
              disabled={
                isLoadingScrape ||
                !interactiveSessionId ||
                !formData.dynamicContainerSelector.trim() ||
                formData.dynamicFields.filter(f => f.name.trim() && f.selector.trim()).length === 0
              }
              className="w-full text-lg py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-md"
            >
              {isLoadingScrape ? "Scraping Interactive Page..." : "Scrape Current Interactive Page"}
            </Button>
             {isLoadingScrape && ( // Show cancel button if scraping interactive page
              <Button
                type="button"
                onClick={handleCancel} // Standard cancel should work
                variant="destructive"
                className="w-full text-lg py-3"
              >
                Cancel Interactive Scrape
              </Button>
            )}
          </div>
        ) : (
          // --- Normal Dynamic Scraper Form ---
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <Label htmlFor="dynamic-url" className="text-lg text-[var(--muted-foreground)]">URL</Label>
              <Input
                id="dynamic-url"
                type="text"
                value={formData.dynamicUrl}
                onChange={e => setFormData(prev => ({ ...prev, dynamicUrl: e.target.value }))}
                placeholder="https://example.com"
                required={!isInteractiveMode} // Required only if NOT in interactive mode
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
                required={!isInteractiveMode} // Required only if NOT in interactive mode
                className="mt-2 text-lg p-3 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
              />
            </div>

            {/* Pre-Scrape Interactions Section - Only for non-interactive mode */}
            {!isInteractiveMode && (
              <div className="p-6 rounded-lg border border-[var(--border)]/70 bg-[var(--background)] space-y-4 shadow-[0_0_10px_var(--accent-secondary)]">
                <Label className="text-xl font-semibold text-[var(--accent-secondary)] mb-3 block">Pre-Scrape Interactions (Click Actions)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={currentPreScrapeSelector}
                    onChange={e => setCurrentPreScrapeSelector(e.target.value)}
                    placeholder="Enter CSS selector to click (e.g., #accept-cookies)"
                    className="flex-grow text-base p-2 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPreScrapeSelector}
                    variant="outline"
                    className="text-base py-2 px-4 border-[var(--accent-secondary)] text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/20 hover:text-[var(--accent)] rounded-md"
                  >
                    <Plus className="h-5 w-5 mr-2" /> Add Click
                  </Button>
                </div>
                {formData.preScrapeInteractions && formData.preScrapeInteractions.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-sm text-[var(--muted-foreground)]">Selectors will be clicked in this order:</p>
                    <ul className="list-decimal list-inside pl-2 space-y-1">
                      {formData.preScrapeInteractions.map((selector, index) => (
                        <li key={index} className="flex items-center justify-between text-sm text-[var(--foreground)] bg-[var(--muted)]/50 p-2 rounded-md">
                          <span className="truncate" title={selector}>{index + 1}. {selector}</span>
                          <Button
                            type="button"
                            onClick={() => handleRemovePreScrapeSelector(index)}
                            variant="ghost"
                            size="icon"
                            className="text-[var(--destructive)] hover:bg-[var(--destructive)]/10 h-7 w-7"
                            aria-label="Remove pre-scrape selector"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Scrolling Options - Only for non-interactive mode */}
            {!isInteractiveMode && (
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
                  <div className="p-4 border-t border-[var(--border)]/70 space-y-6">
                    {/* Option 1: Define Max Scrolls (Manual) */}
                    <div className="flex items-center space-x-3">
                      <NeonCheckbox
                        id="define-max-scrolls"
                        checked={!formData.dynamicScrollToEndPage} // Checked if NOT scrolling to end
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                          }
                          // If unchecking this, and the other is also unchecked, what happens?
                          // For simplicity, let's assume checking one unchecks the other.
                          // If this is checked, dynamicScrollToEndPage becomes false.
                        }}
                        onChange={e => { // Use onChange for direct boolean
                            if (e.target.checked) {
                                setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                            }
                        }}
                        className="h-5 w-5 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                        aria-labelledby="define-max-scrolls-label"
                      />
                      <Label
                        id="define-max-scrolls-label"
                        htmlFor="define-max-scrolls"
                        className={cn(
                          "text-base font-medium cursor-pointer",
                          !formData.dynamicScrollToEndPage ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                        )}
                      >
                        Define Max Scrolls (Manual)
                      </Label>
                    </div>

                    {/* Max Scrolls Input - Visible if "Define Max Scrolls" is chosen */}
                    {!formData.dynamicScrollToEndPage && (
                      <div className="pl-8">
                        <Label htmlFor="max-scrolls-counter" className="text-sm text-[var(--muted-foreground)] block mb-1 text-center">Number of Scrolls</Label>
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

                    {/* Option 2: Scroll to End of Page (Auto) */}
                    <div className="flex items-center space-x-3 pt-2">
                      <NeonCheckbox
                        id="scroll-to-end-auto" // Changed ID to be unique
                        checked={formData.dynamicScrollToEndPage}
                        onCheckedChange={(checked) => { // Shadcn checkbox uses onCheckedChange
                            if (checked) {
                                setFormData(prev => ({ ...prev, dynamicScrollToEndPage: true }));
                            }
                             // If unchecking this, and the other is also unchecked, default to manual.
                            else if (!checked && !(!formData.dynamicScrollToEndPage)) { // if unchecking this, and manual is also not checked
                                 setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false })); // default to manual
                            }
                        }}
                        onChange={e => { // Use onChange for direct boolean
                            if (e.target.checked) {
                                 setFormData(prev => ({ ...prev, dynamicScrollToEndPage: true }));
                            } else {
                                // If unchecking "Scroll to End", default to "Define Max Scrolls" being active
                                setFormData(prev => ({ ...prev, dynamicScrollToEndPage: false }));
                            }
                        }}
                        className="h-5 w-5 border-[var(--input)] data-[state=checked]:bg-[var(--primary)] data-[state=checked]:text-[var(--primary-foreground)] focus:ring-[var(--ring)]"
                        aria-labelledby="scroll-to-end-auto-label"
                      />
                      <Label
                        id="scroll-to-end-auto-label"
                        htmlFor="scroll-to-end-auto"
                        className={cn(
                          "text-base font-medium cursor-pointer",
                          // Conditional text color is handled by AuroraText, but we keep other styles
                          formData.dynamicScrollToEndPage ? "" : "text-[var(--muted-foreground)]" 
                          // If not active, let muted-foreground apply to the container, Aurora will override text color itself.
                          // If active, AuroraText will provide its own colors.
                        )}
                      >
                        <AuroraText
                          className={cn(
                            "text-base font-medium", // Apply base font styles here
                            formData.dynamicScrollToEndPage ? "" : "!text-[var(--muted-foreground)]"
                          )}
                          colors={["#B8FF00", "#00FFFF", "#FF2E88", "#A259FF"]} // Cyber Lime, Electric Blue, Hot Pink, Neon Purple
                        >
                          Scroll to End of Page
                        </AuroraText>
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls - Only for non-interactive mode */}
            {!isInteractiveMode && (
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
            )}

            {/* Fields to Extract - Only for non-interactive mode (or reuse if structure is identical) */}
            {!isInteractiveMode && (
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
            )}

            {/* Submit and Cancel Buttons for Normal Dynamic Scrape */}
            {!isInteractiveMode && (
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
            )}
          </form>
        )}
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
