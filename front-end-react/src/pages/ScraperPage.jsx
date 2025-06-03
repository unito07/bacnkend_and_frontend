import React, { useState, useEffect } from 'react';
// StaticScraper is no longer used
import DynamicScraper from '../components/DynamicScraper'; // This will render Standard or Interactive mode
import { useScraperForm } from '../contexts/ScraperFormContext'; // Import the context hook
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function ScraperPage() {
  const { formData, setFormData } = useScraperForm(); // Use the context
  
  // The activeTab state will now control 'standard' or 'interactive'
  // Default to 'standard' if nothing in localStorage or if localStorage has old 'static'/'dynamic' values
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeScraperTab');
    if (savedTab === 'standard' || savedTab === 'interactive') {
      return savedTab;
    }
    return 'standard'; // Default to 'standard'
  });

  // Update formData.isInteractiveMode when activeTab changes
  useEffect(() => {
    localStorage.setItem('activeScraperTab', activeTab);
    setFormData(prev => ({
      ...prev,
      isInteractiveMode: activeTab === 'interactive'
    }));
  }, [activeTab, setFormData]);

  // Ensure isInteractiveMode is correctly set on initial load based on activeTab
  useEffect(() => {
    if (activeTab === 'interactive' && !formData.isInteractiveMode) {
      setFormData(prev => ({ ...prev, isInteractiveMode: true }));
    } else if (activeTab === 'standard' && formData.isInteractiveMode) {
      setFormData(prev => ({ ...prev, isInteractiveMode: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to sync initial state

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-[var(--primary)]">Web Scraper Tool</h1>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} // This will trigger the useEffect above
        className="w-full max-w-4xl mx-auto"
      >
        <TabsList className="grid w-full grid-cols-2 bg-[var(--muted)] p-1 h-auto">
          <TabsTrigger 
            value="standard" 
            className="py-2 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:shadow-md text-lg"
          >
            Dynamic Scraper
          </TabsTrigger>
          <TabsTrigger 
            value="interactive" 
            className="py-2 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:shadow-md text-lg"
          >
            Interactive Scraper
          </TabsTrigger>
        </TabsList>
        {/* Both tabs now render DynamicScraper, which internally decides what to show */}
        <TabsContent value="standard" className="mt-6">
          <DynamicScraper /> 
        </TabsContent>
        <TabsContent value="interactive" className="mt-6">
          <DynamicScraper />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ScraperPage;
