import React, { useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Cpu, Code, PlayCircle, Terminal, ArrowRight, ShieldCheck, BarChart, Users } from 'lucide-react'; // Example icons
import { HyperText } from '@/components/magicui/hyper-text'; // Import HyperText as named import
import { EvervaultCard } from "@/components/ui/evervault-card"; // Import EvervaultCard
import { AnimatedBeam } from "@/components/magicui/animated-beam"; // Import AnimatedBeam
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { cn } from "@/lib/utils"; // For classname utility
import terminalIcon from '@/assets/image.png'; // Your main logo
import glovoIcon from '@/assets/glovo.png';
import kilimallIcon from '@/assets/kilimall.png';
import naivasIcon from '@/assets/naivas.png';
import minisoIcon from '@/assets/miniso.png';
import tushopIcon from '@/assets/tushop.png';
import adeegIcon from '@/assets/adeeg.png';
// Assuming you might want a sixth one for symmetry, or you can adjust the layout
// import anotherIcon from '@/assets/another.png'; 

// Placeholder for 8-bit style icons or pixel art (reverted to Lucide version)
const PixelIcon = ({ icon: IconComponent, className }) => (
  <IconComponent className={`w-12 h-12 ${className}`} />
);

// AnimatedTerminalText component is removed as HyperText will be used for the main title.

