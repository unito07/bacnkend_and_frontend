import React from 'react';
// Button might not be needed if HeroGeometric handles the CTA, or we add it separately.
// import { Button } from '@/components/ui/button'; 
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { BentoGrid, BentoCard } from '@/components/magicui/bento-grid'; // Import BentoGrid and BentoCard
import {
  Layers,
  Zap,
  MousePointerClick,
  Link as LinkIcon, // Alias Link to avoid conflict with react-router-dom Link
  Target,
  Download,
} from 'lucide-react'; // Import icons

// Helper component for numbered icons if needed, or use actual icons
const NumberIcon = ({ number }) => (
  <div className="flex items-center justify-center h-12 w-12 text-2xl font-bold text-brand-primary">
    {number}
  </div>
);

const features = [
  {
    Icon: () => <Layers className="text-accent" />,
    name: "Static Scraping",
    description: "Extract data from simple HTML pages with ease and speed.",
    href: "#",
    cta: "Learn More",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: () => <Zap className="text-accent" />,
    name: "Dynamic Scraping",
    description: "Handle JavaScript-rendered content effortlessly for complex sites.",
    href: "#",
    cta: "Learn More",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: () => <MousePointerClick className="text-accent" />,
    name: "Easy to Use",
    description: "Intuitive interface for quick data extraction and JSON export.",
    href: "#",
    cta: "Learn More",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
];

const howItWorksSteps = [
  {
    Icon: () => <LinkIcon className="text-accent" />, // Using LinkIcon from lucide-react
    name: "Enter URL",
    description: "Provide the target website's URL to begin the scraping process.",
    href: "#",
    cta: "Details",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: () => <Target className="text-accent" />,
    name: "Define Selectors",
    description: "Specify CSS selectors for the precise data elements you need.",
    href: "#",
    cta: "Details",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
  {
    Icon: () => <Download className="text-accent" />,
    name: "Get Results",
    description: "Download your extracted data conveniently in JSON format.",
    href: "#",
    cta: "Details",
    background: <div className="absolute inset-0 bg-surface backdrop-blur-sm rounded-xl border border-border-main shadow-md" />,
    className: "col-span-3 md:col-span-1",
  },
];

function LandingPage() {
  return (
    // The HeroGeometric component has its own background (bg-[#030303]), 
    // so the parent div's background might be overridden or need adjustment.
    // For now, let's keep the original page background and see how it blends.
    // Removed px-4 to allow HeroGeometric to be full-width
    <div className="flex flex-col items-center justify-start min-h-screen bg-background-main text-text-main">
      <HeroGeometric 
        title1="Supercharge Your Data Extraction"
        title2="Powerful & Intuitive Scraping"
        // The badge and paragraph within HeroGeometric are hardcoded.
        // The "Get Started" button is also not part of HeroGeometric's props.
        // We might need to customize HeroGeometric or add elements around it if specific CTA is needed.
      />

      {/* Adjusting margin-top for the section below the new hero */}
      <section className="w-full max-w-5xl p-8 mt-10 md:mt-16"> {/* Added some margin top */}
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12 text-text-main">Features Summary</h2>
        <BentoGrid className="grid-cols-1 md:grid-cols-3">
          {features.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
        </BentoGrid>
      </section>

      <section className="w-full max-w-5xl p-8 mt-16 md:mt-20 mb-12">
        <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12 text-text-main">How It Works</h2>
        <BentoGrid className="grid-cols-1 md:grid-cols-3">
          {howItWorksSteps.map((step, idx) => (
            <BentoCard key={idx} {...step} name={`${idx + 1}. ${step.name}`} />
          ))}
        </BentoGrid>
      </section>
    </div>
  );
}

export default LandingPage;
