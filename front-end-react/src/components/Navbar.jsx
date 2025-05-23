import React from 'react';
import { Link } from 'react-router-dom';
import { ShinyButton } from '@/components/magicui/shiny-button'; // Adjusted path

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/app', label: 'Scraper' },
  { to: '/docs', label: 'Docs' },
  { to: '/history', label: 'History' },
  { to: '/about', label: 'About Us' },
  { to: '/settings', label: 'Settings' },
];

export default function Navbar() {
  return (
    <nav className="bg-slate-800 p-4 shadow-md">
      <div className="container mx-auto flex justify-center items-center space-x-2 md:space-x-4 overflow-x-auto">
        {navLinks.map((linkInfo) => (
          <Link to={linkInfo.to} key={linkInfo.to}>
            <ShinyButton className="text-sm px-3 py-1.5 md:px-4 md:py-2 whitespace-nowrap">
              {linkInfo.label}
            </ShinyButton>
          </Link>
        ))}
      </div>
    </nav>
  );
}
