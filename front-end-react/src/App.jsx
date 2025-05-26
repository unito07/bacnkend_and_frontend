import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ScraperPage from "./pages/ScraperPage";
import AboutUsPage from "./pages/AboutUsPage";
import DocumentationPage from "./pages/DocumentationPage";
import HistoryLogsPage from "./pages/HistoryLogsPage";
import SettingsPage from "./pages/SettingsPage";
import Navbar from "./components/Navbar"; // Import the Navbar
import { Toaster } from "sonner";

export default function App() {
  return (
    <Router>
      <Navbar /> {/* Add the Navbar component here */}
      <main className="min-h-screen bg-slate-900 text-white pt-16"> {/* Added pt-16 assuming navbar height */}
        {/* The Navbar might affect page layout, consider if main needs padding-top */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<ScraperPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/history" element={<HistoryLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <Toaster richColors position="top-right" /> {/* Add Toaster here */}
    </Router>
  );
}
