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
        className="flex-1 text-base p-2.5 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md placeholder:text-[var(--muted-foreground)]/70"
      />
      <Input
        type="text"
        placeholder="CSS selector (e.g., h1.title, span.price)"
        value={selector}
        onChange={e => onChange("selector", e.target.value)}
        required
        className="flex-1 text-base p-2.5 bg-[var(--muted)] text-[var(--foreground)] border-[var(--input)] focus:ring-[var(--ring)] focus:border-[var(--ring)] rounded-md placeholder:text-[var(--muted-foreground)]/70"
      />
      {canRemove && (
        <Button
          type="button"
          onClick={onRemove}
          aria-label="Remove field"
          variant="destructive"
          size="icon"
          className="bg-[var(--destructive)] hover:bg-[var(--destructive)]/90 text-[var(--destructive-foreground)] hover:shadow-[0_0_10px_var(--destructive)] rounded-md transition-all duration-300 ease-in-out"
        >
          &times;
        </Button>
      )}
    </div>
  );
}
