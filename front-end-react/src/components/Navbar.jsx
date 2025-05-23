import React from 'react';
import { Link } from 'react-router-dom';
import { Dock, DockIcon } from '@/components/magicui/dock';
// Lucide icons are used for the Navbar.
import { Home, ScanSearch, FileText, History, Users, Settings } from 'lucide-react';
// cn import is not needed if PixelIcon is removed.

// PixelIcon component definition removed.

const navIcons = {
  Home: Home,
  Scraper: ScanSearch,
  Docs: FileText,
  History: History,
  'About Us': Users,
  Settings: Settings,
};

const navLinks = [
  { to: '/', label: 'Home', icon: 'Home' },
  { to: '/app', label: 'Scraper', icon: 'Scraper' },
  { to: '/docs', label: 'Docs', icon: 'Docs' },
  { to: '/history', label: 'History', icon: 'History' },
  { to: '/about', label: 'About Us', icon: 'About Us' },
  { to: '/settings', label: 'Settings', icon: 'Settings' },
];

export default function Navbar() {
  return (
    <div className="relative w-full flex justify-center mt-4">
      <Dock
        direction="horizontal"
        className="bg-dark-indigo/80 backdrop-blur-md border border-soft-violet rounded-lg p-4"
        iconSize={88} 
        iconMagnification={88}
      >
        {navLinks.map((linkInfo) => {
          const IconComponent = navIcons[linkInfo.icon];
          return (
            <DockIcon
              key={linkInfo.to}
              className="p-0 m-0 flex items-center justify-center 
                         bg-transparent 
                         border border-transparent rounded-lg transition-all"
            >
              <Link to={linkInfo.to} className="w-full h-full flex flex-col items-center justify-center group p-1">
                {/* Using Lucide icons via IconComponent */}
                <IconComponent className="w-14 h-14 text-neon-purple group-hover:text-cyber-lime transition-colors" />
                <span className="text-sm text-slate-gray group-hover:text-cyber-lime mt-1.5 transition-colors">
                  {linkInfo.label}
                </span>
              </Link>
            </DockIcon>
          );
        })}
      </Dock>
    </div>
  );
}
