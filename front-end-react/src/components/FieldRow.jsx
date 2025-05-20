import React from "react";

export default function FieldRow({ name, selector, onChange, onRemove, canRemove }) {
  return (
    <div className="field-row">
      <input
        type="text"
        placeholder="Field name"
        value={name}
        onChange={e => onChange("name", e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="CSS selector"
        value={selector}
        onChange={e => onChange("selector", e.target.value)}
        required
      />
      {canRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove field">
          &times;
        </button>
      )}
    </div>
  );
}
