import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FieldRow({ name, selector, onChange, onRemove, canRemove }) {
  return (
    <div className="flex items-center space-x-2">
      <Input
        type="text"
        placeholder="Field name (e.g., title, price)"
        value={name}
        onChange={e => onChange("name", e.target.value)}
        required
        className="flex-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
      />
      <Input
        type="text"
        placeholder="CSS selector (e.g., h1.title, span.price)"
        value={selector}
        onChange={e => onChange("selector", e.target.value)}
        required
        className="flex-1 bg-slate-700 text-white border-slate-600 focus:ring-sky-500 focus:border-sky-500"
      />
      {canRemove && (
        <Button
          type="button"
          onClick={onRemove}
          aria-label="Remove field"
          variant="destructive"
          size="icon"
          className="bg-red-700 hover:bg-red-800"
        >
          &times;
        </Button>
      )}
    </div>
  );
}
