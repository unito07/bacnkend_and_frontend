import React, { useState } from "react";
import Results from "./Results";
import FieldRow from "./FieldRow";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DynamicScraper() {
  const [url, setUrl] = useState("");
  const [containerSelector, setContainerSelector] = useState("");
  const [enableScrolling, setEnableScrolling] = useState(false);
  const [maxScrolls, setMaxScrolls] = useState(5);
  const [fields, setFields] = useState([{ name: "", selector: "" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFieldChange = (idx, key, value) => {
    setFields(fields =>
      fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
    );
  };

  const addField = () => setFields([...fields, { name: "", selector: "" }]);
  const removeField = idx =>
    setFields(fields => fields.length > 1 ? fields.filter((_, i) => i !== idx) : fields);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        url,
        container_selector: containerSelector,
        custom_fields: fields.filter(f => f.name && f.selector),
        enable_scrolling: enableScrolling,
        max_scrolls: maxScrolls
      };
      const res = await fetch(`${API_URL}/scrape-dynamic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
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
      <h2>Dynamic Scraper</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="dynamic-url">URL</label>
          <input
            id="dynamic-url"
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="container-selector">Container CSS Selector</label>
          <input
            id="container-selector"
            type="text"
            value={containerSelector}
            onChange={e => setContainerSelector(e.target.value)}
            placeholder=".item-container"
            required
          />
        </div>
        <div>
          <label htmlFor="enable-scrolling">
            <input
              id="enable-scrolling"
              type="checkbox"
              checked={enableScrolling}
              onChange={e => setEnableScrolling(e.target.checked)}
            /> Enable Scrolling
          </label>
          <label htmlFor="max-scrolls">Max Scrolls</label>
          <input
            id="max-scrolls"
            type="number"
            min="1"
            value={maxScrolls}
            onChange={e => setMaxScrolls(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div>
          <label>Fields</label>
          {fields.map((field, idx) => (
            <FieldRow
              key={idx}
              name={field.name}
              selector={field.selector}
              onChange={(key, value) => handleFieldChange(idx, key, value)}
              onRemove={() => removeField(idx)}
              canRemove={fields.length > 1}
            />
          ))}
          <button type="button" onClick={addField}>Add Field</button>
        </div>
        <button
          type="submit"
          disabled={loading || !url || !containerSelector}
        >
          {loading ? "Scraping..." : "Scrape"}
        </button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
      {result && <Results data={result} />}
    </section>
  );
}
