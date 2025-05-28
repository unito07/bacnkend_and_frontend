import React from 'react';
import StaticScraper from '../components/StaticScraper';
import DynamicScraper from '../components/DynamicScraper';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function ScraperPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center text-[var(--primary)]">Web Scraper Tool</h1>
      <Tabs defaultValue="static" className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 bg-[var(--muted)] p-1 h-auto">
          <TabsTrigger 
            value="static" 
            className="py-2 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:shadow-md text-lg"
          >
            Static Scraper
          </TabsTrigger>
          <TabsTrigger 
            value="dynamic" 
            className="py-2 data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)] data-[state=active]:shadow-md text-lg"
          >
            Dynamic Scraper
          </TabsTrigger>
        </TabsList>
        <TabsContent value="static" className="mt-6">
          <StaticScraper />
        </TabsContent>
        <TabsContent value="dynamic" className="mt-6">
          <DynamicScraper />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ScraperPage;
