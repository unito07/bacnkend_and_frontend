import React from "react";
import { useScraperForm } from "../contexts/ScraperFormContext";
import StandardScraperMode from "./StandardScraperMode";
import InteractiveScraperMode from "./InteractiveScraperMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NeonCheckbox } from "@/components/ui/animated-check-box";
import { cn } from "@/lib/utils"; // Added cn for potential styling

export default function DynamicScraper() {
  const { formData, setFormData } = useScraperForm();

  return (
    <Card className="w-full bg-[var(--card)] border-[var(--border)] shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-[var(--accent)]">
          {/* Title can be dynamic based on mode or a general title like "Advanced Scraper" */}
          Scraper Controls
        </CardTitle>
        <CardDescription className="text-center text-[var(--muted-foreground)] pt-1">
          Switch between Dynamic and Interactive scraping modes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formData.isInteractiveMode ? (
          <InteractiveScraperMode />
        ) : (
          <StandardScraperMode />
        )}
      </CardContent>
    </Card>
  );
}