const Circle = forwardRef(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-neon-purple bg-deep-space-black p-3 shadow-[0_0_20px_-12px_rgba(162,89,255,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});
Circle.displayName = "Circle";

function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  
  // Central icon ref
  const centralNodeRef = useRef(null); // Was node2Ref

  // Left side icons refs
  const leftNode1Ref = useRef(null); // Was node1Ref (Zap)
  const leftNode2Ref = useRef(null);
  const leftNode3Ref = useRef(null);

  // Right side icons refs
  const rightNode1Ref = useRef(null); // Was node3Ref (Code)
  const rightNode2Ref = useRef(null);
  const rightNode3Ref = useRef(null);


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

      {/* Animated Beam Section */}
      <section id="tech-flow" className="w-full py-16 md:py-24 bg-deep-space-black">
        <div className="container mx-auto px-6 flex flex-col items-start"> {/* Changed items-center to items-start */}
          <h2 className="text-4xl font-bold text-electric-blue mb-12 text-left">Example scrapped,</h2> {/* Changed text-center to text-left */}
          {/* New parent flex container */}
          <div className="flex flex-col md:flex-row gap-8 items-start w-full">
            {/* Existing Animated Beam Card */}
            <div
              className="relative flex w-full md:w-1/2 items-center justify-center overflow-hidden rounded-lg border border-soft-violet bg-dark-indigo p-10 md:shadow-xl min-h-[400px]" // Increased min-h for vertical space
              ref={containerRef}
            >
              {/* Main container for icon groups and central icon */}
            <div className="flex h-full w-full flex-row items-center justify-around">
              {/* Left Group of Icons */}
              <div className="flex flex-col items-center justify-around gap-y-8"> {/* Increased gap-y */}
                <Circle ref={leftNode1Ref} className="border-green-500">
                  <img src={glovoIcon} alt="Glovo" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
                <Circle ref={leftNode2Ref} className="border-yellow-500">
                  <img src={kilimallIcon} alt="Kilimall" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
                <Circle ref={leftNode3Ref} className="border-red-500"> {/* Naivas - standard size */}
                  <img src={naivasIcon} alt="Naivas" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
              </div>

              {/* Central Icon */}
              <div className="flex flex-col items-center justify-center">
                <Circle ref={centralNodeRef} className="border-electric-blue !h-24 !w-24">
                  <img src={terminalIcon} alt="Terminal Icon" className="h-16 w-16 rounded-lg" />
                </Circle>
              </div>

              {/* Right Group of Icons */}
              <div className="flex flex-col items-center justify-around gap-y-8">
                <Circle ref={rightNode1Ref} className="border-blue-500"> {/* Miniso - standard size */}
                  <img src={minisoIcon} alt="Miniso" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
                <Circle ref={rightNode2Ref} className="border-purple-500"> {/* Tushop - standard size */}
                  <img src={tushopIcon} alt="Tushop" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
                <Circle ref={rightNode3Ref} className="border-pink-500"> 
                  <img src={adeegIcon} alt="Adeeg" className="h-10 w-10 rounded-lg object-contain" />
                </Circle>
              </div>
            </div>

            {/* Beams from Left to Center */}
            <AnimatedBeam containerRef={containerRef} fromRef={leftNode1Ref} toRef={centralNodeRef} curvature={45} endXOffset={-10} pathColor="gray" />
            <AnimatedBeam containerRef={containerRef} fromRef={leftNode2Ref} toRef={centralNodeRef} curvature={0} pathColor="gray" />
            <AnimatedBeam containerRef={containerRef} fromRef={leftNode3Ref} toRef={centralNodeRef} curvature={-45} endXOffset={-10} pathColor="gray" />

                    {/* Beams from Right to Center (animation reversed) */}
            <AnimatedBeam containerRef={containerRef} fromRef={rightNode1Ref} toRef={centralNodeRef} curvature={45} endXOffset={10} pathColor="gray" reverse />
            <AnimatedBeam containerRef={containerRef} fromRef={rightNode2Ref} toRef={centralNodeRef} curvature={0} pathColor="gray" reverse />
            <AnimatedBeam containerRef={containerRef} fromRef={rightNode3Ref} toRef={centralNodeRef} curvature={-45} endXOffset={10} pathColor="gray" reverse />
            </div>

            {/* New Card for Scraped Data */}
            <div className="w-full md:w-1/2 p-6 md:p-10 border border-neon-purple bg-dark-indigo rounded-lg md:shadow-xl min-h-[400px] flex flex-col">
              <h3 className="text-2xl font-bold text-electric-blue mb-4 text-center">Scraped Data Preview</h3>
              <Tabs defaultValue="json" className="w-full flex-grow flex flex-col">
                <TabsList className="grid w-full grid-cols-2 bg-deep-space-black/50 border-soft-violet">
                  <TabsTrigger value="json" className="data-[state=active]:bg-neon-purple data-[state=active]:text-deep-space-black">JSON</TabsTrigger>
                  <TabsTrigger value="table" className="data-[state=active]:bg-neon-purple data-[state=active]:text-deep-space-black">Table</TabsTrigger>
                </TabsList>
                <TabsContent value="json" className="flex-grow mt-4">
                  <div className="text-left w-full h-full bg-deep-space-black p-4 rounded-md overflow-auto max-h-80 md:max-h-full">
                    <pre className="text-sm text-slate-gray whitespace-pre-wrap">
                      {`[
  {
    "product_name": "Retro Keyboard",
    "price": "75.99",
    "store": "TechGizmo"
  },
  {
    "product_name": "Pixel Art Lamp",
    "price": "49.50",
    "store": "LightUpYourLife"
  },
  {
    "product_name": "8-Bit Coffee Mug",
    "price": "15.00",
    "store": "RetroHome"
  }
]`}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="table" className="flex-grow mt-4">
                  <div className="text-left w-full h-full bg-deep-space-black p-4 rounded-md overflow-auto max-h-80 md:max-h-full">
                    <table className="min-w-full bg-dark-indigo text-slate-300 rounded-md shadow-lg">
                      <thead className="bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-electric-blue uppercase tracking-wider">Product Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-electric-blue uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-electric-blue uppercase tracking-wider">Store</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">Retro Keyboard</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">75.99</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">TechGizmo</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">Pixel Art Lamp</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">49.50</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">LightUpYourLife</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">8-Bit Coffee Mug</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">15.00</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">RetroHome</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
              <p className="text-xs text-cyber-lime opacity-70 mt-4 animate-pulse text-center">data.stream_active</p>
            </div>
          </div>
          <p className="text-md text-slate-gray mt-8 max-w-lg text-left">
            Connecting your favorite stores to our powerful scraping engine, and visualizing the results.
          </p>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="cta" className="w-full py-16 md:py-24 bg-dark-indigo border-t border-soft-violet">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-neon-purple mb-6">
            Ready to Start?
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
