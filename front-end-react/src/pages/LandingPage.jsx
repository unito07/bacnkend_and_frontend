import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Cpu, Code, PlayCircle, Terminal, ArrowRight, ShieldCheck, BarChart, Users } from 'lucide-react'; // Example icons
import { HyperText } from '@/components/magicui/hyper-text'; // Import HyperText as named import
import { EvervaultCard } from "@/components/ui/evervault-card"; // Import EvervaultCard

// Placeholder for 8-bit style icons or pixel art (reverted to Lucide version)
const PixelIcon = ({ icon: IconComponent, className }) => (
  <IconComponent className={`w-12 h-12 ${className}`} />
);

// AnimatedTerminalText component is removed as HyperText will be used for the main title.

function LandingPage() {
  const navigate = useNavigate();

  const handleGetStartedClick = () => {
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-deep-space-black text-light-gray font-mono flex flex-col items-center overflow-x-hidden">
      {/* Optional: Add global grid overlay or background pattern here */}
      {/* <div className="absolute inset-0 opacity-5 [background-image:linear-gradient(to_right,#6E40C9_1px,transparent_1px),linear-gradient(to_bottom,#6E40C9_1px,transparent_1px)] [background-size:2rem_2rem]"></div> */}

      {/* Hero Section */}
      <section className="w-full h-screen flex flex-col items-center justify-center text-center p-8 relative">
        {/* Evervault Card replacing floating effects */}
        <div className="absolute inset-0 z-0"> {/* Removed flex and centering, card will fill this */}
          <EvervaultCard className="w-full h-full" /> {/* Changed to full width/height */}
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 flex items-center justify-center relative z-10">
          <HyperText
            as="span" // Render as span to fit within h1
            className="text-neon-purple" // Apply styling
            duration={1200} // Optional: adjust duration
            // The text to animate is passed as children
          >
            W3b_5cr4pp3r
          </HyperText>
        </h1>
        <p className="text-xl md:text-2xl text-slate-gray mb-8 max-w-2xl">
          Retro-futuristic toolkit for web data extraction. Elevate your scraping with intelligent precision.
        </p>
        {/* Glitch animation placeholder on button */}
        <button
          onClick={handleGetStartedClick}
          className="bg-neon-purple text-deep-space-black hover:bg-hot-pink-glow hover:text-light-gray font-bold py-3 px-8 rounded-none text-lg transition-all duration-300 transform hover:skew-x-[-5deg] active:scale-95 shadow-[0_0_15px_rgba(162,89,255,0.8)] hover:shadow-[0_0_25px_rgba(255,46,136,0.9)]"
        >
          {'GET_STARTED >'}
        </button>
        {/* Subtle glitch text effect placeholder */}
        <p className="mt-4 text-xs text-cyber-lime opacity-70 animate-pulse">system.online</p>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-16 md:py-24 bg-dark-indigo border-t border-b border-soft-violet">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-electric-blue mb-4">FEATURES_LOADED</h2>
          <p className="text-lg text-slate-gray mb-12 max-w-xl mx-auto">
            Unlock unparalleled capabilities with our suite of developer-centric tools.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Blazing Fast APIs", description: "Experience near-zero latency with our optimized infrastructure." },
              { icon: Cpu, title: "Intelligent Processing", description: "Leverage AI-powered algorithms for smarter data handling." },
              { icon: Code, title: "Seamless Integration", description: "Easy-to-use SDKs and plugins for all major frameworks." },
            ].map((feature, index) => (
              <div key={index} className="bg-deep-space-black p-6 border border-soft-violet hover:border-neon-purple transition-all duration-300 transform hover:scale-105">
                {/* Pixel art icon placeholder */}
                <div className="flex justify-center mb-4">
                  <PixelIcon icon={feature.icon} className="text-cyber-lime" />
                </div>
                <h3 className="text-2xl font-semibold text-neon-purple mb-3">{feature.title}</h3>
                <p className="text-slate-gray">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-16 md:py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-electric-blue mb-12">INITIATE_SEQUENCE</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines placeholder - could be SVG or ::before/::after elements */}
            {[
              { icon: PlayCircle, step: "01", title: "Connect & Configure", description: "Link your project and set up your parameters in minutes." },
              { icon: Terminal, step: "02", title: "Execute & Monitor", description: "Run tasks and watch real-time progress via our terminal UI." },
              { icon: ArrowRight, step: "03", title: "Analyze & Deploy", description: "Get actionable insights and deploy with confidence." },
            ].map((item, index) => (
              <div key={index} className="bg-dark-indigo p-6 border border-soft-violet relative z-10">
                <div className="flex items-center justify-center mb-4">
                  <span className="text-5xl font-black text-neon-purple opacity-50 mr-4">{item.step}</span>
                  <PixelIcon icon={item.icon} className="text-cyber-lime" />
                </div>
                <h3 className="text-2xl font-semibold text-neon-purple mb-3">{item.title}</h3>
                <p className="text-slate-gray">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="cta" className="w-full py-16 md:py-24 bg-dark-indigo border-t border-soft-violet">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-neon-purple mb-6">
            JOIN_THE_REVOLUTION
          </h2>
          <p className="text-xl text-slate-gray mb-10 max-w-xl mx-auto">
            Ready to transform your development process? Start building the future, today.
          </p>
          <button className="bg-cyber-lime text-deep-space-black hover:bg-neon-purple hover:text-light-gray font-bold py-4 px-10 rounded-none text-xl transition-all duration-300 transform hover:skew-x-[-5deg] active:scale-95 shadow-[0_0_15px_rgba(184,255,0,0.8)] hover:shadow-[0_0_25px_rgba(162,89,255,0.9)]">
            ACCESS_PROTOCOLS_NOW
          </button>
          <p className="mt-6 text-sm text-slate-gray">
            Free tier available. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer - Basic Placeholder */}
      <footer className="w-full py-8 text-center border-t border-soft-violet">
        <p className="text-slate-gray">&copy; {new Date().getFullYear()} W3b_5cr4pp3r. All rights reserved.</p>
        <p className="text-xs text-neon-purple opacity-50 mt-1">SYSTEM_STATUS: OPERATIONAL</p>
      </footer>
    </div>
  );
}

export default LandingPage;
